#!/bin/bash
npx tsc
echo "Nuking all commands..."
node dist/wipe-commands.js
echo "Deploying fresh commands..."
node dist/deploy-commands.js
echo "Done! Commands will reflect upon bot activation."