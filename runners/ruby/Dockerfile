FROM ruby:3.3-alpine
LABEL language="ruby" version="3.3"
ENV LANG=C.UTF-8
RUN OLD_USER=$(awk -F: '$3 == 1000 {print $1}' /etc/passwd); if [ -n "$OLD_USER" ]; then deluser "$OLD_USER"; fi; adduser -D -u 1000 runner
WORKDIR /code
USER runner
ENTRYPOINT ["ruby"]
