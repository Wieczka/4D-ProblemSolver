import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ContradictionService } from '../../services/contradiction.service';

@Component({
  selector: 'app-problem-step',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './problem-step.component.html',
  styleUrl: './problem-step.component.scss'
})
export class ProblemStepComponent {
  private readonly svc = inject(ContradictionService);
  readonly problemText = this.svc.problemText;
  readonly canAdvance = this.svc.canAdvanceToContradiction;

  onInput(value: string): void {
    this.svc.setProblemText(value);
  }

  next(): void {
    this.svc.generateReport();
  }
}
