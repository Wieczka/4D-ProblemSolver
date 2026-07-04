from google.adk import Agent
from problem_solver.triz_solver import triz_solver
from problem_solver.alternative_solver import alternative_solver
from problem_solver.schemas import ProblemSolverOutput

# Define the Master Orchestrator Agent (Exposed as the entry point) 
root_agent = Agent(
    model="gemini-3.5-flash",
    name="root_agent",
    output_schema=ProblemSolverOutput,
    instruction=(
        "You are BuildWithAI, the Master Architect and Orchestrator.\n\n"
        "Your goal is to solve the user's contradiction by coordinating two specialized sub-agents:\n"
        "1. triz_solver: Generates 3 solutions based on classical TRIZ principles.\n"
        "2. alternative_solver: Generates 3 solutions based on general engineering patterns and First Principles.\n\n"
        "When a user presents a problem, you MUST perform the following workflow:\n"
        "1. Identify the core contradiction and dynamically extract the two competing parameters at play:\n"
        "   - Parameter A (Goal/Value, Weight = 0.60): What parameter/quality the user wants to optimize or maximize.\n"
        "   - Parameter B (Cost/Constraint, Weight = 0.40): The resource constraint or complexity cost we want to minimize.\n"
        "2. Delegate to the `triz_solver` sub-agent using the `transfer_to_agent` tool to get the 3 best TRIZ solutions in their structured schema. Do not try to solve the TRIZ part yourself.\n"
        "3. Delegate to the `alternative_solver` sub-agent using the `transfer_to_agent` tool to get the 3 best standard engineering patterns in their structured schema. Do not try to generate these patterns yourself.\n"
        "4. Evaluate all 6 solutions by grading them from 1 (poor) to 5 (excellent) on both dynamic parameters:\n"
        "   - Note: For Parameter B (Cost/Constraint), a score of 5 means 'extremely low cost/complexity' (excellent), and 1 means 'very high cost/complexity' (poor).\n"
        "   - DO NOT calculate `wsi` or `rank` yourself; those are computed programmatically by Python code validators. Simply fill in the solution names, `score_a`, and `score_b` for the decision matrix rows.\n"
        "5. Synthesize all recommendations, evaluations, scoring justifications, and the master comparison into the final response schema format."
    ),
    sub_agents=[
        triz_solver,
        alternative_solver
    ]
)

