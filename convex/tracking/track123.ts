import { ITrackingProvider, TrackingResult, TrackingStatus, TrackingEvent } from "./types";

const API_KEY = process.env.TRACK123_API_KEY;
const BASE_URL = "https://api.track123.com/gateway/open-api/tk/v2";

export class Track123Provider implements ITrackingProvider {
  name = "track123" as const;

  private async request(endpoint: string, method: string = "POST", body?: any) {
    if (!API_KEY) {
      console.error("[Track123Provider] TRACK123_API_KEY is missing from process.env");
      throw new Error("TRACK123_API_KEY is not set");
    }

    console.log(`[Track123Provider] Requesting ${endpoint} (${method})...`);
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Api-Key": API_KEY,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    
    // Track123 v2 API typically returns 200 OK but uses a custom code in the body for errors
    if (!response.ok || (data.code !== 0 && data.code !== 200)) {
        throw new Error(`Track123 API error: ${data.msg || data.message || response.statusText}`);
    }
    return data;
  }

  async detectCarrier(trackingNumber: string): Promise<string | null> {
    try {
      if (!API_KEY) {
          console.warn("[Track123Provider] Skipping detection: TRACK123_API_KEY not set");
          return null;
      }
      
      const base = BASE_URL.replace('/v2', ''); 
      console.log(`[Track123Provider] Attempting carrier detection for ${trackingNumber}...`);
      
      const response = await fetch(`${base}/couriers/detect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Api-Key": API_KEY,
        },
        body: JSON.stringify({ tracking_number: trackingNumber }),
      });

      if (!response.ok) {
          const errText = await response.text();
          console.warn(`[Track123Provider] Detection Failed (${response.status}):`, errText);
          return null;
      }
      
      const data = await response.json();
      const detected = data.data?.[0]?.carrier_code || data.data?.[0]?.courierCode || null;
      console.log(`[Track123Provider] Detection result:`, detected);
      return detected;
    } catch (error) {
      console.warn("Track123 detect carrier error:", error);
      return null;
    }
  }

  async createTracking(trackingNumber: string, carrierCode?: string, metadata?: { origin_country?: string }): Promise<TrackingResult> {
    const carrier = carrierCode || (await this.detectCarrier(trackingNumber));
    if (!carrier) throw new Error("Could not detect carrier for Track123");

    // Documentation: Register trackings -> /track/import
    const data = await this.request("/track/import", "POST", {
      trackings: [
        {
          trackNo: trackingNumber,
          courierCode: carrier,
        }
      ]
    });

    // Import returns a task id or immediate result, but usually we need to rely on webhooks
    // or immediate query if supported. For consistency, we return a pending state.
    const resultData = data.data?.[0] || data.data?.success?.[0];
    
    if (resultData && resultData.trackInfo) {
       return this.normalize(resultData);
    }

    return {
        tracking_number: trackingNumber,
        carrier_code: carrier,
        status: "pending",
        events: [],
        raw_payload: JSON.stringify(data)
    };
  }

  async getTracking(trackingNumber: string, carrierCode: string): Promise<TrackingResult> {
    // Documentation: Get trackings -> /track/query
    const data = await this.request("/track/query", "POST", {
      trackNo: trackingNumber,
      courierCode: carrierCode,
    });
    
    const trackingData = data.data?.[0];
    if (!trackingData) throw new Error("Tracking not found on Track123");
    
    return this.normalize(trackingData);
  }

  async retrack(trackingNumber: string, carrierCode: string): Promise<boolean> {
      // Documentation: Retrack a package -> /track/retrack
      try {
        await this.request("/track/retrack", "POST", {
            trackNo: trackingNumber,
            courierCode: carrierCode,
        });
        return true;
      } catch (e) {
        console.error("Retrack failed:", e);
        return false;
      }
  }

  async deleteTracking(trackingNumber: string, carrierCode: string): Promise<boolean> {
       // Documentation: Delete a tracking -> /track/delete
       try {
        await this.request("/track/delete", "POST", {
            trackNo: trackingNumber,
            courierCode: carrierCode,
        });
        return true;
      } catch (e) {
        console.error("Delete failed:", e);
        return false;
      }
  }

  async getQuota(): Promise<null> {
    return null;
  }

  normalizeWebhook(payload: any): TrackingResult | TrackingResult[] {
    const data = Array.isArray(payload) ? payload : [payload];
    const results: TrackingResult[] = [];

    for (const item of data) {
      // Track123 webhooks have { tracking: { ... } } or are the data themselves
      const tracking = item.tracking || item;
      if (tracking && (tracking.trackNo || tracking.tracking_number || tracking.status)) {
        results.push(this.normalize(tracking));
      }
    }
    return results.length === 1 ? results[0] : results;
  }

  private normalize(data: any): TrackingResult {
    // Handles v2 Open API payload structure
    const statusStr = (data.deliveryStatus || data.status || "").toLowerCase();
    
    return {
      tracking_number: data.trackNo || data.tracking_number,
      carrier_code: data.courierCode || data.carrier_code,
      status: this.mapStatus(statusStr),
      estimated_delivery: data.predictDeliveryDate || data.estimated_delivery_date,
      events: (data.trackInfo || data.track_info || []).map((event: any) => ({
        status: String(event.status || event.checkpoint_status || "unknown"),
        message: String(event.statusDescription || event.StatusDescription || event.checkpoint_delivery_status || ""),
        location: String(event.location || event.Details || ""),
        occurred_at: this.parseEventTime(event.time || event.Date),
        raw_payload: JSON.stringify(event),
        metadata: {
            checkpoint_status: event.checkpoint_status || event.status,
            checkpoint_delivery_status: event.checkpoint_delivery_status,
        }
      })),
      raw_payload: JSON.stringify(data),
      provider_metadata: {
        deliveryStatus: data.deliveryStatus || data.status,
        originCountry: data.originCountry,
        destinationCountry: data.destinationCountry,
        lastUpdateTime: data.lastUpdateTime,
      }
    };
  }

  private mapStatus(status: string): TrackingStatus {
      const mapping: Record<string, TrackingStatus> = {
          'pending': 'pending',
          'notfound': 'pending',
          'transit': 'in_transit',
          'pickup': 'out_for_delivery',
          'delivered': 'delivered',
          'undelivered': 'failed_attempt',
          'exception': 'exception',
          'expired': 'expired'
      };
      return mapping[status] || 'pending';
  }

  private parseEventTime(timeStr?: string): number {
    if (!timeStr) return Date.now();
    let d = new Date(timeStr);
    if (isNaN(d.getTime())) {
        // Fallback for non-standard formats
        const isoLike = timeStr.replace(" ", "T");
        d = new Date(isoLike);
        if (isNaN(d.getTime())) {
            console.warn(`[Track123Provider] Failed to parse time: "${timeStr}", falling back to Date.now()`);
            return Date.now();
        }
    }
    return d.getTime();
  }
}
