FROM node:20-alpine
LABEL language="typescript" version="20"
ENV LANG=C.UTF-8 HOME=/tmp
RUN npm install -g typescript tsx && \
    npm cache clean --force && \
    deluser node && \
    adduser -D -u 1000 runner
WORKDIR /code
USER runner
ENTRYPOINT ["tsx"]
