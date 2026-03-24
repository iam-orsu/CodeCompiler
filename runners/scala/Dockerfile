# Uncertainty Note: The exact available alpine tag for scala-sbt varies. 
# Using the eclipse-temurin-alpine base tag from sbtscala/scala-sbt.
FROM sbtscala/scala-sbt:eclipse-temurin-alpine-24.0.1_9_1.12.7_3.3.7
LABEL language="scala" version="latest"
ENV LANG=C.UTF-8
RUN OLD_USER=$(awk -F: '$3 == 1000 {print $1}' /etc/passwd); if [ -n "$OLD_USER" ]; then deluser "$OLD_USER"; fi; adduser -D -u 1000 runner
WORKDIR /code
USER runner
ENTRYPOINT ["sh", "-c", "scalac $1 && scala -cp $(dirname $1) $(basename $1 .scala | sed 's/.*/\\u&/')", "--"]
