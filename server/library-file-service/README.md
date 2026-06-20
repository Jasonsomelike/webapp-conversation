# Dify library file and chat relay service

This read-only companion service runs beside Dify and provides three server-side capabilities for the customized webapp:

- Resolve knowledge-library `documents.id` values to the original files in Dify local storage.
- Resolve generated `tool_files.id` values so expired Dify download signatures do not break historical chat files.
- Relay authenticated browser chat requests to the local Dify API when the serverless deployment cannot reliably reach the non-standard public HTTPS port.

The service never exposes the Dify application key to the browser. Webapp routes first validate the signed-in user and issue short-lived HMAC tickets. The relay validates the request body hash, expiry, origin, and signature before calling Dify.

## Deploy

```bash
mkdir -p /opt/dify/library-file-service
cp server.py docker-compose.yml accelerator.conf /opt/dify/library-file-service/
cp .env.example /opt/dify/library-file-service/.env
chmod 600 /opt/dify/library-file-service/.env
cd /opt/dify/library-file-service
docker compose up -d
```

Add `nginx-location.conf` inside the Dify HTTPS server block, then test and reload Nginx:

```bash
docker exec dify-nginx-1 nginx -t
docker exec dify-nginx-1 nginx -s reload
```

Set these server-only variables in the webapp deployment:

```env
LIBRARY_FILE_SERVICE_URL=https://dify.example.com/custom-library
LIBRARY_FILE_SERVICE_TOKEN=same-long-random-secret-as-the-service
```

The Nginx accelerator serves authorized local files with `sendfile` and byte-range support after the Python service returns an internal `X-Accel-Redirect`. This removes Python streaming as the download bottleneck.

## Verify

```bash
curl http://127.0.0.1:3011/health
curl -I \
  -H "X-Internal-Token: $LIBRARY_FILE_SERVICE_TOKEN" \
  "http://127.0.0.1:3011/library/documents/<documentId>/file?disposition=inline"
curl -i -X OPTIONS \
  -H "Origin: https://www.example.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" \
  http://127.0.0.1:3011/chat-messages
```

## Roll back

```bash
cd /opt/dify/library-file-service
docker compose down
```

Remove the `/custom-library/` Nginx location and reload Nginx. The Next.js routes retain their direct-Dify fallback where available.