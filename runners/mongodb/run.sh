#!/bin/sh
export HOME=/tmp

# Copy pre-built database files from image to tmpfs
cp -a /data/prebuilt/. /tmp/mongo_data/ 2>/dev/null

# Start mongod with limited cache (100MB instead of default 256MB)
mongod --dbpath /tmp/mongo_data --bind_ip 127.0.0.1 --wiredTigerCacheSizeGB 0.25 > /tmp/mongod.log 2>&1 &

# Wait for port 27017 to be open (fast check, no 30s mongosh timeout)
READY=0
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
  if mongosh "mongodb://127.0.0.1:27017/?serverSelectionTimeoutMS=500" --quiet --eval "1" > /dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 0.3
done

if [ "$READY" = "0" ]; then
  echo "ERROR: MongoDB failed to start."
  cat /tmp/mongod.log
  exit 1
fi

# Run user script
mongosh --quiet --norc test_db "$1"
