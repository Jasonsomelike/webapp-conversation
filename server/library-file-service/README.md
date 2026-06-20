# Dify knowledge-library file service

This independent, read-only service resolves a Dify Knowledge Pipeline
`documents.id` to `documents.data_source_info.related_id`, verifies the matching
`upload_files` row and tenant, then streams the original file from Dify local
storage.

It does not modify Dify data, Chatflow, Agent plugins, or model workflows.

## Deploy

```bash
mkdir -p /opt/dify/library-file-service
cp server.py docker-compose.yml /opt/dify/library-file-service/
cp .env.example /opt/dify/library-file-service/.env
chmod 600 /opt/dify/library-file-service/.env
cd /opt/dify/library-file-service
docker compose up -d
```

Add `nginx-location.conf` inside the Dify Nginx server block, test and reload:

```bash
docker exec dify-nginx-1 nginx -t
docker exec dify-nginx-1 nginx -s reload
```

Set these server-only variables in the webapp deployment:

```env
LIBRARY_FILE_SERVICE_URL=https://dify.example.com/custom-library
LIBRARY_FILE_SERVICE_TOKEN=same-random-secret-as-the-service
```

After checking the webapp login session, the Next.js route returns a five-minute
HMAC-signed redirect to the file service. The internal token is never included
in the URL. This avoids unreliable serverless egress to non-standard HTTPS
ports while preserving user authorization at the webapp boundary.

## Verify

```bash
curl http://127.0.0.1:3011/health
curl -I \
  -H "X-Internal-Token: $LIBRARY_FILE_SERVICE_TOKEN" \
  "http://127.0.0.1:3011/library/documents/<documentId>/file?disposition=inline"
```

## Roll back

```bash
cd /opt/dify/library-file-service
docker compose down
```

Remove the `/custom-library/` Nginx location and reload Nginx. The Next.js route
will fall back to the official Dify download endpoint and indexed page-image
PDF reconstruction.
