// ============================================================
// Project Catalog Knowledge Base — types + controlled vocab
//
// These option lists mirror the Project Advisory intake form
// (Team 3). Keeping them as single-source constants means the UI
// dropdowns, the Zod validation, and the Neo4j seed all agree.
// ============================================================

/** Carbon credit certification standards (intake: "required certificates") */
export const CERTIFICATES = [
  "Gold Standard",
  "REDD+",
  "Verra-VCS",
  "CCB",
  "ACR",
  "CAR",
  "Plan Vivo",
] as const;
export type Certificate = (typeof CERTIFICATES)[number];

/** Impact focus areas (intake: "impact focus") */
export const IMPACT_FOCUS = [
  "Biodiversity",
  "Community benefits",
  "Soil health",
] as const;
export type ImpactFocus = (typeof IMPACT_FOCUS)[number];

/** Project types (intake: "project types") */
export const PROJECT_TYPES = [
  "Forestry",
  "Renewables",
  "Carbon capture",
] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

/** Geographic regions (intake: "geographic regions") */
export const REGIONS = [
  "Europe",
  "U.S.",
  "South America",
  "Africa",
  "Asia",
  "Global",
] as const;
export type Region = (typeof REGIONS)[number];

export type BudgetCurrency = "EUR" | "USD";

/** A Floras climate project in the catalog */
export interface Project {
  id: string;
  name: string;
  description: string;
  projectType: string;
  certificates: string[];
  regions: string[];
  impactFocus: string[];
  pricePerTonneEUR: number;
  capacityTonnes: number;
  vintage: number;
}

/**
 * Structured customer intake (the attached form). All multiselect
 * fields default to empty (= no constraint on that dimension).
 */
export interface IntakeForm {
  geographicRegions: string[];
  requiredCertificates: string[];
  impactFocus: string[];
  projectTypes: string[];
  budget?: number;
  budgetCurrency?: BudgetCurrency;
  co2TargetTonnes?: number;
}

/** A single scoring dimension behind a project match */
export interface MatchFactor {
  name: string;
  /** 0–1 normalized score for this dimension */
  score: number;
  /** relative weight in the overall match score */
  weight: number;
  detail: string;
}

/** A ranked project recommendation with an explainable breakdown */
export interface ProjectMatch {
  project: Project;
  /** 0–100 overall match score */
  matchScore: number;
  factors: MatchFactor[];
  /** one-line human summary of why this project fits */
  explanation: string;
}

/** Fixed FX assumption for cross-currency budget comparison (demo) */
export const USD_TO_EUR = 0.92;

/** An empty intake = no constraints (used when no form was submitted) */
export function emptyIntake(): IntakeForm {
  return {
    geographicRegions: [],
    requiredCertificates: [],
    impactFocus: [],
    projectTypes: [],
  };
}
