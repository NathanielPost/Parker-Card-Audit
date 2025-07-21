#!/bin/bash

# Build script for Render deployment
echo "🔧 Setting up build environment..."

# Fix permissions for node_modules binaries
echo "📝 Setting permissions for node executables..."
chmod +x node_modules/.bin/* 2>/dev/null || true

# Try different approaches to run vite build
echo "🏗️ Building project..."

if [ -x "node_modules/.bin/vite" ]; then
    echo "✅ Using direct vite binary"
    ./node_modules/.bin/vite build
elif command -v npx >/dev/null 2>&1; then
    echo "✅ Using npx vite"
    npx vite build
elif [ -f "node_modules/.bin/vite" ]; then
    echo "✅ Using node to run vite"
    node node_modules/.bin/vite build
else
    echo "❌ Could not find vite, trying alternative..."
    node -e "require('vite/dist/node/index.js').build()"
fi

echo "✅ Build completed!"
