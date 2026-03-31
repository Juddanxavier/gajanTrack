"use client"

import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const chartConfig = {
  volume: {
    label: "Volume",
    color: "var(--chart-1)",
  },
  reliability: {
    label: "Reliability",
    color: "var(--chart-2)",
  },
  speed: {
    label: "Speed",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

interface RegionalRadarProps {
  data: { country: string; count: number }[];
}

export function RegionalRadar({ data }: RegionalRadarProps) {
  // Enhance data with mock metrics for radar visualization
  const radarData = data.slice(0, 5).map(item => ({
    country: item.country,
    volume: item.count,
    reliability: Math.floor(Math.random() * 40) + 60, // 60-100
    speed: Math.floor(Math.random() * 50) + 50, // 50-100
  }))

  return (
    <Card className="border-border/40 bg-card/20 backdrop-blur-md rounded-2xl h-full flex flex-col">
      <CardHeader className="items-center pb-4">
        <CardTitle className="text-lg font-bold tracking-tight">Regional Scorecard</CardTitle>
        <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-50">Operational Logistics Comparison</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-4">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[300px]"
        >
          <RadarChart data={radarData}>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <PolarGrid className="fill-[--color-muted] opacity-20" />
            <PolarAngleAxis 
              dataKey="country" 
              tick={{ fill: "currentColor", fontSize: 10, fontWeight: "bold", opacity: 0.5 }}
            />
            <Radar
              name="Volume"
              dataKey="volume"
              fill="var(--color-volume)"
              fillOpacity={0.6}
              stroke="var(--color-volume)"
              strokeWidth={2}
            />
            <Radar
              name="Reliability"
              dataKey="reliability"
              fill="var(--color-reliability)"
              fillOpacity={0.5}
              stroke="var(--color-reliability)"
              strokeWidth={2}
            />
            <Radar
              name="Speed"
              dataKey="speed"
              fill="var(--color-speed)"
              fillOpacity={0.4}
              stroke="var(--color-speed)"
              strokeWidth={2}
            />
          </RadarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

