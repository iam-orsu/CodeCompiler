#!/bin/bash

# Exit on any error
set -e

# Colors for terminal output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}[*] Starting Runly.dev Runner Images Build Process...${NC}\n"

# Check if the runners directory exists
if [ ! -d "./runners" ]; then
    echo -e "${RED}[!] Error: ./runners directory not found!${NC}"
    echo "Please run this script from the project root."
    exit 1
fi

# Iterate through all subdirectories in ./runners/
for dir in ./runners/*/; do
    if [ -d "$dir" ]; then
        # Extract the language directory name without trailing slash
        dirname=$(basename "$dir")
        
        echo -e "${BLUE}[*] Building image for ${GREEN}${dirname}${NC}..."
        
        # Build the docker image and tag it as required by pool.py
        if docker build -t "runly-runner-${dirname}" "$dir"; then
            echo -e "${GREEN}[+] Successfully built runly-runner-${dirname}${NC}\n"
        else
            echo -e "${RED}[!] Failed to build runly-runner-${dirname}. Aborting.${NC}"
            exit 1
        fi
    fi
done

echo -e "${GREEN}[*] All runner images built successfully!${NC}"
