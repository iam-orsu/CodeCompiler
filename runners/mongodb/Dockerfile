FROM mongo:7
LABEL language="mongodb" version="7"
ENV LANG=C.UTF-8 HOME=/tmp

# Create runner user
RUN if getent passwd 1000; then userdel -r $(id -un 1000); fi && \
    useradd -m -u 1000 runner

# Copy scripts
WORKDIR /code
COPY seed.js /seed.js
COPY run.sh /run.sh
RUN chmod +x /run.sh && chown runner:runner /run.sh /seed.js
USER runner

ENTRYPOINT ["/run.sh"]
