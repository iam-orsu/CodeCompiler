FROM alpine:latest
LABEL language="sqlite" version="alpine-sqlite"
ENV LANG=C.UTF-8
RUN apk add --no-cache sqlite && \
    OLD_USER=$(awk -F: '$3 == 1000 {print $1}' /etc/passwd); if [ -n "$OLD_USER" ]; then deluser "$OLD_USER"; fi; adduser -D -u 1000 runner
WORKDIR /code
COPY seed.sql /seed.sql
COPY run.sh /run.sh
RUN chmod +x /run.sh && chown runner:runner /seed.sql /run.sh
USER runner
ENTRYPOINT ["/run.sh"]
