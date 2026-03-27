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
COPY seed.js /seed.js
RUN chown runner:runner /seed.js
USER runner

# Start an ephemeral mongod, seed data first, then run user script
ENTRYPOINT ["sh", "-c", "mongod --dbpath /tmp/mongo_data --fork --logpath /dev/null && sleep 2 && mongosh --quiet test_db /seed.js && mongosh --quiet test_db < $1", "--"]
