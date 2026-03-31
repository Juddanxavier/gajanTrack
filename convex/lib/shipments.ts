import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";

/**
 * Helper to generate the next white label code for a shipment.
 */
export async function getNextWhiteLabelCode(ctx: QueryCtx | MutationCtx, country: string) {
  const prefix = country.toLowerCase() === "india" ? "GT" : "LM";
  let isUnique = false;
  let code = "";
  
  while (!isUnique) {
    const randomPart = Math.floor(10000000 + Math.random() * 90000000).toString();
    code = `${prefix}${randomPart}`;
    
    const existing = await ctx.db
      .query("shipments")
      .withIndex("by_white_label_code", (q) => q.eq("white_label_code", code))
      .unique();
      
    if (!existing) {
      isUnique = true;
    }
  }
  
  return code;
}

/**
 * Helper to enrich a shipment with its human-readable carrier name.
 */
export async function enrichShipmentWithCarrierName(ctx: QueryCtx | MutationCtx, shipment: Doc<"shipments"> | null) {
    if (!shipment) return null;
    let carrier_name = shipment.carrier_code;
    
    if (shipment.provider === "track17" && !isNaN(Number(shipment.carrier_code))) {
        const carrier = await ctx.db
            .query("carriers")
            .withIndex("by_key", (q) => q.eq("key", Number(shipment.carrier_code)))
            .unique();
        if (carrier) carrier_name = carrier.name;
    }
    
    return { ...shipment, carrier_name };
}
