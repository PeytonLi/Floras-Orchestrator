import type { PipelineRun, LogEntry } from "@floras/shared";

const now = new Date();
const minsAgo = (m: number) => new Date(now.getTime() - m * 60_000).toISOString();

export const DEMO_RUN: PipelineRun = {
  "id": "demo_run_001",
  "stage": "complete",
  "previousStage": "presenting",
  "createdAt": "2026-06-09T16:35:58.031Z",
  "updatedAt": "2026-06-09T16:38:58.031Z",
  "input": {
    "prompt": "Find leads in the food & beverage sector with strong sustainability commitments"
  },
  "error": null,
  "agents": {
    "sales-intel": {
      "agentId": "sales-intel",
      "status": "done",
      "startedAt": "2026-06-09T16:36:28.031Z",
      "completedAt": "2026-06-09T16:36:46.031Z",
      "error": null,
      "output": {
        "leads": [
          {
            "id": "lead_1",
            "companyName": "GreenBrew Coffee Co.",
            "sector": "Food & Beverage",
            "signals": [
              "Published sustainability report 2025",
              "Joined SBTi commitment"
            ],
            "source": "LinkedIn + News",
            "discoveredAt": "2026-06-09T16:36:40.031Z"
          },
          {
            "id": "lead_2",
            "companyName": "Nordic Freight Solutions",
            "sector": "Logistics",
            "signals": [
              "Fleet electrification announcement",
              "Carbon-neutral by 2030 pledge"
            ],
            "source": "Press release",
            "discoveredAt": "2026-06-09T16:36:40.031Z"
          },
          {
            "id": "lead_3",
            "companyName": "BioTech Materials AG",
            "sector": "Manufacturing",
            "signals": [
              "Supply chain audit completed",
              "EU taxonomy compliance noted"
            ],
            "source": "Industry report",
            "discoveredAt": "2026-06-09T16:36:40.031Z"
          }
        ],
        "qualifications": [
          {
            "leadId": "lead_1",
            "score": 87,
            "explanation": "Strong sustainability commitment with active supply chain engagement.",
            "factors": [
              {
                "name": "Sustainability commitment",
                "weight": 0.3,
                "value": 90,
                "detail": "SBTi member with published report"
              },
              {
                "name": "Industry fit",
                "weight": 0.25,
                "value": 85,
                "detail": "Food & beverage fits core Floras territory"
              },
              {
                "name": "Company size",
                "weight": 0.2,
                "value": 80,
                "detail": "Mid-market"
              },
              {
                "name": "Recent signals",
                "weight": 0.25,
                "value": 92,
                "detail": "Multiple recent public commitments"
              }
            ]
          },
          {
            "leadId": "lead_2",
            "score": 72,
            "explanation": "Clear carbon reduction goals but indirect supply chain relevance.",
            "factors": [
              {
                "name": "Sustainability commitment",
                "weight": 0.3,
                "value": 78,
                "detail": "Carbon-neutral pledge"
              },
              {
                "name": "Industry fit",
                "weight": 0.25,
                "value": 70,
                "detail": "Indirect supply chain relevance"
              },
              {
                "name": "Company size",
                "weight": 0.2,
                "value": 65,
                "detail": "Smaller regional player"
              },
              {
                "name": "Recent signals",
                "weight": 0.25,
                "value": 75,
                "detail": "Fleet electrification"
              }
            ]
          },
          {
            "leadId": "lead_3",
            "score": 64,
            "explanation": "Compliance-driven sustainability. Regulatory pressure creates opportunity.",
            "factors": [
              {
                "name": "Sustainability commitment",
                "weight": 0.3,
                "value": 60,
                "detail": "Compliance-driven"
              },
              {
                "name": "Industry fit",
                "weight": 0.25,
                "value": 75,
                "detail": "Manufacturing supply chains align"
              },
              {
                "name": "Company size",
                "weight": 0.2,
                "value": 70,
                "detail": "Enterprise-scale"
              },
              {
                "name": "Recent signals",
                "weight": 0.25,
                "value": 55,
                "detail": "Audit completed"
              }
            ]
          }
        ]
      }
    },
    "project-advisor": {
      "agentId": "project-advisor",
      "status": "done",
      "startedAt": "2026-06-09T16:37:34.031Z",
      "completedAt": "2026-06-09T16:37:52.031Z",
      "error": null,
      "output": {
        "recommendations": [
          {
            "leadId": "lead_1",
            "projectId": "proj_reforest_01",
            "projectName": "Borneo Reforestation Initiative",
            "matchScore": 93,
            "rationale": "Directly offsets agricultural supply chain emissions."
          },
          {
            "leadId": "lead_1",
            "projectId": "proj_regen_02",
            "projectName": "European Regenerative Agriculture",
            "matchScore": 91,
            "rationale": "Reduces scope 3 through soil carbon sequestration."
          },
          {
            "leadId": "lead_2",
            "projectId": "proj_wind_01",
            "projectName": "North Sea Wind Farm Credits",
            "matchScore": 79,
            "rationale": "Clean energy offsets fleet consumption during transition."
          },
          {
            "leadId": "lead_2",
            "projectId": "proj_mangrove_02",
            "projectName": "Coastal Mangrove Restoration",
            "matchScore": 76,
            "rationale": "Blue carbon project with high sequestration rates."
          },
          {
            "leadId": "lead_3",
            "projectId": "proj_dac_01",
            "projectName": "Direct Air Capture - Iceland",
            "matchScore": 70,
            "rationale": "High-permanence removal for hard-to-abate industrial emissions."
          }
        ]
      }
    },
    "co2-estimator": {
      "agentId": "co2-estimator",
      "status": "done",
      "startedAt": "2026-06-09T16:37:04.031Z",
      "completedAt": "2026-06-09T16:37:22.031Z",
      "error": null,
      "output": {
        "estimates": [
          {
            "leadId": "lead_1",
            "totalKgCO2": 80500,
            "confidence": "medium",
            "assumptions": [
              "Mid-market company (100-500 employees)",
              "European operations with average grid mix"
            ],
            "lineItems": [
              {
                "description": "Raw material sourcing",
                "category": "Scope 3 - Upstream",
                "kgCO2": 45000,
                "source": "DEFRA 2024 emission factors"
              },
              {
                "description": "Processing & packaging",
                "category": "Scope 1 - Direct",
                "kgCO2": 18000,
                "source": "Industry benchmark (GHG Protocol)"
              },
              {
                "description": "Distribution & logistics",
                "category": "Scope 3 - Downstream",
                "kgCO2": 12000,
                "source": "EcoInvent database"
              },
              {
                "description": "Office & facilities",
                "category": "Scope 2 - Energy",
                "kgCO2": 5500,
                "source": "Grid emission factor (EU avg)"
              }
            ]
          },
          {
            "leadId": "lead_2",
            "totalKgCO2": 142000,
            "confidence": "low",
            "assumptions": [
              "Mixed diesel/electric fleet assumed",
              "Regional operations (< 1000km average haul)"
            ],
            "lineItems": [
              {
                "description": "Fleet fuel consumption",
                "category": "Scope 1 - Direct",
                "kgCO2": 85000,
                "source": "Fleet size estimate x avg km/year"
              },
              {
                "description": "Warehouse energy",
                "category": "Scope 2 - Energy",
                "kgCO2": 22000,
                "source": "Warehouse m2 x energy intensity"
              },
              {
                "description": "Subcontracted transport",
                "category": "Scope 3 - Upstream",
                "kgCO2": 35000,
                "source": "Industry average outsourcing ratio"
              }
            ]
          },
          {
            "leadId": "lead_3",
            "totalKgCO2": 251000,
            "confidence": "low",
            "assumptions": [
              "Heavy industry process emissions",
              "EU manufacturing energy mix assumed"
            ],
            "lineItems": [
              {
                "description": "Industrial processes",
                "category": "Scope 1 - Direct",
                "kgCO2": 120000,
                "source": "Sector average per revenue unit"
              },
              {
                "description": "Purchased electricity",
                "category": "Scope 2 - Energy",
                "kgCO2": 55000,
                "source": "Grid factor x estimated consumption"
              },
              {
                "description": "Raw materials",
                "category": "Scope 3 - Upstream",
                "kgCO2": 68000,
                "source": "Material intensity benchmarks"
              },
              {
                "description": "Waste treatment",
                "category": "Scope 3 - Downstream",
                "kgCO2": 8000,
                "source": "EU waste treatment averages"
              }
            ]
          }
        ]
      }
    },
    "design-system": {
      "agentId": "design-system",
      "status": "done",
      "startedAt": "2026-06-09T16:38:10.031Z",
      "completedAt": "2026-06-09T16:38:40.031Z",
      "error": null,
      "output": {
        "artifacts": [
          {
            "id": "artifact_pres_001",
            "type": "presentation",
            "fileName": "Floras_Proposal_GreenBrew_Coffee_Co.pptx",
            "createdAt": "2026-06-09T16:38:22.031Z",
            "agentId": "design-system"
          },
          {
            "id": "artifact_email_001",
            "type": "email",
            "fileName": "Floras_Outreach_GreenBrew_Coffee_Co.html",
            "createdAt": "2026-06-09T16:38:28.031Z",
            "agentId": "design-system"
          },
          {
            "id": "artifact_onepager_001",
            "type": "one_pager",
            "fileName": "Floras_Impact_Summary_GreenBrew_Coffee_Co.pdf",
            "createdAt": "2026-06-09T16:38:34.031Z",
            "agentId": "design-system"
          }
        ]
      }
    }
  },
  "agentConfigs": {
    "sales-intel": {
      "maxRetries": 2,
      "backoffMs": 1000,
      "timeoutMs": 30000
    },
    "project-advisor": {
      "maxRetries": 2,
      "backoffMs": 1000,
      "timeoutMs": 30000
    },
    "co2-estimator": {
      "maxRetries": 2,
      "backoffMs": 1000,
      "timeoutMs": 30000
    },
    "design-system": {
      "maxRetries": 2,
      "backoffMs": 1000,
      "timeoutMs": 30000
    }
  }
};

