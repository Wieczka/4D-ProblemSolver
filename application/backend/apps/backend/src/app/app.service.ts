import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from './prisma.service';
import { Prisma } from '@prisma/client';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';

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
    const defaultSessionId = 'global-session';

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
          const rawText = modelEvent.content.parts[0].text.trim();
          agentAdvice = rawText;

          try {
            // Attempt to parse JSON response generated via Pydantic output_schema
            const jsonObj = JSON.parse(rawText);

            if (jsonObj && Array.isArray(jsonObj.triz_solutions)) {
              // Map the parsed principles dynamically
              parsedPrinciples = jsonObj.triz_solutions.map((sol: any) => {
                const p = this.trizPrinciples.find((tp) => tp.id === sol.principle_id);
                return {
                  id: sol.principle_id,
                  name: sol.principle_name || p?.name || `Principle ${sol.principle_id}`,
                  description: sol.description || p?.description || '',
                };
              });

              // Reconstruct markdown response for backward compatibility
              let formattedMarkdown = `## 🧩 TRIZ Inventive Solutions\n\n`;
              for (const sol of jsonObj.triz_solutions) {
                formattedMarkdown += `### Principle ${sol.principle_id}: ${sol.principle_name}\n`;
                formattedMarkdown += `**Solution**: ${sol.solution_name}\n`;
                formattedMarkdown += `${sol.description}\n\n`;
              }
              if (Array.isArray(jsonObj.alternative_solutions)) {
                formattedMarkdown += `## ⚙️ Alternative Architectural/Engineering Solutions\n\n`;
                for (const sol of jsonObj.alternative_solutions) {
                  formattedMarkdown += `### ${sol.solution_name}\n`;
                  formattedMarkdown += `${sol.description}\n\n`;
                }
              }
              if (jsonObj.decision_matrix) {
                const dm = jsonObj.decision_matrix;
                formattedMarkdown += `## 📊 Dynamic Decision Matrix\n\n`;
                formattedMarkdown += `**Competing Parameters Identified**:\n`;
                formattedMarkdown += `*   **Parameter A (Goal)**: ${dm.parameter_a}\n`;
                formattedMarkdown += `*   **Parameter B (Cost/Constraint)**: ${dm.parameter_b}\n\n`;
                formattedMarkdown += `| Solution Name | ${dm.parameter_a} (Weight 0.60) | ${dm.parameter_b} (Weight 0.40) | Weighted Suitability Index (WSI) | Rank |\n`;
                formattedMarkdown += `| :--- | :---: | :---: | :---: | :---: |\n`;
                if (Array.isArray(dm.rows)) {
                  for (const row of dm.rows) {
                    formattedMarkdown += `| ${row.solution_name} | ${row.score_a} | ${row.score_b} | ${Number(row.wsi).toFixed(2)} | ${row.rank} |\n`;
                  }
                }
              }
              if (Array.isArray(jsonObj.scoring_justifications)) {
                formattedMarkdown += `\n## 🔍 Scoring Justifications\n\n`;
                for (const just of jsonObj.scoring_justifications) {
                  formattedMarkdown += `* ${just}\n`;
                }
              }
              if (jsonObj.master_evaluation_synthesis) {
                formattedMarkdown += `\n## ⚖️ Master Evaluation & Synthesis\n\n`;
                formattedMarkdown += `${jsonObj.master_evaluation_synthesis}`;
              }

              agentAdvice = formattedMarkdown;
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
