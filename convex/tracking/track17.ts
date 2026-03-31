import { ITrackingProvider, TrackingResult, TrackingStatus, TrackingEvent } from "./types";

const TRACK17_API_KEY = process.env.TRACK17_API_KEY;
const BASE_URL = "https://api.17track.net/track/v2.4";

/**
 * Adapter for 17track API v2.4
 * Documentation: https://api.17track.net/en/doc
 */
export class Track17Provider implements ITrackingProvider {
  name = "track17" as const;

  private async request(endpoint: string, method: string = "POST", body?: any) {
    console.log(`[Track17Provider] Requesting ${endpoint} (${method})...`);
    console.log(`[Track17Provider] Headers:`, { "Content-Type": "application/json", "17token": TRACK17_API_KEY ? "REDACTED" : "MISSING" });
    if (body) console.log(`[Track17Provider] Body:`, JSON.stringify(body));

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "17token": TRACK17_API_KEY as string,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseText = await response.text();
    console.log(`[Track17Provider] RAW Response (${response.status}):`, responseText);
    
    let data;
    try {
        data = JSON.parse(responseText);
    } catch (e) {
        throw new Error(`17track API returned invalid JSON: ${responseText.slice(0, 100)}`);
    }
    
    // 17track returns 0 for success in their custom code field
    if (!response.ok || (data.code !== 0)) {
        console.error(`[Track17Provider] API Error:`, data);
        const errorMsg = data.msg || data.message || response.statusText;
        throw new Error(`1track API error: ${errorMsg} (Code: ${data.code})`);
    }
    return data;
  }

  async detectCarrier(trackingNumber: string): Promise<string | null> {
    // 17track v2.4 does not have a standalone detect endpoint.
    // Detection happens automatically during registration (/register).
    return null;
  }

  async createTracking(tracking_number: string, carrierCode?: string, metadata?: { origin_country?: string }): Promise<TrackingResult> {
    console.log(`[Track17Provider] createTracking for ${tracking_number} (Carrier: ${carrierCode || "not specified"})`);
    
    // 1. If carrier is missing, try to detect it first (17track registration is much more reliable with a carrier)
    let finalCarrier: any = carrierCode;
    if (!finalCarrier || finalCarrier === "auto") {
        console.log(`[Track17Provider] Carrier missing, attempting detection...`);
        const detected = await this.detectCarrier(tracking_number);
        if (detected) {
            console.log(`[Track17Provider] Detected carrier: ${detected}`);
            finalCarrier = detected;
        }
    }

    // 2. Register the tracking number
    const regPayload: any = { number: tracking_number };
    if (finalCarrier && finalCarrier !== "auto") {
        // Ensure carrier is a number if it looks like one (v2.4 specification)
        regPayload.carrier = isNaN(Number(finalCarrier)) ? undefined : Number(finalCarrier);
    }
    
    if (metadata?.origin_country) {
        regPayload.origin_country = metadata.origin_country;
    }

    const regResult = await this.request("/register", "POST", [regPayload]);
    console.log(`[Track17Provider] Registration result:`, JSON.stringify(regResult));
    
    // Check if it was rejected
    if (regResult.data?.rejected?.length > 0) {
        const rejection = regResult.data.rejected[0];
        console.error(`[Track17Provider] Registration REJECTED for ${tracking_number}:`, JSON.stringify(rejection));
        
        // Handle common error -18019903 (Carrier cannot be detected)
        if (rejection.error?.code === -18019903) {
            throw new Error(`17track registration rejected: Carrier cannot be detected (-18019903). Number: ${tracking_number}`);
        }
        
        throw new Error(`17track registration rejected: ${rejection.error?.message || rejection.error?.msg || "Unknown error"} (Code: ${rejection.error?.code})`);
    }

    if (!regResult.data?.accepted || regResult.data.accepted.length === 0) {
        console.warn(`[Track17Provider] Registration returned no accepted nor rejected?`, JSON.stringify(regResult));
    } else {
        console.log(`[Track17Provider] Registration ACCEPTED for ${tracking_number}`);
    }

    console.log(`[Track17Provider] Registration successful, waiting for indexing...`);
    // 3. Small delay to let 17track process the brand new registration
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 4. Fetch the tracking info
    return await this.getTracking(tracking_number, finalCarrier || "auto");
  }

