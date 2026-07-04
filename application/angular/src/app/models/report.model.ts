export type WizardStep = 1 | 2;

export type ErrorKind = 'network' | 'server' | 'parse' | null;

// ── Mirrors backend ProblemSolverOutput (schemas.py) ──────────────────────────

export interface TrizSolution {
  principle_id: number;
  principle_name: string;
  solution_name: string;
  description: string;
}

export interface AlternativeSolution {
  solution_name: string;
  description: string;
}

export interface DecisionMatrixRow {
  solution_name: string;
  score_a: number;
  score_b: number;
  wsi: number;
  rank: number;
}

export interface DecisionMatrix {
  parameter_a: string;
  parameter_b: string;
  rows: DecisionMatrixRow[];
}

export interface SolveResult {
  triz_solutions: TrizSolution[];
  alternative_solutions: AlternativeSolution[];
  decision_matrix: DecisionMatrix;
  scoring_justifications: string[];
  master_evaluation_synthesis: string;
}

// ── Shape returned by the backend's POST /api/solve endpoint ─────────────────

export interface SolveResponse {
  id: string;
  problemDescription: string;
  /** JSON-stringified ProblemSolverOutput, built into markdown by backend */
  advice: string;
  /** Extracted TRIZ principle IDs (legacy field, may be empty) */
  principles: { id: number; name: string; description: string }[] | null;
  createdAt?: string;
}
