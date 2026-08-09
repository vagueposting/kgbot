# Build locally
npm run build

# Create temporary branch with only dist
git checkout --orphan temp-dist
git add dist/ -f
git commit -m "Deploy build $(date)"

# Force push to your dist branch
git push origin temp-dist:dist-branch --force

# Clean up
git checkout main
git branch -D temp-dist

echo "Deployed successfully :)"