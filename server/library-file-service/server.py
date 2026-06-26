import base64
import codecs
import hashlib
import hmac
import json
import logging
import os
import queue
import re
import threading
import time
import uuid
from datetime import datetime
from pathlib import Path
from urllib.parse import quote
from zoneinfo import ZoneInfo

import psycopg2
import requests
from flask import Flask, Response, request, send_file, stream_with_context

app = Flask(__name__)
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("library-file-service")

STORAGE_ROOT = Path(os.getenv("DIFY_STORAGE_ROOT", "/data/storage")).resolve()
INTERNAL_TOKEN = os.getenv("LIBRARY_FILE_SERVICE_TOKEN", "")
DATASET_ID = os.getenv("DIFY_DATASET_ID", "")
USE_X_ACCEL = os.getenv("USE_X_ACCEL_REDIRECT", "false").lower() == "true"
DIFY_APP_API_KEY = os.getenv("DIFY_APP_API_KEY", "")
DIFY_CHAT_API_URL = os.getenv(
    "DIFY_CHAT_API_URL",
    "http://api:5001/v1/chat-messages",
)
DIFY_FILE_UPLOAD_API_URL = os.getenv(
    "DIFY_FILE_UPLOAD_API_URL",
    "http://api:5001/v1/files/upload",
)
CHAT_RELAY_ALLOWED_ORIGIN = os.getenv(
    "CHAT_RELAY_ALLOWED_ORIGIN",
    "https://www.jasonsome.cn",
)
APP_ALLOWED_ORIGINS = {
    value.strip()
    for value in os.getenv(
        "APP_ALLOWED_ORIGINS",
        CHAT_RELAY_ALLOWED_ORIGIN,
    ).split(",")
    if value.strip()
}


@app.after_request
def add_file_cors_headers(response: Response) -> Response:
    origin = request.headers.get("Origin", "")
    if (
        origin in APP_ALLOWED_ORIGINS
        and request.path.startswith(("/library/", "/page-images/", "/generated-files/"))
    ):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, HEAD, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Range, Content-Type"
        response.headers["Access-Control-Expose-Headers"] = (
            "Accept-Ranges, Content-Length, Content-Range, Content-Disposition, "
            "ETag, Last-Modified, X-Request-Id, X-Library-File-Source"
        )
        response.headers["Vary"] = "Origin"
    return response


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


