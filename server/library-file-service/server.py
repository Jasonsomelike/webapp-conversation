import base64
import hashlib
import hmac
import json
import logging
import os
import time
import uuid
from pathlib import Path

import psycopg2
from flask import Flask, Response, request, send_file

app = Flask(__name__)
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("library-file-service")

STORAGE_ROOT = Path(os.getenv("DIFY_STORAGE_ROOT", "/data/storage")).resolve()
INTERNAL_TOKEN = os.getenv("LIBRARY_FILE_SERVICE_TOKEN", "")
DATASET_ID = os.getenv("DIFY_DATASET_ID", "")


def error_response(message: str, status: int, request_id: str) -> Response:
    return Response(
        f"{message}. requestId={request_id}\n",
        status=status,
        content_type="text/plain; charset=utf-8",
        headers={"X-Request-Id": request_id},
    )


def signed_request_is_valid(
    document_id: uuid.UUID,
    disposition: str,
    filename: str,
    request_id: str,
) -> bool:
    expires = request.args.get("expires", "")
    signature = request.args.get("signature", "")
    try:
        expires_at = int(expires)
    except ValueError:
        return False
    now = int(time.time())
    if expires_at < now or expires_at > now + 600:
        return False

    canonical = f"{document_id}\n{disposition}\n{filename}\n{request_id}\n{expires}"
    digest = hmac.new(
        INTERNAL_TOKEN.encode(),
        canonical.encode(),
        hashlib.sha256,
    ).digest()
    expected = base64.urlsafe_b64encode(digest).decode().rstrip("=")
    return bool(signature and hmac.compare_digest(signature, expected))


def authorize(
    document_id: uuid.UUID,
    disposition: str,
    filename: str,
    request_id: str,
) -> bool:
    provided = request.headers.get("X-Internal-Token", "")
    header_authorized = bool(
        INTERNAL_TOKEN
        and provided
        and hmac.compare_digest(provided.encode(), INTERNAL_TOKEN.encode())
    )
    return header_authorized or signed_request_is_valid(
        document_id,
        disposition,
        filename,
        request_id,
    )


def database_connection():
    return psycopg2.connect(
        host=os.environ["DB_HOST"],
        port=int(os.getenv("DB_PORT", "5432")),
        dbname=os.environ["DB_DATABASE"],
        user=os.environ["DB_USERNAME"],
        password=os.environ["DB_PASSWORD"],
        connect_timeout=8,
        application_name="dify-library-file-service",
    )


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/library/documents/<uuid:document_id>/file")
def document_file(document_id: uuid.UUID):
    request_id = (
        request.headers.get("X-Request-Id")
        or request.args.get("requestId")
        or str(uuid.uuid4())
    )
    disposition = (
        "attachment"
        if request.args.get("disposition") == "attachment"
        else "inline"
    )
    fallback_filename = request.args.get("filename") or f"{document_id}.bin"
    if not authorize(document_id, disposition, fallback_filename, request_id):
        return error_response("Unauthorized", 401, request_id)

    step = "query-document"

    try:
        with database_connection() as connection:
            connection.set_session(readonly=True, autocommit=False)
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id, tenant_id, dataset_id, name, data_source_type, data_source_info
                    FROM documents
                    WHERE id = %s
                      AND (%s = '' OR dataset_id::text = %s)
                    LIMIT 1
                    """,
                    (str(document_id), DATASET_ID, DATASET_ID),
                )
                document = cursor.fetchone()
                if not document:
                    return error_response("Document not found", 404, request_id)

                _, tenant_id, _, document_name, source_type, raw_source_info = document
                source_info = (
                    json.loads(raw_source_info or "{}")
                    if isinstance(raw_source_info, str)
                    else (raw_source_info or {})
                )
                upload_file_id = (
                    source_info.get("upload_file_id")
                    or source_info.get("real_file_id")
                    or source_info.get("related_id")
                    or (source_info.get("upload_file") or {}).get("id")
                    or (source_info.get("file") or {}).get("id")
                )
                if not upload_file_id:
                    return error_response(
                        f"File mapping not found for document ({source_type})",
                        404,
                        request_id,
                    )

                step = "query-upload-file"
                cursor.execute(
                    """
                    SELECT id, tenant_id, storage_type, key, name, size, extension, mime_type
                    FROM upload_files
                    WHERE id = %s AND tenant_id = %s
                    LIMIT 1
                    """,
                    (str(upload_file_id), str(tenant_id)),
                )
                upload_file = cursor.fetchone()
                if not upload_file:
                    return error_response("Upload file not found", 404, request_id)

        _, _, _, storage_key, stored_name, expected_size, _, mime_type = upload_file
        step = "resolve-path"
        file_path = (STORAGE_ROOT / storage_key).resolve()
        try:
            file_path.relative_to(STORAGE_ROOT)
        except ValueError:
            return error_response("Invalid file path", 403, request_id)

        if not file_path.is_file():
            return error_response("File missing on disk", 404, request_id)

        actual_size = file_path.stat().st_size
        if expected_size and actual_size != expected_size:
            logger.warning(
                "[library-file-service] size mismatch requestId=%s documentId=%s expected=%s actual=%s",
                request_id,
                document_id,
                expected_size,
                actual_size,
            )

        filename = stored_name or document_name or fallback_filename
        step = "stream-file"
        response = send_file(
            file_path,
            mimetype=mime_type or "application/octet-stream",
            as_attachment=disposition == "attachment",
            download_name=filename,
            conditional=True,
            etag=True,
            max_age=0,
        )
        response.headers["Cache-Control"] = "private, no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Request-Id"] = request_id
        response.headers["X-Library-File-Source"] = "dify-local-storage"
        return response
    except json.JSONDecodeError as error:
        logger.exception(
            "[library-file-service] failed requestId=%s documentId=%s step=parse-source-info",
            request_id,
            document_id,
        )
        return error_response(f"Invalid document file mapping: {error}", 500, request_id)
    except Exception as error:
        logger.exception(
            "[library-file-service] failed requestId=%s documentId=%s step=%s",
            request_id,
            document_id,
            step,
        )
        return error_response(
            f"Database query failed or file service failed: {type(error).__name__}",
            500,
            request_id,
        )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3011)
