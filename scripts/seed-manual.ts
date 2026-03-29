import { ConvexHttpClient } from "convex/browser";
import * as fs from "fs";
import * as path from "path";

// Load environment variables from .env.local
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error(".env.local not found");
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, "utf-8");
  content.split(/\r?\n/).forEach(line => {
    line = line.trim();
    if (!line || line.startsWith("#")) return;
    const firstEquals = line.indexOf("=");
    if (firstEquals === -1) return;
    const key = line.substring(0, firstEquals).trim();
    const value = line.substring(firstEquals + 1).trim();
    if (key && value) {
      process.env[key] = value.replace(/^["']|["']$/g, '');
    }
  });
}

loadEnv();

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const adminKey = process.env.CONVEX_SELF_HOSTED_ADMIN_KEY;

if (!convexUrl || !adminKey) {
  console.error("Missing NEXT_PUBLIC_CONVEX_URL or CONVEX_SELF_HOSTED_ADMIN_KEY in .env.local");
  process.exit(1);
}

const convex = new ConvexHttpClient(convexUrl, { auth: adminKey });

async function runSeed() {
  console.log("Testing existing mutation users:syncUser...");
  try {
    const testResult = await (convex as any).mutation("users:syncUser", {
        externalId: "test-id",
        email: "test@example.com",
        name: "Test User"
    });
    console.log("Existing mutation test result:", testResult);

    console.log("Calling seedUser:seed mutation...");
    const result = await (convex as any).mutation("seedUser:seed");
    console.log("Result:", result);
  } catch (err) {
    console.error("Error during execution:", err);
  }
}

runSeed().catch(console.error);
