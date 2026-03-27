FROM golang:1.22-alpine
LABEL language="go" version="1.22"
ENV LANG=C.UTF-8 CGO_ENABLED=0 GOTOOLCHAIN=local GOPROXY=off GONOSUMCHECK=* GONOSUMDB=* GOFLAGS=-mod=mod
ENV HOME=/home/runner GOPATH=/home/runner/go GOCACHE=/home/runner/.cache/go-build
RUN OLD_USER=$(awk -F: '$3 == 1000 {print $1}' /etc/passwd); if [ -n "$OLD_USER" ]; then deluser "$OLD_USER"; fi; adduser -D -u 1000 -h /home/runner runner && mkdir -p /home/runner/.cache/go-build /home/runner/go && chown -R runner:runner /home/runner
WORKDIR /code
USER runner
ENTRYPOINT ["sh", "-c", "mkdir -p /tmp/go-build && cp $1 /tmp/go-build/main.go && printf 'module sandbox\\ngo 1.22\\n' > /tmp/go-build/go.mod && cd /tmp/go-build && go build -o /tmp/main . && /tmp/main", "--"]
