#!/bin/bash
# Go Runner - Multi-variant diagnostic
# Tests 3 scenarios to isolate the hang

echo '=== TEST 1: No CPU limit, 120s timeout ==='
echo 'package main
import "fmt"
func main() { fmt.Println("Hello Go!") }' > /tmp/test_go2.go

CID=$(sudo docker create \
  --network none \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  --user 1000 \
  --memory 512m \
  --tty \
  --interactive \
  --tmpfs /tmp:rw,exec,nosuid,size=512m \
  runly-runner-go /code/main.go)
sudo docker cp /tmp/test_go2.go "$CID:/code/main.go"
START=$(date +%s)
timeout 120 sudo docker start -ai "$CID" 2>&1
END=$(date +%s)
echo "=> Took $((END-START))s"
sudo docker rm -f "$CID" > /dev/null 2>&1

echo ''
echo '=== TEST 2: No CPU limit, no tty, no interactive, 120s timeout ==='

CID=$(sudo docker create \
  --network none \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  --user 1000 \
  --memory 512m \
  --tmpfs /tmp:rw,exec,nosuid,size=512m \
  runly-runner-go /code/main.go)
sudo docker cp /tmp/test_go2.go "$CID:/code/main.go"
START=$(date +%s)
timeout 120 sudo docker start -a "$CID" 2>&1
END=$(date +%s)
echo "=> Took $((END-START))s"
sudo docker rm -f "$CID" > /dev/null 2>&1

echo ''
echo '=== TEST 3: With CPU limit (0.5), no tty, 120s timeout ==='

CID=$(sudo docker create \
  --network none \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  --user 1000 \
  --memory 512m \
  --cpu-quota 50000 \
  --cpu-period 100000 \
  --tmpfs /tmp:rw,exec,nosuid,size=512m \
  runly-runner-go /code/main.go)
sudo docker cp /tmp/test_go2.go "$CID:/code/main.go"
START=$(date +%s)
timeout 120 sudo docker start -a "$CID" 2>&1
END=$(date +%s)
echo "=> Took $((END-START))s"
sudo docker rm -f "$CID" > /dev/null 2>&1

echo ''
echo '=== ALL TESTS DONE ==='
