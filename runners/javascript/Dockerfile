FROM node:20-alpine
LABEL language="javascript" version="20"
ENV LANG=C.UTF-8
RUN deluser node && adduser -D -u 1000 runner
WORKDIR /code
USER runner
ENTRYPOINT ["node"]
