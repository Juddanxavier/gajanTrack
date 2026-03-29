export type TrackingStatus = 
  | "pending" 
  | "info_received" 
  | "in_transit" 
  | "out_for_delivery" 
  | "delivered" 
  | "failed_attempt" 
  | "exception" 
  | "expired";

export interface TrackingEvent {
  status: string;
  sub_status?: string;
  message: string;
  location?: string;
  occurred_at: number;
  raw_payload: string;
  metadata?: any;
}

export interface QuotaInfo {
  total: number;
  used: number;
  remaining: number;
}

export interface TrackingResult {
  tracking_number: string;
  carrier_code: string;
  status: TrackingStatus;
  estimated_delivery?: string;
  events: TrackingEvent[];
  raw_payload: string;
  provider_metadata?: any;
}

export interface ITrackingProvider {
  name: "trackingmore" | "track123" | "track17";
  detectCarrier(trackingNumber: string): Promise<string | null>;
  createTracking(trackingNumber: string, carrierCode?: string, metadata?: { origin_country?: string }): Promise<TrackingResult>;
  getTracking(trackingNumber: string, carrierCode: string): Promise<TrackingResult>;
  retrack(trackingNumber: string, carrierCode: string): Promise<boolean>;
  deleteTracking(trackingNumber: string, carrierCode: string): Promise<boolean>;
  getQuota(): Promise<QuotaInfo | null>;
  normalizeWebhook(payload: any): TrackingResult | TrackingResult[];
}
