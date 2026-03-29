import { ITrackingProvider, TrackingResult, TrackingStatus, TrackingEvent } from "./types";

const API_KEY = process.env.TRACKINGMORE_API_KEY;
const BASE_URL = "https://api.trackingmore.com/v4";

export class TrackingMoreProvider implements ITrackingProvider {
  name = "trackingmore" as const;

  private async request(endpoint: string, method: string = "GET", body?: any) {
    if (!API_KEY) throw new Error("TRACKINGMORE_API_KEY is not set");
    
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Tracking-Api-Key": API_KEY,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`TrackingMore API error: ${data.message || response.statusText}`);
    }
    return data;
  }

  async detectCarrier(trackingNumber: string): Promise<string | null> {
    try {
      if (!API_KEY || API_KEY.includes("your_trackingmore_api_key")) {
          console.warn("[TrackingMoreProvider] Skipping detection: TRACKINGMORE_API_KEY not set");
          return null;
      }

      console.log(`[TrackingMoreProvider] Attempting carrier detection for ${trackingNumber}...`);
      const data = await this.request("/carriers/detect", "POST", {
        tracking_number: trackingNumber,
      });
      const detected = data.data?.[0]?.carrier_code || null;
      console.log(`[TrackingMoreProvider] Detection result:`, detected);
      return detected;
    } catch (error) {
      console.error("TrackingMore detect carrier error:", error);
      return null;
    }
  }

  async createTracking(trackingNumber: string, carrierCode?: string, metadata?: { origin_country?: string }): Promise<TrackingResult> {
    const carrier = carrierCode || (await this.detectCarrier(trackingNumber));
    if (!carrier) throw new Error("Could not detect carrier for TrackingMore");

    const data = await this.request("/trackings/create", "POST", {
      tracking_number: trackingNumber,
      carrier_code: carrier,
    });

    return this.normalize(data.data);
  }

  async getTracking(trackingNumber: string, carrierCode: string): Promise<TrackingResult> {
    const data = await this.request(`/trackings/get?tracking_numbers=${trackingNumber}&carrier_code=${carrierCode}`, "GET");
    // TrackingMore returns an array for bulk get, but we just want the first one
    const trackingData = data.data?.[0];
    if (!trackingData) throw new Error("Tracking not found on TrackingMore");
    return this.normalize(trackingData);
  }

  async retrack(trackingNumber: string, carrierCode: string): Promise<boolean> {
      try {
          await this.request("/trackings/retrack", "POST", {
              tracking_number: trackingNumber,
              carrier_code: carrierCode
          });
          return true;
      } catch (e) {
          console.error("TrackingMore retrack failed:", e);
          return false;
      }
  }

  async deleteTracking(trackingNumber: string, carrierCode: string): Promise<boolean> {
      try {
          await this.request("/trackings/delete", "POST", {
              tracking_number: trackingNumber,
              carrier_code: carrierCode
          });
          return true;
      } catch (e) {
          console.error("TrackingMore delete failed:", e);
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
      // TrackingMore webhooks have { data: { ... } } or are the data themselves
      const tracking = item.data || item;
      if (tracking && (tracking.tracking_number || tracking.delivery_status)) {
        results.push(this.normalize(tracking));
      }
    }
    return results.length === 1 ? results[0] : results;
  }

  private normalize(data: any): TrackingResult {
    return {
      tracking_number: data.tracking_number,
      carrier_code: data.carrier_code,
      status: this.mapStatus(data.delivery_status),
      estimated_delivery: data.scheduled_delivery_date,
      events: (data.origin_info?.trackinfo || []).map((event: any) => ({
        status: String(event.checkpoint_status || "unknown"),
        message: String(event.StatusDescription || ""),
        location: String(event.Details || ""),
        occurred_at: this.parseEventTime(event.Date),
        raw_payload: JSON.stringify(event),
        metadata: {
            checkpoint_status: event.checkpoint_status,
            item_location: event.item_location,
        }
      })),
      raw_payload: JSON.stringify(data),
      provider_metadata: {
        delivery_status: data.delivery_status,
        original_carrier_code: data.original_carrier_code,
        destination_code: data.destination_code,
        tracking_stop: data.tracking_stop,
        tracking_update: data.tracking_update,
      }
    };
  }

  private mapStatus(deliveryStatus: string): TrackingStatus {
    const mapping: Record<string, TrackingStatus> = {
      pending: "pending",
      notfound: "pending",
      transit: "in_transit",
      pickup: "out_for_delivery",
      delivered: "delivered",
      undelivered: "failed_attempt",
      exception: "exception",
      expired: "expired",
    };
    return mapping[deliveryStatus] || "pending";
  }

  private parseEventTime(timeStr?: string): number {
    if (!timeStr) return Date.now();
    let d = new Date(timeStr);
    if (isNaN(d.getTime())) {
        const isoLike = timeStr.replace(" ", "T");
        d = new Date(isoLike);
        if (isNaN(d.getTime())) {
            console.warn(`[TrackingMoreProvider] Failed to parse time: "${timeStr}", falling back to Date.now()`);
            return Date.now();
        }
    }
    return d.getTime();
  }
}
