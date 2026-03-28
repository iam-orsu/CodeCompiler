#!/bin/sh
export HOME=/home/runner
export MONGOSH_DISABLE_UPDATES=1
export MONGOSH_DISABLE_TELEMETRY=1

# Start mongod gracefully at runtime
mongod --dbpath /tmp/mongo_data --bind_ip 127.0.0.1 --wiredTigerCacheSizeGB 0.25 > /tmp/mongod.log 2>&1 &
MONGOPID=$!

# Wait for MongoDB to become ready
READY=0
for i in $(seq 1 30); do
  if mongosh "mongodb://127.0.0.1:27017/?serverSelectionTimeoutMS=500" --quiet --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 0.3
done

if [ "$READY" = "0" ]; then
  echo "ERROR: MongoDB failed to start during runtime initialization."
  cat /tmp/mongod.log
  exit 1
fi

# Seed the database synchronously (ensures all data is present before queries)
mongosh --quiet --norc test_db /seed.js > /dev/null 2>&1

# Run the user script
mongosh --quiet --norc test_db "$1"

# Automatically shut down by Docker when script finishes