  async getTracking(trackingNumber: string, carrierCode: string): Promise<TrackingResult> {
    const payload: any = { number: trackingNumber };
    if (carrierCode && carrierCode !== "auto") {
        payload.carrier = isNaN(Number(carrierCode)) ? undefined : Number(carrierCode);
    }

    const data = await this.request("/gettrackinfo", "POST", [payload]);
    
    const trackingData = data.data?.accepted?.[0] || data.data?.[0];
    
    // 17track returns track_info as null if the number is registered but no data has been fetched yet
    if (!trackingData || trackingData.track_info === null) {
        console.log(`[Track17Provider] Info for ${trackingNumber} is not yet available (Status: Registered, but Pending data)`);
        return {
            tracking_number: trackingNumber,
            carrier_code: String(carrierCode),
            status: "pending",
            events: [],
            raw_payload: JSON.stringify(data)
        };
    }
    
    return this.normalize(trackingData);
  }

  async retrack(trackingNumber: string, carrierCode: string): Promise<boolean> {
      console.log(`[Track17Provider] retrack (change-carrier) for ${trackingNumber} to ${carrierCode}`);
      return await this.changeCarrier(trackingNumber, carrierCode);
  }

  async changeCarrier(trackingNumber: string, newCarrierCode: string): Promise<boolean> {
    const payload = {
      number: trackingNumber,
      carrier: isNaN(Number(newCarrierCode)) ? undefined : Number(newCarrierCode)
    };
    
    try {
      const result = await this.request("/changecarrier", "POST", [payload]);
      console.log(`[Track17Provider] Change carrier result for ${trackingNumber}:`, JSON.stringify(result));
      return result.code === 0;
    } catch (error) {
      console.error(`[Track17Provider] Failed to change carrier for ${trackingNumber}:`, error);
      return false;
    }
  }

  async deleteTracking(trackingNumber: string, carrierCode: string): Promise<boolean> {
       // Stop tracking / archive could be used here if needed
       return true;
  }

  async getQuota(): Promise<{ total: number; used: number; remaining: number } | null> {
    if (!TRACK17_API_KEY) {
        console.error("[Track17Provider] TRACK17_API_KEY is missing in process.env");
        return null;
    }
    try {
        console.log("[Track17Provider] Fetching quota info with token:", TRACK17_API_KEY.slice(0, 4) + "...");
        const data = await this.request("/getquota", "POST", {});
        console.log("[Track17Provider] Quota response data:", JSON.stringify(data.data));
        return {
            total: data.data?.quota_total ?? 0,
            used: data.data?.quota_used ?? 0,
            remaining: data.data?.quota_remain ?? 0
        };
    } catch (error) {
        console.error("[Track17Provider] Failed to fetch quota:", error);
        return null;
    }
  }

  normalizeWebhook(payload: any): TrackingResult | TrackingResult[] {
    const items = Array.isArray(payload) ? payload : [payload];
    const results: TrackingResult[] = [];

    for (const item of items) {
      // 17track webhooks typically have { event: string, data: { number: string, track_info: ... } }
      const data = item.data || item;
      if (data && (data.track_info || data.number)) {
        results.push(this.normalize(data));
      }
    }

    return results.length === 1 ? results[0] : results;
  }

