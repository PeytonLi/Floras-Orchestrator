import React from "react";
import { tokens } from "../tokens";

export interface CardProps {
  children: React.ReactNode;
  padding?: number;
  style?: React.CSSProperties;
}

export function Card({ children, padding = tokens.space.lg, style }: CardProps) {
  return (
    <div
      style={{
        background: tokens.color.bgCard,
        border: `1px solid ${tokens.color.border}`,
        borderRadius: tokens.radius.lg,
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
