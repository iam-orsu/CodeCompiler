#!/bin/sh
export HOME=/tmp

# Copy pre-built database files from image to tmpfs (writable at runtime)
cp -a /data/prebuilt/. /tmp/mongo_data/

# Start mongod with limited cache (100MB) to fit in container memory
mongod --dbpath /tmp/mongo_data --bind_ip 127.0.0.1 --wiredTigerCacheSizeGB 0.1 > /tmp/mongod.log 2>&1 &

# Wait for mongod to be ready (check if port is open)
READY=0
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
  if mongosh --quiet --eval "db.runCommand({ping:1})" 127.0.0.1:27017 > /dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 0.5
done

if [ "$READY" = "0" ]; then
  echo "ERROR: MongoDB failed to start within timeout."
  echo "--- mongod log ---"
  cat /tmp/mongod.log
  exit 1
fi

# Run user script
mongosh --quiet --norc test_db "$1"
