FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine
LABEL language="csharp" version="8.0"
ENV LANG=C.UTF-8
RUN OLD_USER=$(awk -F: '$3 == 1000 {print $1}' /etc/passwd); if [ -n "$OLD_USER" ]; then deluser "$OLD_USER"; fi; adduser -D -u 1000 runner
USER runner
RUN dotnet tool install -g dotnet-script && \
    rm -rf /tmp/NuGetScratch || true
ENV PATH="/home/runner/.dotnet/tools:${PATH}"
WORKDIR /code
ENTRYPOINT ["dotnet", "script"]
