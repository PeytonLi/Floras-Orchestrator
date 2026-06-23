import React from "react";
import type { BadgeVariant } from "./Badge";
import { Badge } from "./Badge";

export type StageStatus = "running" | "complete" | "error" | "idle";

const statusVariantMap: Record<StageStatus, BadgeVariant> = {
  running: "accent",
  complete: "success",
  error: "error",
  idle: "default",
};

export interface StatusBadgeProps {
  status: StageStatus;
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <Badge variant={statusVariantMap[status]}>
      {label ?? status.toUpperCase()}
    </Badge>
  );
}
