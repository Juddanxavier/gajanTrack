import { TrackingMoreProvider } from "./trackingmore";
import { Track123Provider } from "./track123";
import { Track17Provider } from "./track17";
import { TrackingResult, ITrackingProvider } from "./types";

export const trackingMore = new TrackingMoreProvider();
export const track123 = new Track123Provider();
export const track17 = new Track17Provider();

export class TrackingAdapter {
  private providers: ITrackingProvider[];

  constructor(providers: ITrackingProvider[]) {
    this.providers = providers;
  }

  async addTracking(
    trackingNumber: string, 
    carrierCode?: string, 
    preferredProvider?: "trackingmore" | "track123" | "track17",
    metadata?: { origin_country?: string }
  ): Promise<TrackingResult & { provider: "trackingmore" | "track123" | "track17" }> {
    let lastError: any = null;
    
    // Create an ordered list of providers based on preference
    let providersToTry = [...this.providers];
    if (preferredProvider) {
      const preferred = this.providers.find(p => p.name === preferredProvider);
      if (preferred) {
        providersToTry = [preferred, ...this.providers.filter(p => p.name !== preferredProvider)];
      }
    }

    for (const provider of providersToTry) {
      try {
        const result = await provider.createTracking(trackingNumber, carrierCode, metadata);
        return { ...result, provider: provider.name as any };
      } catch (error) {
        console.warn(`${provider.name} failed, trying next provider:`, error);
        lastError = error;
      }
    }
    throw lastError || new Error(`No tracking provider could initialize tracking for number: ${trackingNumber}`);
  }

  async refreshTracking(trackingNumber: string, carrierCode: string, providerName: "trackingmore" | "track123" | "track17"): Promise<TrackingResult> {
    const primaryProvider = this.providers.find(p => p.name === providerName);
    const otherProviders = this.providers.filter(p => p.name !== providerName);
    
    // 1. Try Primary
    if (primaryProvider) {
      try {
        return await primaryProvider.getTracking(trackingNumber, carrierCode);
      } catch (error) {
        console.warn(`Primary provider ${providerName} refresh failed for ${trackingNumber}, attempting failover...`, error);
      }
    }

    // 2. Try Failover
    for (const provider of otherProviders) {
      try {
        const result = await provider.getTracking(trackingNumber, carrierCode);
        console.log(`Failover success: Fetched ${trackingNumber} from ${provider.name} instead of ${providerName}`);
        return result;
      } catch (error) {
        console.warn(`Failover provider ${provider.name} also failed for ${trackingNumber}`);
      }
    }

    throw new Error(`All providers failed to refresh tracking for ${trackingNumber}`);
  }

  async detectCarrier(trackingNumber: string): Promise<{ carrierCode: string; provider: "trackingmore" | "track123" | "track17" } | null> {
    for (const provider of this.providers) {
      try {
        const carrierCode = await provider.detectCarrier(trackingNumber);
        if (carrierCode) return { carrierCode, provider: provider.name as any };
      } catch (error) {
        console.warn(`${provider.name} carrier detection failed:`, error);
      }
    }
    return null;
  }

  async retrack(trackingNumber: string, carrierCode: string, providerName: "trackingmore" | "track123" | "track17"): Promise<boolean> {
      const provider = this.providers.find(p => p.name === providerName);
      if (!provider) throw new Error(`Provider ${providerName} not found`);
      return await provider.retrack(trackingNumber, carrierCode);
  }

  async deleteTracking(trackingNumber: string, carrierCode: string, providerName: "trackingmore" | "track123" | "track17"): Promise<boolean> {
      const provider = this.providers.find(p => p.name === providerName);
      if (!provider) throw new Error(`Provider ${providerName} not found`);
      return await provider.deleteTracking(trackingNumber, carrierCode);
  }

  async getQuota(providerName: "trackingmore" | "track123" | "track17"): Promise<any> {
    const provider = this.providers.find(p => p.name === providerName);
    if (!provider) throw new Error(`Provider ${providerName} not found`);
    return await provider.getQuota();
  }
}

// Default configuration based on PRIMARY_TRACKING_PROVIDER env var.
// Valid values: "track17" | "track123" | "trackingmore"
const primaryProviderName = process.env.PRIMARY_TRACKING_PROVIDER || "track17";

// Determine order based on primary choice
let providers: ITrackingProvider[] = [];
if (primaryProviderName === "trackingmore") {
  providers = [trackingMore, track17, track123];
} else if (primaryProviderName === "track123") {
  providers = [track123, track17, trackingMore];
} else {
  providers = [track17, track123, trackingMore];
}

export const trackingAdapter = new TrackingAdapter(providers);

// Backward compatibility exports (deprecated, should use trackingAdapter directly)
export const addTracking = (num: string, carrier?: string) => trackingAdapter.addTracking(num, carrier);
export const refreshTracking = (num: string, carrier: string, provider: any) => trackingAdapter.refreshTracking(num, carrier, provider);
export const detectCarrier = (num: string) => trackingAdapter.detectCarrier(num);
