import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContradictionService } from '../../services/contradiction.service';

@Component({
  selector: 'app-report-step',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './report-step.component.html',
  styleUrl: './report-step.component.scss'
})
export class ReportStepComponent {
  private readonly svc = inject(ContradictionService);

  readonly generating = this.svc.generating;
  readonly report = this.svc.report;
  readonly targets = this.svc.targets;

  get targetSummary(): string {
    const t = this.targets();
    const parts: string[] = [];
    if (t.compostDays != null) parts.push(`compost within ${t.compostDays} days`);
    if (t.bioContentPct != null) parts.push(`${t.bioContentPct}% bio-based content`);
    if (t.costDeltaPct != null) parts.push(`a ${t.costDeltaPct}% cost delta vs. current packaging`);
    return parts.length ? `Target: ${parts.join(', ')}.` : '';
  }

  onCompostChange(value: string): void {
    this.svc.setTargets({ compostDays: value === '' ? null : Number(value) });
  }
  onBioChange(value: string): void {
    this.svc.setTargets({ bioContentPct: value === '' ? null : Number(value) });
  }
  onCostChange(value: string): void {
    this.svc.setTargets({ costDeltaPct: value === '' ? null : Number(value) });
  }

  back(): void {
    this.svc.goToStep(1);
  }

  print(): void {
    window.print();
  }
}
