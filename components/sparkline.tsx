"use client"

import { Line, LineChart } from "recharts"
import { ChartContainer, ChartConfig } from "@/components/ui/chart"

interface SparklineProps {
  data: { count: number }[]
  color?: string
}

export function Sparkline({ data, color = "hsl(var(--primary))" }: SparklineProps) {
  const chartConfig = {
    count: {
      label: "Count",
      color: color,
    },
  } satisfies ChartConfig

  return (
    <ChartContainer config={chartConfig} className="h-full w-full">
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="count"
          stroke="var(--color-count)"
          strokeWidth={4}
          dot={false}
          strokeLinecap="round"
          style={{
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
          }}
          isAnimationActive={false}
        />
      </LineChart>
    </ChartContainer>
  )
}

