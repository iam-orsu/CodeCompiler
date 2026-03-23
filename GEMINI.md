# Runly.dev — Project Memory File
# Paste this at the START of every Gemini conversation

## What is Runly.dev
Online multi-language code execution platform like OneCompiler.
Users write code, click Run, see output in a real interactive terminal.
Built from scratch. Everything runs via: sudo docker compose up -d

## Tech Stack
- Frontend: Next.js 14, TypeScript, xterm.js (@xterm/xterm ^5.5.0)
- Backend: Node.js, TypeScript, Express
- Terminal: xterm.js + node-pty + WebSocket (REAL PTY — not simulated)
- Database: PostgreSQL via Knex
- Queue: BullMQ + Redis (for batch/API, NOT for interactive terminal)
- Sandbox: Single Docker image (runly-sandbox) — all runtimes in one image
- Deploy: Docker Compose only, Azure VM 8GB RAM 4 vCPUs Ubuntu 22.04

## Language Categories

### Backend Languages (PTY terminal — real interactive execution)
| ID | Name | Runtime | Compile Command | Run Command |
|---|---|---|---|---|
| python | Python 3.12 | python3.12 | none | python3 /code/main.py |
| node | Node.js 20 | node:20 | none | node /code/main.js |
| typescript | TypeScript 5 | ts-node | none | npx ts-node /code/main.ts |
| c | C (GCC 13) | gcc-13 | gcc /code/main.c -o /tmp/main -lm | /tmp/main |
| cpp | C++ (G++ 13) | g++-13 | g++ /code/main.cpp -o /tmp/main -std=c++17 -lm | /tmp/main |
| csharp | C# (.NET 9) | dotnet sdk:9.0 | cd /tmp && dotnet run --project /tmp/cs | via dotnet |
| java | Java 21 | openjdk-21 | javac -d /tmp /code/Main.java | java -cp /tmp Main |
| go | Go 1.22 | golang | go build -o /tmp/main | /tmp/main |
| rust | Rust 1.77 | rustc (direct binary, NOT rustup wrapper) | rustc /code/main.rs -o /tmp/main | /tmp/main |
| php | PHP 8.3 | php8.3 | none | php /code/main.php |
| ruby | Ruby 3.3 | ruby3.3 | none | ruby /code/main.rb |
| mongodb | MongoDB | mongosh | none | mongosh --nodb /code/main.js |

### Web Preview Languages (browser-side — no backend execution)
| ID | Name | How |
|---|---|---|
| html | HTML/CSS/JS | iframe srcdoc — live preview |
| react | React 18 | CDN + Babel standalone in iframe |
| vue | Vue 3 | CDN in iframe |
| angular | AngularJS 1.x | CDN in iframe (label as AngularJS not Angular) |

### Special Playground Languages (custom UI — not terminal, not preview)
| ID | Name | How |
|---|---|---|
| sqlite | SQLite | sql.js (SQLite WASM) in browser — shows results as TABLE not terminal |

## Total: 17 languages

## Critical Architecture Decisions

### Terminal Architecture (PTY)
- WebSocket endpoint: ws://host/ws/execute
- Backend: node-pty spawns `docker run -it` with sandbox image
- Frontend: xterm.js connects via WebSocket, forwards keystrokes
- NO fake input collection — real PTY handles stdin/stdout live
- entrypoint.sh must NEVER redirect stdin — PTY handles it directly
- 30-60 second timeout enforced in ptyManager.ts

### Docker Socket
- Mounted on API service (NOT worker): /var/run/docker.sock
- Docker CLI must be installed in backend Dockerfile (docker.io package)
- node-pty needs native compilation: python3, make, g++, libc6-dev in Dockerfile

### Sandbox Image
- Single image: runly-sandbox — all runtimes installed together
- Built separately: docker build -f sandbox/Dockerfile.sandbox -t runly-sandbox ./sandbox
- Base: ubuntu:22.04
- entrypoint.sh receives language as $1 argument
- entrypoint.sh has NO stdin redirect, NO output cap pipes, NO meta.json
- Just: compile (if needed) → run. PTY handles everything else.

### SQLite Special Mode
- Pure frontend WASM using sql.js CDN
- Layout: SQL editor (top) + Results table (bottom)
- No backend call, no terminal
- Instant execution in browser

### MongoDB Mode  
- Runs through PTY terminal like other backend languages
- mongosh --nodb executes JS files
- Users write MongoDB JS syntax: db.collection.find({})
- Results appear in xterm terminal

