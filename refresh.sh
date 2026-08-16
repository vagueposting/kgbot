#!/bin/bash
set -e

clear
echo "Cleaning local build..."
rm -rf dist

echo "Compiling TypeScript..."
npx tsc

# Prompt interactively for password without echoing characters
read -s -p "Enter SFTP Password: " SFTP_PASSWORD
echo ""

export SFTP_PASSWORD

echo "Uploading to server..."
node dist/deploy-sftp.js

echo "Updating Discord slash commands..."
node dist/wipe-commands.js
node dist/deploy-commands.js

echo "Done!"