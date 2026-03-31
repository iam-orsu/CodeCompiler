FROM eclipse-temurin:21-alpine
LABEL language="java" version="21"
ENV LANG=C.UTF-8
RUN OLD_USER=$(awk -F: '$3 == 1000 {print $1}' /etc/passwd); if [ -n "$OLD_USER" ]; then deluser "$OLD_USER"; fi; adduser -D -u 1000 runner
COPY FlushRunner.java /opt/FlushRunner.java
RUN javac -d /opt /opt/FlushRunner.java && rm /opt/FlushRunner.java
WORKDIR /code
USER runner
ENTRYPOINT ["sh", "-c", "FILE=$(ls /code/*.java 2>/dev/null | head -1); if [ -z \"$FILE\" ]; then FILE=$1; fi; javac -d /tmp \"$FILE\" && java -cp /tmp:/opt FlushRunner $(basename \"$FILE\" .java)", "--"]
