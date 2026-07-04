import { Controller, Get, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // ==========================================
  // Conversational Solving & Contradictions
  // ==========================================
  @Post('solve')
  solveContradiction(
    @Body('problemDescription') problemDescription: string
  ) {
    return this.appService.solveContradiction({
      problemDescription,
    });
  }

  @Get('history')
  getHistory() {
    return this.appService.getHistory();
  }

  @Post('solutions/:id/rate')
  rateSolution(@Param('id') id: string, @Body('rating', ParseIntPipe) rating: number) {
    return this.appService.rateSolution(id, rating);
  }
}
