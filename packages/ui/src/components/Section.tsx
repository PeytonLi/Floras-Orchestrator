import React from "react";
import { tokens } from "../tokens";

export interface SectionProps {
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export function Section({ title, subtitle, action, children }: SectionProps) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: tokens.space.sm,
        }}
      >
        <div>
          <div style={{ fontSize: tokens.font.md, fontWeight: 600, color: tokens.color.text }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: tokens.font.xs, color: tokens.color.textMuted, marginTop: 2 }}>
              {subtitle}
            </div>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
