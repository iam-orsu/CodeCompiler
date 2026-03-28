import docker
import time

client = docker.from_env()

# Start the container
print("Starting container...")
container = client.containers.run(
    "runly-runner-mongodb",
    ["main.js"],
    detach=True,
    tmpfs={"/tmp/mongo_data": "rw,exec,nosuid,size=512m,uid=1000,gid=1000"},
    network_mode="none",
    user="1000:1000",
)

# Put a dummy main.js
print("Creating main.js...")
import io
import tarfile
tar_stream = io.BytesIO()
with tarfile.open(fileobj=tar_stream, mode='w') as tar:
    code = "db.adminCommand({ping: 1}); print('HELLO FROM MONGOSH');".encode('utf-8')
    tinfo = tarfile.TarInfo(name="main.js")
    tinfo.size = len(code)
    tar.addfile(tinfo, io.BytesIO(code))
tar_stream.seek(0)
container.put_archive("/code", tar_stream.read())

print("Waiting for container to finish...")
res = container.wait(timeout=35)
print("Exit code:", res)

print("Logs:")
print(container.logs().decode('utf-8'))

# Grab mongod.log from inside just in case
print("Fetching mongod.log...")
try:
    bits, stat = container.get_archive("/tmp/mongod.log")
    with open("mongod.log.tar", "wb") as f:
        for chunk in bits:
            f.write(chunk)
    import os
    os.system("tar -xf mongod.log.tar && cat mongod.log && rm mongod.log mongod.log.tar")
except Exception as e:
    print("Failed to get mongod.log:", e)

container.remove(force=True)
