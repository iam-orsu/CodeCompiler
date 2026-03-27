FROM mongo:7
LABEL language="mongodb" version="7"
ENV LANG=C.UTF-8 HOME=/tmp

# Create runner user
RUN if getent passwd 1000; then userdel -r $(id -un 1000); fi && \
    useradd -m -u 1000 runner

# Pre-build database during image build (runs as root, full capabilities)
RUN mkdir -p /data/prebuilt
COPY seed.js /seed.js
RUN mongod --dbpath /data/prebuilt --fork --logpath /tmp/mongod_build.log && \
    sleep 3 && \
    mongosh --quiet test_db /seed.js && \
    mongod --dbpath /data/prebuilt --shutdown && \
    rm -rf /data/prebuilt/journal /data/prebuilt/diagnostic.data && \
    rm -f /data/prebuilt/mongod.lock /tmp/mongod_build.log && \
    chown -R runner:runner /data/prebuilt

WORKDIR /code
COPY run.sh /run.sh
RUN chmod +x /run.sh && chown runner:runner /run.sh /seed.js
USER runner

ENTRYPOINT ["/run.sh"]