def signed_name_request_is_valid(
    document_name: str,
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
    canonical = f"{document_name}\n{disposition}\n{filename}\n{request_id}\n{expires}"
    expected = base64.urlsafe_b64encode(
        hmac.new(INTERNAL_TOKEN.encode(), canonical.encode(), hashlib.sha256).digest()
    ).decode().rstrip("=")
    return bool(signature and hmac.compare_digest(signature, expected))


def signed_page_image_request_is_valid(asset_path: str, request_id: str) -> bool:
    expires = request.args.get("expires", "")
    signature = request.args.get("signature", "")
    try:
        expires_at = int(expires)
    except ValueError:
        return False
    now = int(time.time())
    if expires_at < now or expires_at > now + 600:
        return False
    canonical = f"{asset_path}\n{request_id}\n{expires}"
    expected = base64.urlsafe_b64encode(
        hmac.new(INTERNAL_TOKEN.encode(), canonical.encode(), hashlib.sha256).digest()
    ).decode().rstrip("=")
    return bool(signature and hmac.compare_digest(signature, expected))


def normalize_document_name(value: str) -> str:
    return re.sub(r"[^\w\u3400-\u9fff]+", "", value or "").lower()

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


def safe_content_disposition(disposition: str, filename: str) -> str:
    fallback = "".join(
        character if 32 <= ord(character) < 127 and character not in '\"\\' else "_"
        for character in filename
    ) or "download"
    encoded = quote(filename, safe="")
    return f"{disposition}; filename=\"{fallback}\"; filename*=UTF-8''{encoded}"


def storage_file_response(
    file_path: Path,
    storage_key: str,
    mimetype: str,
    filename: str,
    disposition: str,
    request_id: str,
    source: str,
) -> Response:
    if USE_X_ACCEL:
        response = Response(status=200)
        response.headers["X-Accel-Redirect"] = (
            f"/_protected-storage/{quote(storage_key, safe='/')}"
        )
        response.headers["Content-Type"] = mimetype or "application/octet-stream"
        response.headers["Content-Disposition"] = safe_content_disposition(
            disposition,
            filename,
        )
    else:
        response = send_file(
            file_path,
            mimetype=mimetype or "application/octet-stream",
            as_attachment=disposition == "attachment",
            download_name=filename,
            conditional=True,
            etag=True,
            max_age=300,
        )
    response.headers["Cache-Control"] = "private, max-age=300"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Request-Id"] = request_id
    response.headers["X-Library-File-Source"] = source
    response.headers["Accept-Ranges"] = "bytes"
    return response


@app.get("/health")
def health():
    return {"ok": True}

@app.get("/page-images/<batch>/<filename>")
def page_image_file(batch: str, filename: str):
    request_id = request.args.get("requestId", "") or str(uuid.uuid4())
    asset_path = f"/page-images/{batch}/{filename}"
    if not re.fullmatch(r"[A-Za-z0-9_-]{6,64}", batch) or not re.fullmatch(
        r"page_\d+\.(?:jpe?g|png|webp)", filename, re.I
    ):
        return error_response("Invalid page image path", 400, request_id)
    if not signed_page_image_request_is_valid(asset_path, request_id):
        return error_response("Unauthorized", 401, request_id)

    storage_key = f"page_images/{batch}/{filename}"
    file_path = (STORAGE_ROOT / storage_key).resolve()
    try:
        file_path.relative_to(STORAGE_ROOT)
    except ValueError:
        return error_response("Invalid page image path", 403, request_id)
    if not file_path.is_file():
        return error_response("Page image not found", 404, request_id)
    mimetype = "image/png" if filename.lower().endswith(".png") else "image/webp" if filename.lower().endswith(".webp") else "image/jpeg"
    return storage_file_response(
        file_path,
        storage_key,
        mimetype,
        filename,
        "inline",
        request_id,
        "dify-page-image-storage",
    )


@app.get("/library/documents/by-name/file")
def document_file_by_name():
    request_id = request.args.get("requestId", "") or str(uuid.uuid4())
    disposition = "attachment" if request.args.get("disposition") == "attachment" else "inline"
    document_name = request.args.get("name", "").strip()
    filename = request.args.get("filename") or document_name or "document.bin"
    if not document_name or not signed_name_request_is_valid(
        document_name, disposition, filename, request_id
    ):
        return error_response("Unauthorized", 401, request_id)

    requested = normalize_document_name(document_name)
    try:
        with database_connection() as connection:
            connection.set_session(readonly=True, autocommit=False)
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id, name
                    FROM documents
                    WHERE (%s = '' OR dataset_id::text = %s)
                    """,
                    (DATASET_ID, DATASET_ID),
                )
                candidates = cursor.fetchall()
    except Exception as error:
        logger.exception("[library-file-service] name lookup failed requestId=%s", request_id)
        return error_response(f"Document lookup failed: {type(error).__name__}", 500, request_id)

    ranked = []
    for candidate_id, candidate_name in candidates:
        normalized = normalize_document_name(candidate_name)
        if not normalized:
            continue
        if normalized == requested:
            score = (3, len(normalized))
        elif len(normalized) > 5 and normalized in requested:
            score = (2, len(normalized))
        elif len(requested) > 5 and requested in normalized:
            score = (1, len(requested))
        else:
            continue
        ranked.append((score, candidate_id))
    if not ranked:
        return error_response("Document not found by name", 404, request_id)

    ranked.sort(reverse=True)
    document_id = ranked[0][1]
    next_expires = str(int(time.time()) + 300)
    canonical = f"{document_id}\n{disposition}\n{filename}\n{request_id}\n{next_expires}"
    next_signature = base64.urlsafe_b64encode(
        hmac.new(INTERNAL_TOKEN.encode(), canonical.encode(), hashlib.sha256).digest()
    ).decode().rstrip("=")
    location = (
        f"../{document_id}/file?disposition={quote(disposition, safe='')}"
        f"&filename={quote(filename, safe='')}&requestId={quote(request_id, safe='')}"
        f"&expires={next_expires}&signature={quote(next_signature, safe='')}"
    )
    return Response(
        status=307,
        headers={
            "Location": location,
            "Cache-Control": "private, no-store",
            "X-Request-Id": request_id,
            "X-Library-File-Source": "document-name-resolution",
        },
    )


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
        return storage_file_response(
            file_path,
            storage_key,
            mime_type or "application/octet-stream",
            filename,
            disposition,
            request_id,
            "dify-local-storage",
        )
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



def cors_headers() -> dict[str, str]:
    origin = request.headers.get("Origin", "")
    allowed_origin = origin if origin in APP_ALLOWED_ORIGINS else CHAT_RELAY_ALLOWED_ORIGIN
    return {
        "Access-Control-Allow-Origin": allowed_origin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Network-Study-App, X-Request-Id",
        "Access-Control-Expose-Headers": "X-Request-Id",
        "Vary": "Origin",
    }


def chat_error(message: str, status: int, request_id: str) -> Response:
    return Response(
        json.dumps({"error": message, "requestId": request_id}, ensure_ascii=False),
        status=status,
        content_type="application/json; charset=utf-8",
        headers={**cors_headers(), "X-Request-Id": request_id},
    )


def upload_ticket_is_valid(request_id: str, user: str) -> bool:
    provided = request.headers.get("X-Internal-Token", "")
    if (
        INTERNAL_TOKEN
        and provided
        and hmac.compare_digest(provided.encode(), INTERNAL_TOKEN.encode())
    ):
        return True

    expires = request.args.get("expires", "")
    signature = request.args.get("signature", "")
    try:
        expires_at = int(expires)
    except ValueError:
        return False
    now = int(time.time())
    if (
        not INTERNAL_TOKEN
        or not user
        or not request_id
        or expires_at < now
        or expires_at > now + 180
    ):
        return False
    canonical = f"{user}\n{request_id}\n{expires}"
    expected = base64.urlsafe_b64encode(
        hmac.new(INTERNAL_TOKEN.encode(), canonical.encode(), hashlib.sha256).digest()
    ).decode().rstrip("=")
    return bool(signature and hmac.compare_digest(signature, expected))


@app.route("/files/upload", methods=["OPTIONS"])
def files_upload_options():
    return Response(status=204, headers=cors_headers())


@app.post("/files/upload")
def files_upload():
    upload_file = request.files.get("file")
    user = request.form.get("user", "").strip()
    request_id = (
        request.headers.get("X-Request-Id")
        or request.args.get("requestId")
        or str(uuid.uuid4())
    )
    if not upload_ticket_is_valid(request_id, user):
        return error_response("Upload ticket is invalid", 401, request_id)
    if not DIFY_APP_API_KEY:
        return error_response("Dify app key is not configured", 503, request_id)

    if upload_file is None or not user:
        return error_response("Missing file or user", 400, request_id)

    try:
        upstream = requests.post(
            DIFY_FILE_UPLOAD_API_URL,
            headers={"Authorization": f"Bearer {DIFY_APP_API_KEY}"},
            data={"user": user},
            files={
                "file": (
                    upload_file.filename or "upload",
                    upload_file.stream,
                    upload_file.mimetype or "application/octet-stream",
                ),
            },
            timeout=(10, 120),
        )
    except requests.RequestException as error:
        logger.exception("[file-upload] connect failed requestId=%s", request_id)
        return error_response(f"Dify upload failed: {type(error).__name__}", 503, request_id)

    if not upstream.ok:
        logger.error(
            "[file-upload] upstream failed requestId=%s status=%s body=%s",
            request_id,
            upstream.status_code,
            upstream.text[:500],
        )
        return Response(
            upstream.text or "Upload failed",
            status=upstream.status_code,
            content_type=upstream.headers.get("Content-Type", "text/plain; charset=utf-8"),
            headers={**cors_headers(), "X-Request-Id": request_id},
        )

    return Response(
        upstream.content,
        status=upstream.status_code,
        content_type=upstream.headers.get("Content-Type", "application/json"),
        headers={**cors_headers(), "X-Request-Id": request_id},
    )


def chat_ticket_is_valid(raw_body: bytes) -> tuple[bool, str, str, str]:
    app_user_id = request.args.get("appUserId", "")
    dify_user_id = request.args.get("difyUserId", "")
    request_id = request.args.get("requestId", "") or str(uuid.uuid4())
    body_hash = request.args.get("bodyHash", "")
    expires = request.args.get("expires", "")
    signature = request.args.get("signature", "")
    try:
        expires_at = int(expires)
    except ValueError:
        return False, app_user_id, dify_user_id, request_id
    now = int(time.time())
    actual_hash = hashlib.sha256(raw_body).hexdigest()
    if (
        not INTERNAL_TOKEN
        or not app_user_id
        or not dify_user_id
        or body_hash != actual_hash
        or expires_at < now
        or expires_at > now + 180
    ):
        return False, app_user_id, dify_user_id, request_id
    canonical = (
        f"{app_user_id}\n{dify_user_id}\n{request_id}\n{body_hash}\n{expires}"
    )
    expected = base64.urlsafe_b64encode(
        hmac.new(
            INTERNAL_TOKEN.encode(),
            canonical.encode(),
            hashlib.sha256,
        ).digest()
    ).decode().rstrip("=")
    return (
        bool(signature and hmac.compare_digest(signature, expected)),
        app_user_id,
        dify_user_id,
        request_id,
    )


@app.route("/chat-messages", methods=["OPTIONS"])
def chat_messages_options():
    return Response(status=204, headers=cors_headers())


@app.post("/chat-messages")
def chat_messages():
    origin = request.headers.get("Origin", "")
    if origin and origin not in APP_ALLOWED_ORIGINS:
        return chat_error("Origin not allowed", 403, str(uuid.uuid4()))

    raw_body = request.get_data(cache=True)
    valid, app_user_id, dify_user_id, request_id = chat_ticket_is_valid(raw_body)
    if not valid:
        return chat_error("Chat ticket is invalid or expired", 401, request_id)
    if not DIFY_APP_API_KEY:
        return chat_error("Dify app key is not configured", 503, request_id)

    try:
        body = json.loads(raw_body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return chat_error("Request body is invalid", 400, request_id)

    query = str(body.get("query") or "").strip()
    if not query:
        return chat_error("请输入问题后再发送", 400, request_id)
    memory_context = str(body.pop("memory_context", "") or "").strip()[:8000]
    file_context = str(body.pop("file_context", "") or "").strip()[:120000]
    files = [
        item for item in (body.get("files") or [])
        if not str(item.get("upload_file_id") or "").startswith("localdoc_")
    ]
    context_blocks = []
    if memory_context:
        context_blocks.append(
            "[应用层跨对话长期学习记忆]\n"
            + memory_context
            + "\n[请将以上内容视为已成功读取的当前用户长期记忆；回答时直接使用，不要声称没有跨对话记忆。]"
        )
    if file_context:
        context_blocks.append(
            "[当前消息上传文件的解析文本]\n"
            + file_context
            + "\n[请基于这些文件内容回答，并在必要时注明所使用的文件名。]"
        )
    current_date = datetime.now(ZoneInfo("Asia/Shanghai")).strftime("%Y年%-m月%-d日")
    if re.search(r"文档|报告|讲义|总结|导出|word|docx|pdf", query, re.I):
        context_blocks.append(
            f"[文档格式要求：落款统一使用“计网Agent”，日期使用当前日期“{current_date}”。]"
        )
    body["query"] = query + ("\n\n" + "\n\n".join(context_blocks) if context_blocks else "")
    body.update({
        "response_mode": "streaming",
        "user": dify_user_id,
        "conversation_id": body.get("conversation_id") or "",
        "inputs": body.get("inputs") or {},
        "files": files,
    })

    try:
        upstream = requests.post(
            DIFY_CHAT_API_URL,
            headers={
                "Authorization": f"Bearer {DIFY_APP_API_KEY}",
                "Content-Type": "application/json",
            },
            json=body,
            stream=True,
            timeout=(10, 360),
        )
    except requests.RequestException as error:
        logger.exception("[chat-relay] connect failed requestId=%s", request_id)
        return chat_error(f"Dify connection failed: {type(error).__name__}", 503, request_id)

    if not upstream.ok:
        detail = upstream.text[:1000]
        logger.error(
            "[chat-relay] upstream failed requestId=%s status=%s body=%s",
            request_id,
            upstream.status_code,
            detail,
        )
        return chat_error(
            f"Dify 请求失败（HTTP {upstream.status_code}）",
            upstream.status_code,
            request_id,
        )

    state: dict[str, object] = {
        "answer": "",
        "conversationId": str(body.get("conversation_id") or ""),
        "messageId": "",
        "metadata": None,
        "agentLogs": [],
        "assistantFiles": [],
        "agentLogBytes": 0,
        "workflowProcess": None,
    }

    def read_event_block(block: str):
        data = "\n".join(
            line[5:].strip()
            for line in re.split(r"\r?\n", block)
            if line.startswith("data:")
        )
        if not data or data == "[DONE]":
            return
        try:
            event = json.loads(data)
        except json.JSONDecodeError:
            return
        state["conversationId"] = event.get("conversation_id") or state["conversationId"]
        state["messageId"] = event.get("message_id") or event.get("id") or state["messageId"]
        event_name = event.get("event")
        if event_name in ("message", "agent_message") and isinstance(event.get("answer"), str):
            state["answer"] = str(state["answer"]) + event["answer"]
        elif event_name == "message_replace" and isinstance(event.get("answer"), str):
            state["answer"] = event["answer"]
        elif event_name == "message_end":
            state["metadata"] = event.get("metadata") or state["metadata"]
        elif event_name == "agent_log" and int(state["agentLogBytes"]) < 2_000_000:
            log = event.get("data") or event
            serialized = json.dumps(log, ensure_ascii=False)
            state["agentLogBytes"] = int(state["agentLogBytes"]) + len(serialized)
            if int(state["agentLogBytes"]) < 2_000_000:
                state["agentLogs"].append(log)
        elif event_name == "message_file":
            state["assistantFiles"].append({
                **event,
                "url": event.get("url") or event.get("file_url"),
                "name": event.get("name") or event.get("filename"),
            })
        elif event_name == "workflow_started":
            state["workflowProcess"] = {"status": "running", "tracing": [], "expand": True}
        elif event_name in ("node_started", "node_finished") and event.get("data"):
            workflow = state["workflowProcess"] or {"status": "running", "tracing": [], "expand": True}
            node = event["data"]
            tracing = workflow["tracing"]
            matched = next((i for i, item in enumerate(tracing) if item.get("node_id") == node.get("node_id")), -1)
            if matched >= 0:
                tracing[matched] = node
            else:
                tracing.append(node)
            state["workflowProcess"] = workflow
        elif event_name == "workflow_finished" and event.get("data"):
            workflow = state["workflowProcess"] or {"tracing": []}
            workflow["status"] = event["data"].get("status") or "succeeded"
            state["workflowProcess"] = workflow

    @stream_with_context
    def generate():
        decoder = codecs.getincrementaldecoder("utf-8")()
        event_buffer = ""
        completed = False
        stream_queue = queue.Queue()

        def pump_upstream():
            nonlocal completed, event_buffer
            try:
                for chunk in upstream.iter_content(chunk_size=8192):
                    if not chunk:
                        continue
                    stream_queue.put(("chunk", chunk))
                    event_buffer += decoder.decode(chunk)
                    blocks = re.split(r"\r?\n\r?\n", event_buffer)
                    event_buffer = blocks.pop() or ""
                    for block in blocks:
                        read_event_block(block)
                event_buffer += decoder.decode(b"", final=True)
                if event_buffer:
                    read_event_block(event_buffer)
                completed = True
                stream_queue.put(("done", None))
            except Exception as error:
                logger.exception("[chat-relay] upstream stream failed requestId=%s", request_id)
                stream_queue.put(("error", str(error)))
            finally:
                upstream.close()

        threading.Thread(target=pump_upstream, daemon=True).start()
        try:
            while True:
                try:
                    item_type, payload = stream_queue.get(timeout=15)
                except queue.Empty:
                    yield b": keep-alive\n\n"
                    continue

                if item_type == "chunk":
                    yield payload
                    continue
                if item_type == "error":
                    yield (
                        'data: {"status":400,"event":"error","code":"DIFY_STREAM_INTERRUPTED",'
                        '"message":"Dify stream interrupted"}\n\n'
                    ).encode("utf-8")
                    break
                if item_type == "done":
                    break

            if completed and state["conversationId"] and state["messageId"]:
                persist_event = {
                    "event": "relay_persist",
                    "data": {
                        "query": query,
                        "answer": state["answer"],
                        "conversationId": state["conversationId"],
                        "messageId": state["messageId"],
                        "metadata": state["metadata"],
                        "workflowProcess": state["workflowProcess"],
                        "agentLogs": state["agentLogs"],
                        "assistantFiles": state["assistantFiles"],
                        "userFiles": body.get("userFiles") or body.get("user_files") or [],
                    },
                }
                yield (
                    "\n\ndata: "
                    + json.dumps(persist_event, ensure_ascii=False)
                    + "\n\n"
                ).encode("utf-8")
        finally:
            upstream.close()

    return Response(
        generate(),
        status=upstream.status_code,
        content_type=upstream.headers.get("Content-Type", "text/event-stream; charset=utf-8"),
        headers={
            **cors_headers(),
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
            "X-Request-Id": request_id,
        },
    )

@app.get("/generated-files/<uuid:file_id>")
def generated_file(file_id: uuid.UUID):
    request_id = (
        request.headers.get("X-Request-Id")
        or request.args.get("requestId")
        or str(uuid.uuid4())
    )
    disposition = (
        "inline" if request.args.get("disposition") == "inline" else "attachment"
    )
    fallback_filename = request.args.get("filename") or str(file_id)
    if not authorize(file_id, disposition, fallback_filename, request_id):
        return error_response("Unauthorized", 401, request_id)

    step = "query-tool-file"
    try:
        with database_connection() as connection:
            connection.set_session(readonly=True, autocommit=False)
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT file_key, mimetype, name, size
                    FROM tool_files
                    WHERE id = %s
                    LIMIT 1
                    """,
                    (str(file_id),),
                )
                tool_file = cursor.fetchone()
                if not tool_file:
                    return error_response("Generated file not found", 404, request_id)

        storage_key, mime_type, stored_name, expected_size = tool_file
        step = "resolve-path"
        file_path = (STORAGE_ROOT / storage_key).resolve()
        try:
            file_path.relative_to(STORAGE_ROOT)
        except ValueError:
            return error_response("Invalid file path", 403, request_id)
        if not file_path.is_file():
            return error_response("Generated file missing on disk", 404, request_id)

        actual_size = file_path.stat().st_size
        if expected_size and actual_size != expected_size:
            logger.warning(
                "[library-file-service] generated size mismatch requestId=%s fileId=%s expected=%s actual=%s",
                request_id,
                file_id,
                expected_size,
                actual_size,
            )

        filename = fallback_filename or stored_name or str(file_id)
        return storage_file_response(
            file_path,
            storage_key,
            mime_type or "application/octet-stream",
            filename,
            disposition,
            request_id,
            "dify-generated-file-storage",
        )
    except Exception as error:
        logger.exception(
            "[library-file-service] generated file failed requestId=%s fileId=%s step=%s",
            request_id,
            file_id,
            step,
        )
        return error_response(
            f"Generated file service failed: {type(error).__name__}",
            500,
            request_id,
        )

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3011)
