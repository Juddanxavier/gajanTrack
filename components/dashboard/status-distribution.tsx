"use client"

import * as React from "react"
import { Cell, Label, Pie, PieChart } from "recharts"

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
  count: {
    label: "Shipments",
  },
  delivered: {
    label: "Delivered",
    color: "var(--chart-2)",
  },
  inTransit: {
    label: "In Transit",
    color: "var(--chart-3)",
  },
  pending: {
    label: "Pending",
    color: "var(--chart-4)",
  },
  exception: {
    label: "Exception",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

interface StatusDistributionProps {
  data: { status: string; count: number; fill: string }[];
}

export function StatusDistribution({ data }: StatusDistributionProps) {
  const totalShipments = React.useMemo(() => {
    return data.reduce((acc, curr) => acc + curr.count, 0)
  }, [data])

  return (
    <Card className="flex flex-col border-border/40 bg-card/20 backdrop-blur-md rounded-2xl h-full">
      <CardHeader className="items-center pb-0">
        <CardTitle className="text-lg font-bold tracking-tight">Status Pulse</CardTitle>
        <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-50">Operational Distribution</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-4">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[220px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={data}
              dataKey="count"
              nameKey="status"
              innerRadius={65}
              outerRadius={80}
              strokeWidth={2}
              stroke="rgba(0,0,0,0.2)"
              paddingAngle={5}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.fill} 
                  className="hover:opacity-80 transition-opacity cursor-pointer" 
                  style={{
                    filter: `drop-shadow(0 0 5px ${entry.fill}44)`
                  }}
                />
              ))}
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-black font-mono tracking-tighter"
                        >
                          {totalShipments.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground text-[10px] font-bold uppercase tracking-[0.2em]"
                        >
                          Units
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>

        {/* Dense Status Legend - Using direct color mapping to avoid variable inheritance issues */}
        <div className="grid grid-cols-2 gap-2 mt-4 px-2">
          {data.map((item, i) => {
            // Map capitalized status to config key (camelCase)
            const configKey = item.status.toLowerCase().replace(/\s(.)/g, (match, group) => group.toUpperCase()) as keyof typeof chartConfig;
            const color = (chartConfig[configKey] as any)?.color || item.fill;
            
            return (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/5 transition-colors hover:bg-white/10">
                <div className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <div className="flex flex-col min-w-0">
                   <span className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest truncate">{item.status}</span>
                   <span className="text-xs font-black font-mono">{item.count}</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  )
}
