"use client"

import {
  Label,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChartConfig, ChartContainer } from "@/components/ui/chart"

const chartConfig = {
  efficiency: {
    label: "Efficiency",
    color: "var(--chart-2)", // Emerald-ish
  },
} satisfies ChartConfig

export function EfficiencyRadial() {
  const chartData = [
    { name: "efficiency", value: 98.4, fill: "var(--color-efficiency)" },
  ]

  return (
    <Card className="flex flex-col border-border/40 bg-card/20 backdrop-blur-md rounded-2xl h-full">
      <CardHeader className="items-center pb-0">
        <CardTitle className="text-lg font-bold tracking-tight">System Pulse</CardTitle>
        <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-50">Global Network Efficiency</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <RadialBarChart
            data={chartData}
            startAngle={0}
            endAngle={250}
            innerRadius={80}
            outerRadius={110}
          >
            <PolarGrid
              gridType="circle"
              radialLines={false}
              stroke="none"
              className="first:fill-muted last:fill-background"
              polarRadius={[86, 74]}
            />
            <RadialBar dataKey="value" background cornerRadius={10} />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
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
                          className="fill-foreground text-4xl font-black font-mono tracking-tighter"
                        >
                          {chartData[0].value.toLocaleString()}%
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground text-[10px] font-bold uppercase tracking-widest"
                        >
                          Optimized
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
