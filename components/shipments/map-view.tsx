'use client';

import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';
import { Loader2, Globe, MapPin, Navigation } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface MapViewProps {
  orgId: string;
  sessionId?: string;
}

// Simple mapping for common country name variations
const countryNameMap: Record<string, string> = {
  "USA": "United States of America",
  "UK": "United Kingdom",
  "UAE": "United Arab Emirates",
};

export function MapView({ orgId, sessionId }: MapViewProps) {
  const analytics = useQuery(api.shipments.getDetailedAnalytics, { orgId, sessionId });

  if (analytics === undefined) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Mapping global manifests...</p>
      </div>
    );
  }

  const { countryData } = analytics;

  // Find max value for color scaling
  const maxShipments = Math.max(...countryData.map(c => c.value), 1);

  const colorScale = scaleLinear<string>()
    .domain([0, maxShipments])
    .range(["#f1f5f9", "#7c3aed"]); // From slate-100 to primary (violet-600)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real SVG Map Card */}
        <Card className="lg:col-span-2 border-border/40 bg-card/60 backdrop-blur-xl overflow-hidden relative">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Global Distribution
            </CardTitle>
            <CardDescription>Live geographic distribution of your shipments</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px] relative p-0">
             <div className="w-full h-full bg-slate-50/50 dark:bg-slate-950/20">
                <ComposableMap 
                   projectionConfig={{ scale: 140 }} 
                   style={{ width: "100%", height: "100%" }}
                >
                  <ZoomableGroup center={[20, 10]}>
                    <Geographies geography={geoUrl}>
                      {({ geographies }: { geographies: any[] }) =>
                        geographies.map((geo: any) => {
                          const countryName = geo.properties.name;
                          // Check for matches in our data (including mapped variations)
                          const dataPoint = countryData.find(c => 
                             c.name === countryName || 
                             countryNameMap[c.name] === countryName
                          );
                          
                          return (
                            <TooltipProvider key={geo.rsmKey}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Geography
                                            geography={geo}
                                            fill={dataPoint ? colorScale(dataPoint.value) : "#f1f5f9"}
                                            stroke="#e2e8f0"
                                            strokeWidth={0.5}
                                            style={{
                                                default: { outline: "none" },
                                                hover: { fill: "#7c3aed", outline: "none", cursor: "pointer" },
                                                pressed: { fill: "#5b21b6", outline: "none" },
                                            }}
                                        />
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-card border-border shadow-xl">
                                        <p className="font-semibold">{countryName}</p>
                                        <p className="text-xs text-muted-foreground">
                                           {dataPoint ? `${dataPoint.value} Active Shipments` : "No active shipments"}
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                          );
                        })
                      }
                    </Geographies>
                  </ZoomableGroup>
                </ComposableMap>
             </div>
          </CardContent>
          
          <div className="absolute bottom-4 left-4 flex items-center gap-2 text-[10px] font-mono uppercase text-muted-foreground/50">
             <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
             Live Tracking Engine Active
          </div>
          <div className="absolute bottom-4 right-4 flex items-center gap-2 px-2 py-1 bg-background/50 backdrop-blur-md border border-border/40 rounded text-[10px] text-muted-foreground">
             <span className="h-2 w-2 bg-[#f1f5f9] border border-slate-200 rounded-sm" /> Low
             <span className="h-2 w-2 bg-[#7c3aed] rounded-sm ml-2" /> High
          </div>
        </Card>

        {/* Top 5 Locations List */}
        <Card className="border-border/40 bg-card/60 backdrop-blur-xl">
          <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <Navigation className="h-5 w-5 text-primary" />
               Key Logistics Hubs
             </CardTitle>
             <CardDescription>Most active origin jurisdictions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
               {countryData.slice(0, 5).map((hub, idx) => (
                 <div key={idx} className="flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                       <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                          <MapPin className="h-4 w-4 text-primary" />
                       </div>
                       <div>
                          <p className="font-semibold text-sm tracking-tight">{hub.name}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-semibold">{hub.value} Shipments</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <div className="h-1.5 w-24 bg-primary/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary" 
                            style={{ width: `${(hub.value / maxShipments) * 100}%` }}
                          />
                       </div>
                    </div>
                 </div>
               ))}
               
               {countryData.length === 0 && (
                 <div className="text-center py-10">
                    <p className="text-sm text-muted-foreground">No geographic data available yet.</p>
                 </div>
               )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
