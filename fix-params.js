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

    // Replace the signature for API routes
    content = content.replace(
      /\{\s*params\s*\}\s*:\s*\{\s*params\s*:\s*\{\s*(id|slug)\s*:\s*string;?\s*\}\s*\}/g,
      "{ params }: { params: Promise<{ $1: string }> }"
    );
    
    // Replace usages of `params.id` with `(await params).id`
    content = content.replace(/params\.(id|slug)/g, "(await params).$1");
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log("Updated", filePath);
    }
  }
});
