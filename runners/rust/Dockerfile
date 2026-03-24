FROM rust:alpine
LABEL language="rust" version="latest"
ENV LANG=C.UTF-8 CARGO_HOME=/tmp/cargo
RUN apk add --no-cache musl-dev gcc && \
    OLD_USER=$(awk -F: '$3 == 1000 {print $1}' /etc/passwd); if [ -n "$OLD_USER" ]; then deluser "$OLD_USER"; fi; adduser -D -u 1000 runner
WORKDIR /code
USER runner
ENTRYPOINT ["sh", "-c", "rustc $1 -o /tmp/a.out && /tmp/a.out", "--"]
