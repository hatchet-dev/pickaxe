import { pickaxe } from "@/pickaxe-client";
import z from "zod";
import { safetyVoterTool } from "./tools/safety-voter.tool";
import { helpfulnessVoterTool } from "./tools/helpfulness-voter.tool";
import { accuracyVoterTool } from "./tools/accuracy-voter.tool";

const VotingAgentInput = z.object({
  message: z.string(),
  response: z.string(),
});

const VotingAgentOutput = z.object({
  approved: z.boolean(),
  finalResponse: z.string(),
  votingSummary: z.string(),
});

export const votingAgent = pickaxe.agent({
  name: "voting-agent",
  executionTimeout: "1m",
  inputSchema: VotingAgentInput,
  outputSchema: VotingAgentOutput,
  description: "A multi-agent voting system that evaluates chat responses for appropriateness using specialized voting agents",
  fn: async (input, ctx) => {
    
    // Run multiple specialized voting agents in parallel to evaluate the response
    // This follows the Anthropic pattern of using subagents for parallel evaluation
    const [safetyVote, helpfulnessVote, accuracyVote] = await Promise.all([
      ctx.runChild(safetyVoterTool, {
        message: input.message,
        response: input.response,
      }),
      ctx.runChild(helpfulnessVoterTool, {
        message: input.message,
        response: input.response,
      }),
      ctx.runChild(accuracyVoterTool, {
        message: input.message,
        response: input.response,
      }),
    ]);

    // Count the votes
    const votes = [safetyVote.approve, helpfulnessVote.approve, accuracyVote.approve];
    const approvalCount = votes.filter(vote => vote).length;
    const totalVotes = votes.length;
    
    // Require majority approval (at least 2 out of 3 votes)
    const approved = approvalCount >= Math.ceil(totalVotes / 2);

    // Create voting summary
    const votingSummary = `Voting Results (${approvalCount}/${totalVotes} approved):
- Safety: ${safetyVote.approve ? '✓' : '✗'} - ${safetyVote.reason}
- Helpfulness: ${helpfulnessVote.approve ? '✓' : '✗'} - ${helpfulnessVote.reason}
- Accuracy: ${accuracyVote.approve ? '✓' : '✗'} - ${accuracyVote.reason}`;

    return {
      approved,
      finalResponse: approved 
        ? input.response 
        : "I apologize, but I cannot provide that response as it did not meet our quality and safety standards.",
      votingSummary,
    };
  },
});

export default [votingAgent]; 