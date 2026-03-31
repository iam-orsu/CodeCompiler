FROM golang:1.22-alpine
LABEL language="go" version="1.22"
# GOMAXPROCS=2: Safe for local 4-core laptops and high-core 94-core hosts.
# RAM Disk (tmpfs): Point GOCACHE and GOTMPDIR to the fast /tmp mount.
# Offline-First: Strip GOFLAGS and disable GOPROXY/GOSUMDB to kill 30s hangs.
ENV LANG=C.UTF-8 CGO_ENABLED=0 GOTOOLCHAIN=local \
    GOPROXY=off GOSUMDB=off GODEBUG=netdns=go \
    GOMAXPROCS=2 GOCACHE=/tmp/go-cache GOTMPDIR=/tmp/go-build

RUN adduser -D -u 1000 runner && \
    mkdir -p /home/runner/go /code && \
    chown -R runner:runner /home/runner /code

COPY run.sh /run.sh
RUN chmod +x /run.sh && chown runner:runner /run.sh

WORKDIR /code
USER runner
# Simplified entrypoint: delegate to run.sh for robustness
ENTRYPOINT ["/run.sh"]
