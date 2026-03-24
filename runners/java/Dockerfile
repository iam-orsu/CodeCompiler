FROM eclipse-temurin:21-alpine
LABEL language="java" version="21"
ENV LANG=C.UTF-8
RUN OLD_USER=$(awk -F: '$3 == 1000 {print $1}' /etc/passwd); if [ -n "$OLD_USER" ]; then deluser "$OLD_USER"; fi; adduser -D -u 1000 runner
WORKDIR /code
USER runner
ENTRYPOINT ["sh", "-c", "javac -d /tmp $1 && java -cp /tmp $(basename $1 .java)", "--"]
