import React from "react";
import { tokens } from "../tokens";

export type BadgeVariant = "default" | "success" | "warning" | "error" | "accent";

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  default: {
    background: `rgba(152,152,176,0.12)`,
    color: tokens.color.textSecondary,
    border: `1px solid ${tokens.color.border}`,
  },
  success: {
    background: `rgba(34,197,94,0.12)`,
    color: tokens.color.green,
    border: `1px solid ${tokens.color.green}`,
  },
  warning: {
    background: `rgba(251,191,36,0.12)`,
    color: tokens.color.yellow,
    border: `1px solid ${tokens.color.yellow}`,
  },
  error: {
    background: `rgba(239,68,68,0.12)`,
    color: tokens.color.red,
    border: `1px solid ${tokens.color.red}`,
  },
  accent: {
    background: `rgba(99,102,241,0.12)`,
    color: tokens.color.accent,
    border: `1px solid ${tokens.color.accent}`,
  },
};

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  style?: React.CSSProperties;
}

export function Badge({ children, variant = "default", style }: BadgeProps) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: `${tokens.space.xs}px ${tokens.space.md}px`,
        borderRadius: 20,
        fontSize: tokens.font.sm,
        fontWeight: 700,
        ...variantStyles[variant],
        ...style,
      }}
    >
      {children}
    </span>
  );
}
