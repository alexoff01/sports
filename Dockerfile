FROM node:20-bookworm-slim AS frontend-builder

WORKDIR /frontend

ARG REACT_APP_ADMIN_PATH_HASH

ENV NODE_OPTIONS=--openssl-legacy-provider

COPY frontend/ ./

RUN corepack enable \
    && corepack prepare yarn@1.22.22 --activate \
    && yarn install --non-interactive \
    && yarn build

FROM python:3.11-slim

WORKDIR /app/backend

COPY backend/requirements.txt ./requirements.txt

RUN pip install --no-cache-dir -r requirements.txt

COPY scripts/ /app/scripts/

COPY --from=frontend-builder /frontend/build /app/frontend/build

EXPOSE 8000

CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}"]
