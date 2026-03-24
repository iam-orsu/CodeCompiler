FROM mcr.microsoft.com/dotnet/sdk:8.0
LABEL language="csharp" version="8.0"
ENV LANG=C.UTF-8 DOTNET_NOLOGO=1 DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1 DOTNET_CLI_TELEMETRY_OPTOUT=1 NUGET_XMLDOC_MODE=skip
RUN if getent passwd 1000; then userdel -r $(id -un 1000); fi && \
    useradd -m -u 1000 runner
USER runner
# Pre-bake a console project so runtime needs zero network
RUN mkdir -p /home/runner/app && \
    cd /home/runner/app && \
    dotnet new console --force && \
    dotnet build -c Release -o /home/runner/app/bin && \
    rm -f Program.cs
WORKDIR /code
ENTRYPOINT ["sh", "-c", "cp $1 /home/runner/app/Program.cs && cd /home/runner/app && dotnet run --no-restore 2>&1", "--"]
