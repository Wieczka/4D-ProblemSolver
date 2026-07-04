export type WizardStep = 1 | 2;

export interface TrizParameter {
  code: string;      // e.g. "TRIZ-14"
  name: string;       // e.g. "Strength"
  description: string;
}

export interface InventivePrinciple {
  number: number;
  name: string;
  rationale: string;
}

export interface Contradiction {
  improving: TrizParameter;
  worsening: TrizParameter;
  principles: InventivePrinciple[];
}

export interface PerformanceTargets {
  compostDays: number | null;
  bioContentPct: number | null;
  costDeltaPct: number | null;
}

export interface PackagingReport {
  problemText: string;
  contradiction: Contradiction;
  conceptName: string;
  conceptDescription: string;
  targets: PerformanceTargets;
  nextSteps: string[];
}
