#!/bin/bash

# 🔐 Encryption/Decryption Tool - Docker Launcher

echo "🔐 Encryption & Decryption Tool"
echo "================================"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running!"
    echo "Please start Docker Desktop"
    exit 1
fi

echo "✓ Docker is running"
echo ""

# Build the image
echo "📦 Building Docker image..."
docker build -t encryption-tool .

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo ""
echo "✓ Build successful!"
echo ""
echo "🚀 Starting container..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✓ Application running at: http://localhost:5000"
echo "✓ Press Ctrl+C to stop"
echo ""

# Run the container
docker run -p 5000:5000 -v $(pwd)/encryption.key:/app/encryption.key -it encryption-tool
