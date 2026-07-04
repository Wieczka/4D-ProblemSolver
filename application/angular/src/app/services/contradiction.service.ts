import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import {
  ErrorKind,
  SolveResponse,
  SolveResult,
  WizardStep,
} from '../models/report.model';

/**
 * Owns wizard state and drives the AI problem-solving flow.
 *
 * The service sends the user's problem text to POST /api/solve,
 * parses the structured JSON out of the advice field, and exposes
 * the result (or a typed error) as reactive signals.
 */
@Injectable({ providedIn: 'root' })
export class ContradictionService {
  private readonly http = inject(HttpClient);

  // ── Wizard state ────────────────────────────────────────────────────────────
  readonly step = signal<WizardStep>(1);
  readonly problemText = signal<string>('');
  readonly generating = signal(false);
  readonly reportReady = signal(false);

  // ── Result state ────────────────────────────────────────────────────────────
  private readonly _solveResult = signal<SolveResult | null>(null);
  private readonly _errorKind = signal<ErrorKind>(null);
  private readonly _rawAdvice = signal<string | null>(null);

  readonly solveResult = this._solveResult.asReadonly();
  readonly errorKind = this._errorKind.asReadonly();
  readonly rawAdvice = this._rawAdvice.asReadonly();

  // ── Derived ─────────────────────────────────────────────────────────────────
  readonly canAdvance = computed(() => this.problemText().trim().length >= 10);

  readonly errorMessage = computed<string | null>(() => {
    switch (this._errorKind()) {
      case 'network':
        return 'Could not reach the server. Check that the backend is running and your network is connected.';
      case 'server':
        return 'The AI solver returned an error. The backend may be misconfigured or overloaded. Try again.';
      case 'parse':
        return 'Received a response from the server, but could not read it correctly. Please try again.';
      default:
        return null;
    }
  });

  // ── Actions ─────────────────────────────────────────────────────────────────
  setProblemText(text: string): void {
    this.problemText.set(text);
  }

  goToStep(step: WizardStep): void {
    this.step.set(step);
  }

  generateReport(): void {
    this.step.set(2);
    this.generating.set(true);
    this.reportReady.set(false);
    this._solveResult.set(null);
    this._errorKind.set(null);
    this._rawAdvice.set(null);

    this.http
      .post<SolveResponse>('/api/solve', {
        problemDescription: this.problemText(),
      })
      .pipe(
        catchError((err: HttpErrorResponse) => {
          if (err.status === 0) {
            this._errorKind.set('network');
          } else {
            this._errorKind.set('server');
          }
          this.generating.set(false);
          this.reportReady.set(true);
          return of(null);
        })
      )
      .subscribe((res) => {
        if (!res) return;

        this._rawAdvice.set(res.advice ?? null);

        const parsed = this.tryParseSolveResult(res.advice);
        if (parsed) {
          this._solveResult.set(parsed);
        } else {
          // advice is likely a markdown string — treat as parse issue
          // but still show something rather than an error
          this._errorKind.set('parse');
        }

        this.generating.set(false);
        this.reportReady.set(true);
      });
  }

  retry(): void {
    this.generateReport();
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * The backend's advice field contains either:
   *   (a) a raw JSON string of ProblemSolverOutput   ← happy path
   *   (b) a formatted markdown string                ← older format
   *
   * Try (a) first; return null if it fails.
   */
  private tryParseSolveResult(advice: string | null): SolveResult | null {
    if (!advice) return null;

    const candidates: string[] = [];

    // 1. Try the raw string first
    candidates.push(advice.trim());

    // 2. Strip any markdown code fences (handles ```json ... ``` anywhere in string)
    const stripped = advice
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();
    candidates.push(stripped);

    // 3. Find the first {...} JSON object embedded in prose
    const jsonMatch = advice.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      candidates.push(jsonMatch[0]);
    }

    for (const candidate of candidates) {
      try {
        const obj = JSON.parse(candidate);
        if (obj && Array.isArray(obj.triz_solutions)) {
          return obj as SolveResult;
        }
      } catch {
        // try next candidate
      }
    }

    return null;
  }
}
