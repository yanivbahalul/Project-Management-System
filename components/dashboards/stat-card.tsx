"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TONE_STYLES = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning",
  destructive: "bg-destructive/10 text-destructive",
  info: "bg-chart-5/10 text-chart-5",
} as const;

export type StatTone = keyof typeof TONE_STYLES;

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  sub?: string;
  icon: React.ElementType;
  tone?: StatTone;
}

export function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  tone = "primary",
}: StatCardProps) {
  return (
    <Card className="py-0 transition-shadow hover:shadow-md">
      <CardContent className="flex items-start gap-4 p-5">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            TONE_STYLES[tone]
          )}
          aria-hidden="true"
        >
          <Icon className="size-5" />
        </div>
        <div className="flex min-w-0 flex-col">
          <div
            className="text-2xl font-bold leading-tight tabular-nums"
            role="text"
          >
            {value}
          </div>
          <p className="text-sm font-medium text-foreground/85 truncate">
            {title}
          </p>
          {sub && (
            <p className="mt-0.5 text-xs text-muted-foreground truncate">
              {sub}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
