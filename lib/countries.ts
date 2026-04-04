export interface CountryConfig {
  name: string;
  prefix: string;
  iso: string;
  placeholder: string;
}

export const COUNTRIES: Record<string, CountryConfig> = {
  india: {
    name: "India",
    prefix: "+91",
    iso: "IN",
    placeholder: "+91 99999 99999",
  },
  srilanka: {
    name: "Sri Lanka",
    prefix: "+94",
    iso: "LK",
    placeholder: "+94 77 123 4567",
  },
};

export function getCountryConfig(countryName?: string): CountryConfig {
  if (!countryName) return COUNTRIES.india;
  
  const normalized = countryName.toLowerCase().replace(/\s/g, "");
  return COUNTRIES[normalized] || COUNTRIES.india;
}
