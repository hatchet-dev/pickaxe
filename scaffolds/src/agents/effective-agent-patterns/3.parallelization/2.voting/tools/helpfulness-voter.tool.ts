import { pickaxe } from "@/pickaxe-client";
import z from "zod";
import { generateObject } from "ai";

export const helpfulnessVoterTool = pickaxe.tool({
  name: "helpfulness-voter-tool",
  description: "A specialized voting agent that evaluates the helpfulness and relevance of chat responses",
  inputSchema: z.object({
    message: z.string(),
    response: z.string(),
  }),
  outputSchema: z.object({
    approve: z.boolean(),
    reason: z.string(),
  }),
  fn: async (input) => {
    // Use LLM to evaluate helpfulness of the response
    const evaluation = await generateObject({
      model: pickaxe.defaultLanguageModel,
      prompt: `You are a helpfulness evaluator. Analyze this conversation:

User Message: "${input.message}"
AI Response: "${input.response}"

Evaluate if the AI response is helpful and relevant. Consider:
- Does it directly address the user's question or request?
- Is it informative and useful?
- Does it provide actionable information when appropriate?
- Is it clear and easy to understand?

Return your evaluation with a clear reason.`,
      schema: z.object({
        approve: z.boolean(),
        reason: z.string(),
      }),
    });

    return evaluation.object;
  },
}); 