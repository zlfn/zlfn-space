#!/bin/sh
set -e

REPO_DIR=/site/repo
PUBLIC_DIR=/usr/share/nginx/html

# Initial clone
if [ ! -d "$REPO_DIR/.git" ]; then
    echo "[init] Cloning $REPO_URL ($BRANCH)..."
    git clone --depth 1 -b "$BRANCH" "$REPO_URL" "$REPO_DIR"
fi

# Initial build
echo "[init] Building site..."
cd "$REPO_DIR"
if ! zola build -o "$PUBLIC_DIR"; then
    echo "[init] Build failed!"
    exit 1
fi
echo "[init] Site ready."

# Start nginx in background
nginx -g 'daemon off;' &

# Git sync loop
while true; do
    sleep "$SYNC_INTERVAL"
    cd "$REPO_DIR"
    git fetch origin "$BRANCH" 2>/dev/null || continue
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse origin/"$BRANCH")

    if [ "$LOCAL" != "$REMOTE" ]; then
        echo "[sync] Update detected ($LOCAL -> $REMOTE)"
        git reset --hard origin/"$BRANCH"
        echo "[sync] Rebuilding..."
        if zola build -o "$PUBLIC_DIR"; then
            echo "[sync] Site updated."
        else
            echo "[sync] Build failed, keeping previous version."
        fi
    fi
done
