import React from "react";
import { tokens } from "../tokens";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
}

const sizeStyles: Record<string, React.CSSProperties> = {
  sm: { padding: `${tokens.space.xs}px ${tokens.space.md}px`, fontSize: tokens.font.xs },
  md: { padding: `${tokens.space.sm}px ${tokens.space.lg}px`, fontSize: tokens.font.md },
  lg: { padding: `10px ${tokens.space.xl}px`, fontSize: tokens.font.md },
};

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: tokens.color.accent,
    color: "#fff",
    border: "none",
  },
  secondary: {
    background: "transparent",
    color: tokens.color.text,
    border: `1px solid ${tokens.color.border}`,
  },
  ghost: {
    background: "transparent",
    color: tokens.color.accent,
    border: "none",
  },
  danger: {
    background: "rgba(239,68,68,0.12)",
    color: tokens.color.red,
    border: `1px solid ${tokens.color.red}`,
  },
};

export function Button({ variant = "primary", size = "md", style, disabled, children, ...rest }: ButtonProps) {
  return (
    <button
      disabled={disabled}
      style={{
        borderRadius: tokens.radius.md,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        whiteSpace: "nowrap" as const,
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
