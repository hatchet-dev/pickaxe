import { pickaxe } from "@/pickaxe-client";
import z from "zod";
import { appropriatenessCheckTool } from "./tools/appropriateness.tool";
import { mainContentTool } from "./tools/main-content.tool";


const SectioningAgentInput = z.object({
  message: z.string(),
});

const SectioningAgentOutput = z.object({
  response: z.string(),
  isAppropriate: z.boolean(),
});

export const sectioningAgent = pickaxe.agent({
  name: "sectioning-agent",
  executionTimeout: "2m",
  inputSchema: SectioningAgentInput,
  outputSchema: SectioningAgentOutput,
  description: "An agent that sections responses into specialized parts using multiple sub-agents",
  fn: async (input, ctx) => {
    

    // Run the appropriateness check and the main content tool in parallel
    const [{isAppropriate, reason}, mainResult] = await Promise.all([
      ctx.runChild(appropriatenessCheckTool, { message: input.message }),
      ctx.runChild(mainContentTool, { message: input.message }),
    ]);

    if (!isAppropriate) {
        return {
          response: `I cannot provide a response to that request. ${reason}`,
          isAppropriate: false,
        };
      }

    return {
      response: mainResult.mainContent,
      isAppropriate: true,
    };
  },
});

export default [sectioningAgent]; 