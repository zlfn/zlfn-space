# Stage 1: Build zola with Japanese indexing
FROM rust:latest AS zola-builder
RUN cargo install --git https://github.com/getzola/zola --features indexing-ja

# Stage 2: Runtime
FROM debian:trixie-slim

RUN apt-get update && apt-get install -y git nginx cron && rm -rf /var/lib/apt/lists/*
COPY --from=zola-builder /usr/local/cargo/bin/zola /usr/local/bin/zola

RUN rm -f /etc/nginx/sites-enabled/default
COPY nginx.conf /etc/nginx/sites-enabled/default
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV REPO_URL=https://github.com/zlfn/zlfn-space.git
ENV BRANCH=main
ENV SYNC_INTERVAL=60

EXPOSE 80
CMD ["/entrypoint.sh"]
