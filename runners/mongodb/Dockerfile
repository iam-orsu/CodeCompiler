# Uncertainty Note: MongoDB does not provide an official Alpine image due to musl libc incompatibility.
# Using the official mongo:7 base image (which is Ubuntu/Debian based).
FROM mongo:7
LABEL language="mongodb" version="7"
ENV LANG=C.UTF-8

# Create runlyuser with UID 1000 and setup directories for ephemeral db
RUN if getent passwd 1000; then userdel -r $(id -un 1000); fi && \
    useradd -m -u 1000 runner && \
    mkdir -p /tmp/mongo_data && \
    chown -R runner:runner /tmp/mongo_data && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /code
USER runner

# Start an ephemeral mongod in the background, wait for it to boot, run the user script, then exit
# The container itself will be destroyed right after, taking the in-memory/temp data with it.
ENTRYPOINT ["sh", "-c", "mongod --dbpath /tmp/mongo_data --fork --logpath /dev/null && sleep 2 && mongosh test_db < $1", "--"]
