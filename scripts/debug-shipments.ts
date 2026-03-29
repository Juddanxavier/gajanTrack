
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { internal } from "../convex/_generated/api";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_CONVEX_URL;
const adminKey = process.env.CONVEX_SELF_HOSTED_ADMIN_KEY;

if (!url || !adminKey) {
  console.error("Missing Convex URL or Admin Key in .env.local");
  process.exit(1);
}

const client = new ConvexHttpClient(url);

async function main() {
  console.log("Fetching all shipments from ALL organizations...");
  
  // Try to use internalListActive or similar internal function if it exists
  // but better to just use a query if available.
  
  const orgs = await client.query(api.organizations.listAllPublic);
  console.log(`Found ${orgs.length} organizations.`);

  for (const org of orgs) {
    const shipments = await client.query(api.shipments.listShipments, { 
      orgId: org.orgId, 
      includeArchived: true 
    }).catch(e => {
        return [];
    });
    
    if (shipments.length > 0) {
      console.log(`\nOrg: ${org.name} (${org.orgId})`);
      shipments.forEach((s: any) => {
        console.log(` - [${s.status}] ID: ${s._id}, Tracking: ${s.tracking_number}, WhiteLabel: ${s.white_label_code}`);
      });
    } else {
      console.log(`Org: ${org.name} (${org.orgId}) - 0 shipments`);
    }
  }
}

main().catch(console.error);
