import json
import logging
import os
import time
from datetime import timezone

import psycopg2
import requests

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("library-catalog-sync")

DATASET_ID = os.environ["DIFY_DATASET_ID"]
INTERNAL_TOKEN = os.environ["LIBRARY_FILE_SERVICE_TOKEN"]
SYNC_URL = os.getenv(
    "LIBRARY_CATALOG_SYNC_URL",
    "https://www.bestijason.cn/api/cron/library-documents",
)


def database_connection():
    return psycopg2.connect(
        host=os.environ["DB_HOST"],
        port=int(os.getenv("DB_PORT", "5432")),
        dbname=os.environ["DB_DATABASE"],
        user=os.environ["DB_USERNAME"],
        password=os.environ["DB_PASSWORD"],
        connect_timeout=8,
        application_name="dify-library-catalog-sync",
    )


def parse_source_info(value):
    if isinstance(value, dict):
        return value
    if not value:
        return {}
    try:
        return json.loads(value)
    except (TypeError, json.JSONDecodeError):
        return {}


def timestamp(value):
    if not value:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return int(value.timestamp())


def load_documents():
    with database_connection() as connection:
        connection.set_session(readonly=True, autocommit=False)
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    id,
                    name,
                    position,
                    data_source_type,
                    created_from,
                    created_at,
                    tokens,
                    indexing_status,
                    error,
                    enabled,
                    archived,
                    word_count,
                    doc_form,
                    data_source_info
                FROM documents
                WHERE dataset_id::text = %s
                ORDER BY position ASC, created_at ASC
                """,
                (DATASET_ID,),
            )
            rows = cursor.fetchall()

    return [
        {
            "id": str(row[0]),
            "name": row[1],
            "position": row[2],
            "data_source_type": row[3],
            "created_from": row[4],
            "created_at": timestamp(row[5]),
            "tokens": row[6] or 0,
            "indexing_status": row[7],
            "display_status": row[7],
            "error": row[8],
            "enabled": bool(row[9]),
            "archived": bool(row[10]),
            "word_count": row[11] or 0,
            "hit_count": 0,
            "doc_form": row[12],
            "data_source_info": parse_source_info(row[13]),
        }
        for row in rows
    ]


def push_documents(documents):
    last_error = None
    for attempt in range(1, 6):
        try:
            response = requests.post(
                SYNC_URL,
                headers={
                    "Content-Type": "application/json",
                    "X-Internal-Token": INTERNAL_TOKEN,
                },
                json={"documents": documents},
                timeout=(8, 30),
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as error:
            last_error = error
            logger.warning(
                "Catalog push attempt %s failed: %s",
                attempt,
                type(error).__name__,
            )
            if attempt < 5:
                time.sleep(attempt * 3)
    raise last_error


def main():
    documents = load_documents()
    result = push_documents(documents)
    logger.info(
        "Knowledge catalog synchronized: documents=%s refreshed_at=%s",
        result.get("total", len(documents)),
        result.get("refreshed_at", ""),
    )


if __name__ == "__main__":
    main()
