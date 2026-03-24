FROM alpine:latest
LABEL language="bash" version="alpine-bash"
ENV LANG=C.UTF-8
RUN apk add --no-cache bash && \
    OLD_USER=$(awk -F: '$3 == 1000 {print $1}' /etc/passwd); if [ -n "$OLD_USER" ]; then deluser "$OLD_USER"; fi; adduser -D -u 1000 runner
WORKDIR /code
USER runner
ENTRYPOINT ["bash"]
