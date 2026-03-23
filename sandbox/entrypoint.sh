#!/bin/bash

case "$1" in
    c)
        gcc /code/main.c -o /tmp/main -lm && chmod +x /tmp/main && /tmp/main
        ;;
    cpp)
        g++ /code/main.cpp -o /tmp/main -std=c++17 -lm && chmod +x /tmp/main && /tmp/main
        ;;
    java)
        javac -d /tmp /code/Main.java && java -cp /tmp Main
        ;;
    go)
        # Note for ptyManager.ts: must mount --tmpfs /.cache:size=200m for Go (not 50m)
        mkdir -p /tmp/go-build /tmp/go-cache /tmp/go-tmp
        cp /code/main.go /tmp/go-build/
        printf 'module sandbox\ngo 1.22' > /tmp/go-build/go.mod
        export GOCACHE=/tmp/go-cache
        export GOTMPDIR=/tmp/go-tmp
        cd /tmp/go-build && go build -o /tmp/main . && chmod +x /tmp/main && /tmp/main
        ;;
    rust)
        rustc /code/main.rs -o /tmp/main && chmod +x /tmp/main && /tmp/main
        ;;
    csharp)
        # Note for ptyManager.ts: must mount --tmpfs /tmp/nuget-cache:size=100m for C#
        export HOME=/tmp
        export DOTNET_CLI_HOME=/tmp
        export DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1
        export NUGET_PACKAGES=/tmp/nuget
        export XDG_DATA_HOME=/tmp/.local/share
        export XDG_CACHE_HOME=/tmp/.cache
        export APPDATA=/tmp/appdata
        export PROGRAMDATA=/tmp/programdata
        mkdir -p /tmp/cs-app /tmp/nuget /tmp/.local/share /tmp/appdata
        cp -r /opt/cs-template/App /tmp/cs-app/App
        cp /code/main.cs /tmp/cs-app/App/Program.cs
        cd /tmp/cs-app/App && dotnet run
        ;;
    python)
        python3 /code/main.py
        ;;
    node)
        node /code/main.js
        ;;
    typescript)
        tsx /code/main.ts
        ;;
    php)
        php /code/main.php
        ;;
    ruby)
        ruby /code/main.rb
        ;;
    mongodb)
        mongosh --nodb --norc /code/main.js
        ;;
    *)
        echo "Unsupported language: $1"
        exit 1
        ;;
esac
