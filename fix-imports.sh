#!/bin/bash

# Script to add .js extensions to relative imports in TypeScript files
# This is required for ES modules with Node16 module resolution

echo "🔧 Adding .js extensions to imports in api directory..."

# Find all .ts files in api directory and add .js to relative imports
find api -name "*.ts" -type f | while read -r file; do
  echo "Processing: $file"

  # Add .js to ANY relative import (starting with ./ or ../) that doesn't already have .js
  # This catches all patterns: './file', '../file', './dir/file', '../../dir/file', etc.

  # Single quotes - match any relative path without .js extension
  sed -i '' "s|from '\(\.\./[^']*\)'|from '\1.js'|g" "$file"
  sed -i '' "s|from '\(\./[^']*\)'|from '\1.js'|g" "$file"

  # Double quotes - match any relative path without .js extension
  sed -i '' 's|from "\(\.\./[^"]*\)"|from "\1.js"|g' "$file"
  sed -i '' 's|from "\(\./[^"]*\)"|from "\1.js"|g' "$file"

  # Fix double .js.js if it was already there
  sed -i '' 's|\.js\.js|.js|g' "$file"
done

echo "✅ Done! All imports updated."

