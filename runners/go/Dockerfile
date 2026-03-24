FROM golang:1.22-alpine
LABEL language="go" version="1.22"
ENV LANG=C.UTF-8 CGO_ENABLED=0
ENV GOPATH=/tmp/go GOCACHE=/tmp/go-cache GOFLAGS=-mod=mod
RUN OLD_USER=$(awk -F: '$3 == 1000 {print $1}' /etc/passwd); if [ -n "$OLD_USER" ]; then deluser "$OLD_USER"; fi; adduser -D -u 1000 runner
WORKDIR /code
USER runner
ENTRYPOINT ["sh", "-c", "mkdir -p /tmp/go-build /tmp/go-cache && cp $1 /tmp/go-build/main.go && echo 'module sandbox\ngo 1.22' > /tmp/go-build/go.mod && cd /tmp/go-build && go build -o /tmp/main . && /tmp/main", "--"]
