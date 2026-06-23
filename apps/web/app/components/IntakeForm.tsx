"use client";

import { useState } from "react";
import type { IntakeForm } from "@floras/shared";

// Local copies of the controlled vocab so this client component never
// pulls the server-only shared barrel (neo4j-driver) into the bundle.
// These mirror packages/shared/src/kb/schema.ts.
const CERTIFICATES = [
  "Gold Standard",
  "REDD+",
  "Verra-VCS",
  "CCB",
  "ACR",
  "CAR",
  "Plan Vivo",
];
const IMPACT_FOCUS = ["Biodiversity", "Community benefits", "Soil health"];
const PROJECT_TYPES = ["Forestry", "Renewables", "Carbon capture"];

export function emptyIntakeForm(): IntakeForm {
  return {
    geographicRegions: [],
    requiredCertificates: [],
    impactFocus: [],
    projectTypes: [],
  };
}

interface Props {
  value: IntakeForm;
  onChange: (v: IntakeForm) => void;
}

const labelStyle: React.CSSProperties = {
  fontSize: "0.72rem",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--color-text-muted)",
  marginBottom: 6,
  display: "block",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  color: "var(--color-text)",
  fontSize: "0.875rem",
  outline: "none",
  fontFamily: "inherit",
};

export function IntakeFormSection({ value, onChange }: Props) {
  const [regionsText, setRegionsText] = useState(
    value.geographicRegions.join(", "),
  );

  const toggle = (
    field: "requiredCertificates" | "impactFocus" | "projectTypes",
    item: string,
  ) => {
    const set = new Set(value[field]);
    if (set.has(item)) set.delete(item);
    else set.add(item);
    onChange({ ...value, [field]: Array.from(set) });
  };

  const chip = (
    field: "requiredCertificates" | "impactFocus" | "projectTypes",
    item: string,
  ) => {
    const active = value[field].includes(item);
    return (
      <button
        key={item}
        type="button"
        onClick={() => toggle(field, item)}
        style={{
          padding: "5px 12px",
          borderRadius: 999,
          fontSize: 12,
          cursor: "pointer",
          border: active
            ? "1px solid var(--color-leaf)"
            : "1px solid var(--color-border)",
          background: active ? "var(--color-surface-sage)" : "transparent",
          color: active ? "var(--color-forest)" : "var(--color-text-muted)",
          fontFamily: "inherit",
        }}
      >
        {item}
      </button>
    );
  };

  const group = (
    title: string,
    field: "requiredCertificates" | "impactFocus" | "projectTypes",
    options: string[],
  ) => (
    <div>
      <label style={labelStyle}>{title}</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {options.map((o) => chip(field, o))}
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <label style={labelStyle}>Geographic regions</label>
        <input
          type="text"
          value={regionsText}
          placeholder="e.g. Europe, U.S., South America"
          onChange={(e) => {
            setRegionsText(e.target.value);
            onChange({
              ...value,
              geographicRegions: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            });
          }}
          style={inputStyle}
        />
      </div>

      {group("Required certificates", "requiredCertificates", CERTIFICATES)}
      {group("Impact focus", "impactFocus", IMPACT_FOCUS)}
      {group("Project types", "projectTypes", PROJECT_TYPES)}

      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Budget</label>
          <input
            type="number"
            min={0}
            placeholder="e.g. 10000"
            value={value.budget ?? ""}
            onChange={(e) =>
              onChange({
                ...value,
                budget: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            style={inputStyle}
          />
        </div>
        <div style={{ width: 110 }}>
          <label style={labelStyle}>Currency</label>
          <select
            value={value.budgetCurrency ?? "EUR"}
            onChange={(e) =>
              onChange({
                ...value,
                budgetCurrency: e.target.value as "EUR" | "USD",
              })
            }
            style={inputStyle}
          >
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>CO₂ target (tonnes)</label>
          <input
            type="number"
            min={0}
            placeholder="e.g. 500"
            value={value.co2TargetTonnes ?? ""}
            onChange={(e) =>
              onChange({
                ...value,
                co2TargetTonnes: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              })
            }
            style={inputStyle}
          />
        </div>
      </div>
    </div>
  );
}
