"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

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
  total: {
    label: "Total Volume",
    color: "var(--primary)",
  },
  delivered: {
    label: "Delivered",
    color: "var(--chart-2)",
  },
  exception: {
    label: "Exceptions",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export function ChartAreaInteractive({ 
  data, 
  title = "Operational Velocity", 
  description = "Real-time shipment telemetry across the network",
  isLoading = false,
  sparkline = false
}: { 
  data: any[], 
  title?: string, 
  description?: string,
  isLoading?: boolean,
  sparkline?: boolean
}) {
  return (
    <Card className="border-border/40 bg-card/40 backdrop-blur-2xl shadow-xl rounded-2xl overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="grid gap-1">
          <CardTitle className="text-xl font-bold tracking-tight uppercase">{title}</CardTitle>
          <CardDescription className="text-xs font-medium uppercase tracking-widest text-muted-foreground/40">{description}</CardDescription>
        </div>
        <div className="flex items-center gap-6">
             <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Total volume</span>
                <span className="text-3xl font-black tracking-tighter tabular-nums">
                    {data?.reduce((acc, curr) => acc + (curr.total || 0), 0).toLocaleString()}
                </span>
             </div>
             <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--chart-2)]/60">Delivered</span>
                <span className="text-3xl font-black tracking-tighter tabular-nums text-[var(--chart-2)]">
                    {data?.reduce((acc, curr) => acc + (curr.delivered || 0), 0).toLocaleString()}
                </span>
             </div>
        </div>
      </CardHeader>

      <CardContent className={`pt-4 ${sparkline ? 'px-0 pb-0' : 'px-4 pb-4'}`}>
        <ChartContainer
          config={chartConfig}
          className={`${sparkline ? 'h-[350px]' : 'h-[300px]'} w-full`}
        >
          <AreaChart 
            data={data}
            margin={sparkline ? { left: 0, right: 0, top: 0, bottom: 0 } : {
              left: 12,
              right: 12,
              top: 10,
              bottom: 0
            }}
          >
            <defs>
              <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="fillDelivered" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="fillException" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.05}/>
                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            {!sparkline && <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />}
            {!sparkline && <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={12}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }}
              className="text-[10px] font-mono font-bold uppercase tracking-tighter opacity-40"
            />}
            <YAxis 
               hide 
               domain={['auto', 'auto']}
            />
            <ChartTooltip
              cursor={sparkline ? { stroke: 'var(--primary)', strokeWidth: 1, strokeDasharray: '4 4' } : { stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  className="bg-card/95 backdrop-blur-xl border-border/40 shadow-2xl rounded-xl font-mono text-[10px]"
                />
              }
            />
            <Area
              dataKey="total"
              type="natural"
              fill="url(#fillTotal)"
              stroke="var(--primary)"
              strokeWidth={sparkline ? 4 : 3}
              dot={false}
              activeDot={{ r: 4, fill: "var(--primary)", stroke: "white", strokeWidth: 1 }}
              connectNulls
              animationDuration={1500}
            />
            <Area
              dataKey="delivered"
              type="natural"
              fill="url(#fillDelivered)"
              stroke="var(--chart-2)"
              strokeWidth={sparkline ? 3 : 2}
              dot={false}
              activeDot={{ r: 4, fill: "var(--chart-2)", stroke: "white", strokeWidth: 1 }}
              connectNulls
              animationDuration={1500}
            />
            <Area
              dataKey="exception"
              type="natural"
              fill="url(#fillException)"
              stroke="var(--chart-1)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              activeDot={{ r: 4, fill: "var(--chart-1)", stroke: "white", strokeWidth: 1 }}
              connectNulls
              animationDuration={1500}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

