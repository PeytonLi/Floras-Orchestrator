/** Maps semantic names to CSS variable references.
 * Values must match the variables in apps/web/app/globals.css */
export const tokens = {
  color: {
    bg: "var(--bg)" as const,
    bgCard: "var(--bg-card)" as const,
    border: "var(--border)" as const,
    text: "var(--text)" as const,
    textSecondary: "var(--text-secondary)" as const,
    textMuted: "var(--text-muted)" as const,
    accent: "var(--accent)" as const,
    green: "var(--green)" as const,
    yellow: "var(--yellow)" as const,
    red: "var(--red)" as const,
  },
  radius: {
    sm: 6,
    md: 8,
    lg: 10,
    xl: 12,
  },
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  font: {
    xs: 11,
    sm: 12,
    md: 13,
    base: 14,
    lg: 15,
    xl: 18,
    xxl: 22,
  },
} as const;