## Critical Bugs From Previous Build — NEVER REPEAT

### Dockerode (backend)
- Property is NanoCpus NOT NanoCPUs (capital C lowercase pus)
- ALWAYS await createContainer separately, THEN attach, THEN start
- NEVER chain: const c = await docker.createContainer(); const s = await c.attach(); await c.start()
- attach() MUST be called BEFORE start()

### Language Enum
- Use "cpp" NEVER "c++"
- Use "node" NEVER "javascript"  
- Use "go" NEVER "golang"
- Use "csharp" NEVER "c#"
- Use "typescript" NEVER "ts"
- Use "mongodb" NEVER "mongo"
- Use "sqlite" NEVER "sql"
- Single source of truth: languages.ts — frontend reads from API

### Sandbox
- entrypoint.sh must NOT have: eval "$cmd" < "$STDIN_FILE"
- entrypoint.sh must NOT have: | head -c 65536
- entrypoint.sh must NOT write /tmp/meta.json
- Rust: copy actual rustc binary from toolchain, NOT the rustup wrapper
  Path: /root/.rustup/toolchains/1.77.0-*/bin/rustc → /usr/local/bin/rustc
- Go: needs --tmpfs /.cache:size=50m extra mount
- Go: needs go.mod created in /tmp/go-build before build
- Java: needs --memory=512m (all others 256m)
- GCC 14 PPA breaks add-apt-repository after python3.12 symlink — use gcc-13 from default repos instead
- python3.12-distutils package does not exist — install python3.12 only

### Docker Security Flags (ALL required in ptyExecutor.ts)
--rm --network=none --read-only
--memory=256m (512m for java)
--cpus=0.5
--pids-limit=64 (256 for go and java)
--cap-drop=ALL
--security-opt=no-new-privileges
--tmpfs /tmp:size=50m,exec
--tmpfs /home:size=10m
-e TERM=xterm-256color
-v hostCodeDir:/code:ro

### nginx WebSocket
location /ws/ {
    proxy_pass http://api:4000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 300s;
}

### node-pty
- Node readline: use rl.question() NOT rl.on('close') for interactive PTY
- node-pty spawns docker run -it NOT docker exec
- Each run = fresh container

## Docker Images Per Language
python: python3.12 via deadsnakes PPA (inside runly-sandbox)
node + typescript: node:20 via nodesource (inside runly-sandbox)
c + cpp: gcc-13 via apt default (NO extra PPA needed)
csharp: mcr.microsoft.com/dotnet/sdk:9.0 installed inside runly-sandbox
java: openjdk-21-jdk via apt
go: official tar.gz from go.dev/dl/go1.22.0.linux-amd64.tar.gz
rust: rustup 1.77.0 — copy ACTUAL binary not wrapper
php: php8.3-cli via ondrej PPA
ruby: ruby3.3 via brightbox PPA
mongodb: mongosh via apt (mongodb.org repo)

## Project Structure
RunlyDev3/
├── docker-compose.yml
├── .env
├── .env.example
├── nginx/nginx.conf
├── sandbox/
│   ├── Dockerfile.sandbox
│   └── entrypoint.sh
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.ts
│       ├── config.ts
│       ├── languages.ts
│       ├── utils/
│       ├── db/
│       ├── models/
│       ├── queue/
│       ├── executor/
│       ├── terminal/
│       │   ├── ptyManager.ts
│       │   └── wsHandler.ts
│       ├── middleware/
│       └── routes/
└── frontend/
    ├── Dockerfile
    ├── package.json
    └── src/
        ├── app/
        ├── components/
        │   ├── Terminal/XTerminal.tsx
        │   ├── Preview/PreviewPanel.tsx
        │   ├── Preview/WebConsolePanel.tsx
        │   ├── Playground/SQLitePlayground.tsx
        │   ├── Explorer/FileExplorer.tsx
        │   ├── Explorer/ContextMenu.tsx
        │   ├── Editor/CodeEditor.tsx
        │   ├── Editor/EditorToolbar.tsx
        │   └── Toolbar/MarketplaceDropdown.tsx
        ├── lib/
        │   ├── api.ts
        │   ├── languages.ts
        │   └── marketplace.ts
        ├── hooks/
        └── types/

## Gemini Prompt Tips
- Always paste this file first
- Ask for one phase at a time
- Say "STOP after X files" explicitly
- For architecture questions add: thinking: high
- Batch 3-5 files per request
- Never ask it to run code — just write files