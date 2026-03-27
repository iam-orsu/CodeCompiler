FROM alpine:latest
LABEL language="sqlite" version="alpine-sqlite"
ENV LANG=C.UTF-8
RUN apk add --no-cache sqlite && \
    OLD_USER=$(awk -F: '$3 == 1000 {print $1}' /etc/passwd); if [ -n "$OLD_USER" ]; then deluser "$OLD_USER"; fi; adduser -D -u 1000 runner
WORKDIR /code
COPY seed.sql /seed.sql
RUN chown runner:runner /seed.sql
USER runner
ENTRYPOINT ["sh", "-c", "cat /seed.sql $1 | sqlite3 :memory:", "--"]