  private normalize(data: any): TrackingResult {
    const trackInfo = data.track_info;
    const latestStatus = trackInfo?.latest_status || {};
    
    // 17track v2.4 tracking details can be in several places.
    // We collect all of them and filter out any duplicates.
    const allProvidersEvents = trackInfo?.tracking?.providers?.flatMap((p: any) => p.events || []) || [];
    const allDetails = [
        ...(trackInfo?.tracking_details || []),
        ...(trackInfo?.origin_info?.tracking_details || []),
        ...(trackInfo?.destination_info?.tracking_details || []),
        ...(trackInfo?.origin_info?.track_details || []),
        ...(trackInfo?.destination_info?.track_details || []),
        ...allProvidersEvents,
        ...(trackInfo?.milestone || []), // Summary events
        ...(data.tracking_details || []),
        ...(data.track_details || []),
        ...(data.events || []),
        ...(data.checkpoints || []),
    ];

    // Deduplicate by normalized time and description
    const uniqueEventsMap = new Map();
    for (const detail of allDetails) {
        if (!detail) continue;
        const timeStr = String(detail.time_iso || detail.time_utc || detail.time || detail.Date || detail.checkpoint_time || "");
        const desc = String(detail.description || detail.message || detail.StatusDescription || detail.checkpoint_status || detail.key_stage || "");
        
        // Normalize time for the key to avoid minor format differences causing duplicates
        const normalizedTime = this.parseEventTime(timeStr);
        const key = `${normalizedTime}-${desc.trim().toLowerCase()}`;
        
        if (timeStr && desc && !uniqueEventsMap.has(key)) {
            uniqueEventsMap.set(key, detail);
        }
    }

    const events = Array.from(uniqueEventsMap.values()).map((event: any) => ({
        status: String(event.status || event.checkpoint_status || event.stage || event.key_stage || "unknown"),
        message: String(event.description || event.message || event.StatusDescription || "Status update"),
        location: String(event.location || event.Details || event.checkpoint_location || ""),
        occurred_at: this.parseEventTime(event.time_iso || event.time_utc || event.time || event.Date || event.checkpoint_time),
        raw_payload: JSON.stringify(event),
        metadata: {
            original_status: event.status,
            stage: event.stage,
            key_stage: event.key_stage
        }
    }));

    // Sort events by time descending (latest first)
    events.sort((a, b) => b.occurred_at - a.occurred_at);

    return {
      tracking_number: data.number || data.tracking_number,
      carrier_code: String(data.carrier || data.carrier_code || "unknown"),
      status: this.mapStatus(latestStatus.status),
      estimated_delivery: this.formatEstimatedDelivery(trackInfo?.time_metrics?.estimated_delivery_date),
      events,
      raw_payload: JSON.stringify(data),
      provider_metadata: {
        latest_status: latestStatus,
        time_metrics: trackInfo?.time_metrics,
        service_type: trackInfo?.service_type,
        origin_country: trackInfo?.origin_country,
        destination_country: trackInfo?.destination_country,
      }
    };
  }

  private mapStatus(status: number | string): TrackingStatus {
    const s = String(status).toLowerCase();
    
    // 17track Statuses (v2.4 handles strings and some legacy numbers)
    // Strings: NotFound, InfoReceived, InTransit, Expired, AvailableForPickup, OutForDelivery, DeliveryFailure, Delivered, Exception
    // Numbers: 0 (NotFound), 10 (InTransit), 20 (OutForDelivery), 30 (Delivered), 35 (FailedAttempt), 40 (Exception), 50 (Expired)

    if (s === "notfound" || s === "0") return "pending";
    if (s === "in_transit" || s === "intransit" || s === "10") return "in_transit";
    if (s === "outfordelivery" || s === "out_for_delivery" || s === "availableforpickup" || s === "20") return "out_for_delivery";
    if (s === "delivered" || s === "30") return "delivered";
    if (s === "deliveryfailure" || s === "failed_attempt" || s === "35") return "failed_attempt";
    if (s === "exception" || s === "40") return "exception";
    if (s === "expired" || s === "50") return "expired";
    if (s === "inforeceived" || s === "info_received") return "info_received";

    console.warn(`[Track17Provider] Unmapped status: ${status}, defaulting to pending`);
    return "pending";
  }

  private parseEventTime(timeStr?: string): number {
    if (!timeStr) return Date.now();
    
    // Try parsing as-is (works for ISO strings like those in the FedEx log)
    let d = new Date(timeStr);
    
    if (isNaN(d.getTime())) {
        // Fallback 1: 17track format is typically "YYYY-MM-DD HH:mm"
        // Try adding T for ISO if it's a simple space separator
        const isoLike = timeStr.replace(" ", "T");
        d = new Date(isoLike);
        
        if (isNaN(d.getTime())) {
            // Fallback 2: Try stripping any timezone info if present or adding seconds
            const simple = timeStr.split(/[+-]/)[0].trim();
            d = new Date(simple);
            
            if (isNaN(d.getTime())) {
                console.warn(`[Track17Provider] Failed to parse time: "${timeStr}", falling back to Date.now()`);
                return Date.now();
            }
        }
    }
    
    const time = d.getTime();
    return isNaN(time) ? Date.now() : time;
  }

  private formatEstimatedDelivery(ed: any): string | undefined {
    if (!ed) return undefined;
    if (typeof ed === "string") return ed;
    if (typeof ed === "object") {
        if (ed.to) return String(ed.to);
        if (ed.from) return String(ed.from);
        // Fallback if all keys are null (like the user log showed)
        if (ed.from === null && ed.to === null) return undefined;
        return JSON.stringify(ed);
    }
    return String(ed);
  }
}
