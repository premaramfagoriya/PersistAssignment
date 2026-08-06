const fs = require("fs");
const path = require("path");

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

const appDir = path.join(__dirname, "app");
walkDir(appDir, (filePath) => {
  if (filePath.endsWith(".ts") || filePath.endsWith(".tsx")) {
    let content = fs.readFileSync(filePath, "utf8");
    let originalContent = content;

    // Undo previous bad replacements
    content = content.replace(/\(await params\)\.(id|slug)/g, "params.$1");
    content = content.replace(
      /\{\s*params\s*\}\s*:\s*\{\s*params\s*:\s*Promise<\{\s*(id|slug)\s*:\s*string;?\s*\}>\s*\}/g,
      "{ params }: { params: { $1: string } }"
    );

    // Apply new pattern
    let match;
    const regex = /export\s+(?:default\s+)?(?:async\s+)?function\s+\w+\s*\([^)]*\{\s*params\s*\}\s*:\s*\{\s*params\s*:\s*\{\s*(id|slug)\s*:\s*string;?\s*\}\s*\}\s*\)\s*\{/g;
    
    while ((match = regex.exec(originalContent)) !== null) {
      const matchString = match[0];
      const paramName = match[1]; // 'id' or 'slug'
      
      // Replace `{ params }: { params: { id: string } }` with `context: { params: Promise<{ id: string }> }`
      const newSignature = matchString.replace(
        /\{\s*params\s*\}\s*:\s*\{\s*params\s*:\s*\{\s*(id|slug)\s*:\s*string;?\s*\}\s*\}/,
        `context: { params: Promise<{ $1: string }> }`
      );
      
      // Insert `const params = await context.params;`
      const newMatchString = newSignature + `\n  const params = await context.params;`;
      
      content = content.replace(matchString, newMatchString);
    }
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log("Updated", filePath);
    }
  }
});
