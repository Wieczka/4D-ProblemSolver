import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from './prisma.service';
import { Prisma } from '@prisma/client';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class AppService {
  private adkAgentUrl = process.env.ADK_AGENT_URL || 'http://localhost:8081';
  private trizPrinciples: any[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService
  ) {
    this.loadTrizPrinciples();
  }

  private loadTrizPrinciples() {
    try {
      let principlesPath = path.join(__dirname, 'assets', 'triz_principles.json');
      if (!fs.existsSync(principlesPath)) {
        principlesPath = path.join(process.cwd(), 'apps/backend/src/assets/triz_principles.json');
      }
      if (fs.existsSync(principlesPath)) {
        this.trizPrinciples = JSON.parse(fs.readFileSync(principlesPath, 'utf8'));
      } else {
        console.warn('TRIZ principles JSON asset file not found at:', principlesPath);
      }
    } catch (err: any) {
      console.error('Failed to load TRIZ principles JSON:', err.message);
    }
  }

  // ==========================================
  // Conversational Solving & Contradictions
  // ==========================================
  async solveContradiction(dto: { problemDescription: string }) {
    const guestUserId = 'guest-user';
    const defaultSessionId = `session-${crypto.randomUUID()}`;

    const adkUrl = `${this.adkAgentUrl}/run`;

    // Standard Google ADK /run Request Body Payload
    const requestPayload = {
      appName: 'problem_solver',
      userId: guestUserId,
      sessionId: defaultSessionId,
      newMessage: {
        role: 'user',
        parts: [
          {
            text: dto.problemDescription,
          },
        ],
      },
    };

    let agentAdvice = '';
    let parsedPrinciples: any[] = [];

    try {
      // Automatically pre-initialize the session in the ADK agent if it does not exist
      const sessionInitUrl = `${this.adkAgentUrl}/apps/problem_solver/users/${guestUserId}/sessions/${defaultSessionId}`;
      try {
        await firstValueFrom(this.httpService.post(sessionInitUrl, {}));
      } catch (err) {
        // Safe to ignore if session already exists
      }

      // Execute the direct run POST endpoint
      const response = await firstValueFrom(
        this.httpService.post(adkUrl, requestPayload)
      );

      const events = response.data;
      if (Array.isArray(events) && events.length > 0) {
        // Find the last event returned by the model to extract the finalized response text
        const modelEvent = [...events].reverse().find(
          (evt: any) => evt.content?.role === 'model' || evt.author === 'root_agent'
        );

        if (modelEvent && modelEvent.content?.parts?.[0]?.text) {
          let rawText = modelEvent.content.parts[0].text.trim();
          agentAdvice = rawText;

          try {
            // Strip markdown code fences if present
            let cleanText = rawText;
            if (cleanText.startsWith('```')) {
              cleanText = cleanText.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
            }
            // Attempt to parse JSON response
            const jsonObj = JSON.parse(cleanText);

            if (jsonObj && Array.isArray(jsonObj.triz_solutions)) {
              // Map the parsed principles dynamically (kept for legacy principles field)
              parsedPrinciples = jsonObj.triz_solutions.map((sol: any) => {
                const p = this.trizPrinciples.find((tp) => tp.id === sol.principle_id);
                return {
                  id: sol.principle_id,
                  name: sol.principle_name || p?.name || `Principle ${sol.principle_id}`,
                  description: sol.description || p?.description || '',
                };
              });

              if (jsonObj.decision_matrix) {
                const dm = jsonObj.decision_matrix;
                
                // Calculate WSI and rank programmatically if they are missing/default
                if (Array.isArray(dm.rows)) {
                  for (const row of dm.rows) {
                    if (row.wsi === undefined || row.wsi === 0 || row.wsi === null) {
                      row.wsi = (0.60 * (row.score_a || 0)) + (0.40 * (row.score_b || 0));
                    }
                  }
                  // Sort descending by wsi and assign ranks
                  dm.rows.sort((a: any, b: any) => (b.wsi || 0) - (a.wsi || 0));
                  dm.rows.forEach((row: any, idx: number) => {
                    row.rank = idx + 1;
                  });
                }
              }

              // Store the raw JSON — the frontend renders structured output directly
              agentAdvice = JSON.stringify(jsonObj);
            }
          } catch (jsonErr) {
            // Fallback: search raw text for any of the 40 principles dynamically
            const lowerAdvice = rawText.toLowerCase();
            for (const p of this.trizPrinciples) {
              const pPattern = `principle ${p.id}`;
              const pNamePattern = p.name.toLowerCase();
              if (lowerAdvice.includes(pPattern) || lowerAdvice.includes(pNamePattern)) {
                parsedPrinciples.push({
                  id: p.id,
                  name: p.name,
                  description: p.description,
                });
              }
            }
          }
        } else {
          agentAdvice = JSON.stringify(events);
        }
      } else {
        agentAdvice = JSON.stringify(response.data);
      }
    } catch (error: any) {
      console.error('Error invoking ADK agent:', error.message);
      if (error.response?.data) {
        console.error('ADK detailed error payload:', JSON.stringify(error.response.data));
      }
      agentAdvice = `Failed to contact the AI problem solver. (Error: ${error.message}). Please ensure the ADK Agent API is running and configured correctly.`;
    }

    // Store the contradiction and solved advice directly in Cloud SQL
    return this.prisma.contradiction.create({
      data: {
        problemDescription: dto.problemDescription,
        principles: parsedPrinciples.length > 0 ? parsedPrinciples : [],
        advice: agentAdvice,
      },
    });
  }

  async getHistory() {
    return this.prisma.contradiction.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async rateSolution(id: string, rating: number) {
    return this.prisma.contradiction.update({
      where: { id },
      data: { rating },
    });
  }
}