export const DEMO_LOGS: LogEntry[] = [
  {
    "id": "log_01",
    "runId": "demo_run_001",
    "agentId": null,
    "level": "info",
    "message": "Pipeline run created with prompt: Find leads in the food & beverage sector...",
    "timestamp": "2026-06-09T16:35:58.031Z"
  },
  {
    "id": "log_02",
    "runId": "demo_run_001",
    "agentId": null,
    "level": "info",
    "message": "Starting stage: discovering",
    "timestamp": "2026-06-09T16:36:10.031Z"
  },
  {
    "id": "log_03",
    "runId": "demo_run_001",
    "agentId": "sales-intel",
    "level": "info",
    "message": "Starting Sales Intelligence",
    "timestamp": "2026-06-09T16:36:28.031Z"
  },
  {
    "id": "log_04",
    "runId": "demo_run_001",
    "agentId": "sales-intel",
    "level": "info",
    "message": "Searching for leads based on prompt",
    "timestamp": "2026-06-09T16:36:34.031Z"
  },
  {
    "id": "log_05",
    "runId": "demo_run_001",
    "agentId": "sales-intel",
    "level": "info",
    "message": "Found 3 potential leads",
    "timestamp": "2026-06-09T16:36:40.031Z"
  },
  {
    "id": "log_06",
    "runId": "demo_run_001",
    "agentId": "sales-intel",
    "level": "info",
    "message": "Scoring leads against qualification criteria",
    "timestamp": "2026-06-09T16:36:43.031Z"
  },
  {
    "id": "log_07",
    "runId": "demo_run_001",
    "agentId": "sales-intel",
    "level": "info",
    "message": "Qualified 3 leads. Top score: 87 (GreenBrew Coffee Co.)",
    "timestamp": "2026-06-09T16:36:44.831Z"
  },
  {
    "id": "log_08",
    "runId": "demo_run_001",
    "agentId": "sales-intel",
    "level": "info",
    "message": "Sales Intelligence completed successfully",
    "timestamp": "2026-06-09T16:36:46.031Z"
  },
  {
    "id": "log_09",
    "runId": "demo_run_001",
    "agentId": null,
    "level": "info",
    "message": "Stage discovering complete - transitioning to qualifying",
    "timestamp": "2026-06-09T16:36:49.031Z"
  },
  {
    "id": "log_10",
    "runId": "demo_run_001",
    "agentId": null,
    "level": "info",
    "message": "Qualification complete. Top lead: GreenBrew Coffee Co. (87). Awaiting human approval.",
    "timestamp": "2026-06-09T16:36:52.031Z"
  },
  {
    "id": "log_11",
    "runId": "demo_run_001",
    "agentId": null,
    "level": "info",
    "message": "Human gate approved - proceeding to CO2 estimation",
    "timestamp": "2026-06-09T16:36:58.031Z"
  },
  {
    "id": "log_12",
    "runId": "demo_run_001",
    "agentId": "co2-estimator",
    "level": "info",
    "message": "Starting CO2 Estimator",
    "timestamp": "2026-06-09T16:37:04.031Z"
  },
  {
    "id": "log_13",
    "runId": "demo_run_001",
    "agentId": "co2-estimator",
    "level": "info",
    "message": "Estimating footprint for GreenBrew Coffee Co. (Food & Beverage)",
    "timestamp": "2026-06-09T16:37:07.031Z"
  },
  {
    "id": "log_14",
    "runId": "demo_run_001",
    "agentId": "co2-estimator",
    "level": "info",
    "message": "Estimating footprint for Nordic Freight Solutions (Logistics)",
    "timestamp": "2026-06-09T16:37:13.031Z"
  },
  {
    "id": "log_15",
    "runId": "demo_run_001",
    "agentId": "co2-estimator",
    "level": "info",
    "message": "Estimating footprint for BioTech Materials AG (Manufacturing)",
    "timestamp": "2026-06-09T16:37:19.031Z"
  },
  {
    "id": "log_16",
    "runId": "demo_run_001",
    "agentId": "co2-estimator",
    "level": "info",
    "message": "Completed estimates for 3 leads",
    "timestamp": "2026-06-09T16:37:22.031Z"
  },
  {
    "id": "log_17",
    "runId": "demo_run_001",
    "agentId": null,
    "level": "info",
    "message": "Stage estimating complete - transitioning to recommending",
    "timestamp": "2026-06-09T16:37:28.031Z"
  },
  {
    "id": "log_18",
    "runId": "demo_run_001",
    "agentId": "project-advisor",
    "level": "info",
    "message": "Starting Project Advisor",
    "timestamp": "2026-06-09T16:37:34.031Z"
  },
  {
    "id": "log_19",
    "runId": "demo_run_001",
    "agentId": "project-advisor",
    "level": "info",
    "message": "Matching projects for GreenBrew Coffee Co.",
    "timestamp": "2026-06-09T16:37:40.031Z"
  },
  {
    "id": "log_20",
    "runId": "demo_run_001",
    "agentId": "project-advisor",
    "level": "info",
    "message": "Matching projects for Nordic Freight Solutions",
    "timestamp": "2026-06-09T16:37:46.031Z"
  },
  {
    "id": "log_21",
    "runId": "demo_run_001",
    "agentId": "project-advisor",
    "level": "info",
    "message": "Generated 5 project recommendations",
    "timestamp": "2026-06-09T16:37:52.031Z"
  },
  {
    "id": "log_22",
    "runId": "demo_run_001",
    "agentId": null,
    "level": "info",
    "message": "Stage recommending complete - transitioning to presenting",
    "timestamp": "2026-06-09T16:37:58.031Z"
  },
  {
    "id": "log_23",
    "runId": "demo_run_001",
    "agentId": "design-system",
    "level": "info",
    "message": "Starting Design System",
    "timestamp": "2026-06-09T16:38:10.031Z"
  },
  {
    "id": "log_24",
    "runId": "demo_run_001",
    "agentId": "design-system",
    "level": "info",
    "message": "Building sales presentation for GreenBrew Coffee Co.",
    "timestamp": "2026-06-09T16:38:22.031Z"
  },
  {
    "id": "log_25",
    "runId": "demo_run_001",
    "agentId": "design-system",
    "level": "info",
    "message": "Generated 3 branded assets",
    "timestamp": "2026-06-09T16:38:40.031Z"
  },
  {
    "id": "log_26",
    "runId": "demo_run_001",
    "agentId": null,
    "level": "info",
    "message": "Pipeline complete - all stages finished successfully",
    "timestamp": "2026-06-09T16:38:58.031Z"
  }
];
