"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from "recharts"

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
    label: "Volume",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

interface CarrierBarsProps {
  data: { name: string; count: number }[];
}

export function CarrierBars({ data }: CarrierBarsProps) {
  const barData = data.slice(0, 5);
  const colors = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
  ];

  return (
    <Card className="border-border/40 bg-card/20 backdrop-blur-md rounded-2xl h-full flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-bold tracking-tight">Carrier Performance</CardTitle>
        <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-50">Volume Distribution by Provider</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-4">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-video h-[250px] w-full"
        >
          <BarChart data={barData}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="name"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tick={{ fill: "currentColor", fontSize: 10, fontWeight: "bold", opacity: 0.5 }}
              tickFormatter={(value) => value.length > 8 ? `${value.slice(0, 8)}...` : value}
            />
            <YAxis hide domain={[0, 'auto']} />
            <ChartTooltip
              cursor={{ fill: "rgba(255,255,255,0.05)" }}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar
              dataKey="count"
              radius={[4, 4, 0, 0]}
              strokeWidth={2}
            >
               {barData.map((_, index) => (
                 <Cell key={`cell-${index}`} fill={colors[index % colors.length]} fillOpacity={0.8} />
               ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
