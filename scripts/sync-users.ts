import { ConvexHttpClient } from "convex/browser";
import * as fs from "fs";
import * as path from "path";

// More robust .env.local parser
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error(".env.local not found at", envPath);
    return;
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
      process.env[key] = value.replace(/^["']|["']$/g, ''); // Remove surrounding quotes
    }
  });
}

loadEnv();

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const clerkSecretKey = process.env.CLERK_SECRET_KEY;

if (!convexUrl || !clerkSecretKey) {
  console.error("Missing environment variables in .env.local");
  console.log("Current CONVEX_URL:", convexUrl);
  console.log("Current CLERK_SECRET_KEY set?", !!clerkSecretKey);
  process.exit(1);
}

console.log("Using Convex URL:", convexUrl);
console.log("Using Clerk Secret Key (starts with):", clerkSecretKey.substring(0, 10) + "...");

const convex = new ConvexHttpClient(convexUrl);

async function syncUsers() {
  console.log("Fetching users from Clerk...");
  try {
    const response = await fetch("https://api.clerk.com/v1/users", {
      headers: {
        Authorization: `Bearer ${clerkSecretKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Status: ${response.status}`);
      console.error(`Failed to fetch users from Clerk: ${errorText}`);
      process.exit(1);
    }

    const clerkUsers = (await response.json()) as any[];
    console.log(`Found ${clerkUsers.length} users in Clerk. Syncing to Convex...`);

    let syncedCount = 0;
    for (const clerkUser of clerkUsers) {
      const email = clerkUser.email_addresses[0]?.email_address;
      const name = `${clerkUser.first_name || ""} ${clerkUser.last_name || ""}`.trim();

      if (email) {
        try {
          await (convex as any).mutation("users:syncUser", {
            externalId: clerkUser.id,
            email,
            name: name || undefined,
            avatarUrl: clerkUser.image_url || undefined,
          });
          console.log(`Synced: ${email} (${clerkUser.id})`);
          syncedCount++;
        } catch (err) {
          console.error(`Failed to sync ${email}:`, err);
        }
      } else {
        console.log(`Skipping user ${clerkUser.id} (no email)`);
      }
    }

    console.log(`Done! Synced ${syncedCount} users.`);
  } catch (err) {
    console.error("Network or other error:", err);
  }
}

syncUsers().catch(console.error);
