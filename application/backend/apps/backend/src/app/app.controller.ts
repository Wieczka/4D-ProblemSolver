import { Controller, Get, Post, Body, Param, ParseIntPipe, Res } from '@nestjs/common';
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

  @Post('solve/stream')
  async solveContradictionStream(
    @Body('problemDescription') problemDescription: string,
    @Res() res: any
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendEvent = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    sendEvent({ status: 'Starting Master Orchestrator...' });

    const t1 = setTimeout(() => sendEvent({ status: 'Delegating to TRIZ Solver sub-agent...' }), 3000);
    const t2 = setTimeout(() => sendEvent({ status: 'Delegating to Alternative Pattern Solver...' }), 20000);
    const t3 = setTimeout(() => sendEvent({ status: 'Evaluating and scoring alternatives...' }), 45000);
    const t4 = setTimeout(() => sendEvent({ status: 'Synthesizing final architectural decision matrix...' }), 65000);

    try {
      const dbResult = await this.appService.solveContradiction({ problemDescription });
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
      sendEvent({ completed: true, data: dbResult });
      res.end();
    } catch (e) {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
      sendEvent({ error: 'Failed to generate solution' });
      res.end();
    }
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
