# Uncertainty note: The prompt asks for `r-base` (smallest available). `r-base` on Dockerhub
# is typically Debian-based, lacking an official `alpine` tag. 
# I am using `r-base:4.3.3` (Debian) but adhering to all other constraints like user and cleanup.
FROM r-base:4.3.3
LABEL language="r" version="4.3.3"
ENV LANG=C.UTF-8
RUN if getent passwd 1000; then userdel -r $(id -un 1000); fi && \
    useradd -m -u 1000 runner && \
    apt-get clean && rm -rf /var/lib/apt/lists/*
WORKDIR /code
USER runner
ENTRYPOINT ["Rscript"]
