import fs from "fs";
import path from "path";

const ROOT_DIR = "./"; // adjust if needed

function searchFiles(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      searchFiles(fullPath);
    } else if (fullPath.endsWith(".js")) {
      const content = fs.readFileSync(fullPath, "utf8");
      if (
        content.includes("app.use(") ||
        content.includes("router.use(") ||
        content.includes("process.env.CORS_ORIGIN")
      ) {
        if (
          content.match(/app\.use\(\s*process\.env\.CORS_ORIGIN/) ||
          content.match(/router\.use\(\s*process\.env\.CORS_ORIGIN/)
        ) {
          console.log(
            `\n⚠️ Found suspicious use of process.env.CORS_ORIGIN in route path at: ${fullPath}\n`
          );
        }
        if (
          content.match(/app\.use\(\s*['"`]https?:\/\//) ||
          content.match(/router\.use\(\s*['"`]https?:\/\//)
        ) {
          console.log(
            `\n⚠️ Found suspicious use of full URL as route path at: ${fullPath}\n`
          );
        }
      }
    }
  }
}

searchFiles(ROOT_DIR);
