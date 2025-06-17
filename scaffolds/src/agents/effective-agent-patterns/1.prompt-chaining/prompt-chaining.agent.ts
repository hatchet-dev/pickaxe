import { pickaxe } from "@/pickaxe-client";
import z from "zod";
import { oneTool } from "./tools/one.tool";
import { twoTool } from "./tools/two.tool";
import { threeTool } from "./tools/three.tool";


const PromptChainingAgentInput = z.object({
  message: z.string(),
});

const PromptChainingAgentOutput = z.object({
  result: z.string(),
});

export const promptChainingAgent = pickaxe.agent({
  name: "prompt-chaining-agent",
  executionTimeout: "1m",
  inputSchema: PromptChainingAgentInput,
  outputSchema: PromptChainingAgentOutput,
  description: "A simple agent to get the weather and time",
  fn: async (input, ctx) => {
    
    const { oneOutput } = await ctx.runChild(oneTool, {
        message: input.message,
    });

    // Gate the output and only allow messages about animals
    if(!oneOutput) {
        // FAIL
        return {
            result: 'Please provide a message about an animal'
        }
    }

    // PASS
    // If it is an animal, translate the message to spanish
    const { twoOutput } = await ctx.runChild(twoTool, {
        message: input.message,
    });

    // Then convert the message into a haiku
    const { threeOutput } = await ctx.runChild(threeTool, {
        twoOutput,
    });

    return {
        result: threeOutput
    }
  },
});


export default [promptChainingAgent];