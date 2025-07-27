#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function fixSharedImports(directory) {
  const items = fs.readdirSync(directory);
  
  for (const item of items) {
    const fullPath = path.join(directory, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      fixSharedImports(fullPath);
    } else if (item.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Fix @shared imports to relative paths
      content = content.replace(
        /require\("@shared\/types\/access-control"\)/g,
        (match, offset) => {
          // Calculate relative path from current file to shared/types/access-control
          const relativePath = path.relative(
            path.dirname(fullPath),
            path.join(__dirname, 'lib', 'shared', 'types', 'access-control')
          );
          return `require("${relativePath}")`;
        }
      );
      
      fs.writeFileSync(fullPath, content);
    }
  }
}

console.log('Fixing @shared imports in compiled JavaScript files...');
fixSharedImports(path.join(__dirname, 'lib'));
console.log('✅ Fixed @shared imports');
