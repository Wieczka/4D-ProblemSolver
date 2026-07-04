import { Injectable, signal, computed } from '@angular/core';
import { Contradiction, PackagingReport, PerformanceTargets, WizardStep } from '../models/report.model';

/**
 * Owns wizard state (step, problem text, targets) and produces the
 * TRIZ contradiction + report content.
 *
 * The fixed case-study contradiction (TRIZ-14 Strength vs TRIZ-31
 * Object-generated harmful factors) is hard-coded for this brief.
 * To generalize to arbitrary problems, replace `buildContradiction()`
 * with a call out to a classification service / LLM prompt that maps
 * free text to a pair of the 39 TRIZ parameters.
 */
@Injectable({ providedIn: 'root' })
export class ContradictionService {
  readonly step = signal<WizardStep>(1);
  readonly problemText = signal<string>(
    'Packaging exists to protect products from damage during shipping, handling, and storage, which typically means using tough, moisture-resistant materials, often made of multi-layered composites or coatings. Once a product reaches its destination, that packaging becomes waste, and much of it is slow to biodegrade or difficult to recycle cleanly.'
  );
  readonly targets = signal<PerformanceTargets>({ compostDays: null, bioContentPct: null, costDeltaPct: null });
  readonly generating = signal(false);
  readonly reportReady = signal(false);

  readonly canAdvanceToContradiction = computed(() => this.problemText().trim().length > 0);

  readonly contradiction = computed<Contradiction>(() => this.buildContradiction());

  readonly report = computed<PackagingReport | null>(() => {
    if (!this.reportReady()) return null;
    return {
      problemText: this.problemText(),
      contradiction: this.contradiction(),
      conceptName: 'ReGrow Pack',
      conceptDescription:
        'A molded shell of pressed agricultural fibre bound by grown mycelium, sealed with a thin chitosan-nanocrystal moisture barrier. Rigid and water-resistant while dry and in transit; fully home-compostable or re-pulpable once wetted.',
      targets: this.targets(),
      nextSteps: [
        'Bench-test moisture barrier hold time under transit-representative humidity and drop cycles.',
        'Confirm home-compost and industrial-compost breakdown against target.',
        'Pilot with one SKU to compare unit cost and damage-rate against current packaging.'
      ]
    };
  });

  setProblemText(text: string): void {
    this.problemText.set(text);
  }

  setTargets(partial: Partial<PerformanceTargets>): void {
    this.targets.update((t) => ({ ...t, ...partial }));
  }

  goToStep(step: WizardStep): void {
    if (step === 2 && !this.canAdvanceToContradiction() && this.step() !== 2) return;
    this.step.set(step);
  }

  generateReport(): void {
    this.step.set(2);
    this.generating.set(true);
    this.reportReady.set(false);
    // Simulated generation latency; swap for a real API call.
    setTimeout(() => {
      this.generating.set(false);
      this.reportReady.set(true);
    }, 900);
  }

  private buildContradiction(): Contradiction {
    return {
      improving: {
        code: 'TRIZ-14',
        name: 'Strength',
        description: 'The package must resist crushing, puncture and moisture across shipping, handling and storage.'
      },
      worsening: {
        code: 'TRIZ-31',
        name: 'Object-generated harmful factors',
        description:
          'The multi-layer composites and coatings that deliver that strength persist as waste, resisting clean recycling or biodegradation.'
      },
      principles: [
        { number: 40, name: 'Composite materials', rationale: 'Replace a single tough polymer layer with a grown or pressed natural composite.' },
        { number: 27, name: 'Cheap, short-living objects', rationale: 'Design the package to be disposable by design, not durable by accident.' },
        { number: 35, name: 'Parameter changes', rationale: 'Shift material state (dry/rigid → wet/soft) between transit and disposal.' },
        { number: 10, name: 'Preliminary action', rationale: 'Pre-treat the material so its breakdown trigger is built in, not added later.' }
      ]
    };
  }
}
