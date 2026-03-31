#!/bin/sh
set -e

# Point Go toolchain to the RAM disk
export GOCACHE=/tmp/go-cache
export GOMODCACHE=/tmp/go-build
mkdir -p /tmp/go-build /tmp/go-cache

FILE="$1"
DIR=$(dirname "$FILE")
BASE=$(basename "$FILE")

cd "$DIR"

# Compilation (Non-module mode is faster and offline-safe)
go build -o /tmp/main "$BASE"

# Execute
exec /tmp/main

