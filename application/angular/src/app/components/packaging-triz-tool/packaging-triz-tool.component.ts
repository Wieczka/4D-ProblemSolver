import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContradictionService } from '../../services/contradiction.service';
import { ProblemStepComponent } from '../problem-step/problem-step.component';
import { ReportStepComponent } from '../report-step/report-step.component';
import { WizardStep } from '../../models/report.model';

@Component({
  selector: 'app-packaging-triz-tool',
  standalone: true,
  imports: [CommonModule, ProblemStepComponent, ReportStepComponent],
  templateUrl: './packaging-triz-tool.component.html',
  styleUrl: './packaging-triz-tool.component.scss'
})
export class PackagingTrizToolComponent {
  private readonly svc = inject(ContradictionService);

  readonly step = this.svc.step;
  readonly canAdvance = this.svc.canAdvanceToContradiction;
  readonly liveMessage = computed(() => {
    if (this.svc.generating()) return 'Generating investor report…';
    if (this.svc.reportReady()) return 'Report ready.';
    return '';
  });

  steps: { num: WizardStep; label: string }[] = [
    { num: 1, label: 'Problem' },
    { num: 2, label: 'Report' }
  ];

  goToStep(step: WizardStep): void {
    if (step === 2) {
      this.svc.generateReport();
      return;
    }
    this.svc.goToStep(step);
  }

  isDisabled(step: WizardStep): boolean {
    if (step === 2) return !this.canAdvance() && this.step() !== 2;
    return false;
  }

  badgeClass(step: WizardStep): string {
    const current = this.step();
    if (step < current) return 'badge badge--done';
    if (step === current) return 'badge badge--current';
    return 'badge badge--upcoming';
  }

  labelClass(step: WizardStep): string {
    return this.step() === step ? 'step-label step-label--current' : 'step-label';
  }
}
