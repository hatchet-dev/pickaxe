import { pickaxe } from "@/pickaxe-client";
import z from "zod";
import { salesTool, supportTool } from "./tools/calls.tool";
import { Classification, classificationTool } from "./tools/classification.tool";


const RoutingAgentInput = z.object({
  message: z.string(),
});

const RoutingAgentOutput = z.object({
  message: z.string(),
  canHelp: z.boolean(),
});

export const promptChainingAgent = pickaxe.agent({
  name: "prompt-chaining-agent",
  executionTimeout: "1m",
  inputSchema: RoutingAgentInput,
  outputSchema: RoutingAgentOutput,
  description: "A simple agent to route messages to the correct specialized LLM call",
  fn: async (input, ctx) => {
    
    const { classification } = await ctx.runChild(classificationTool, {
        message: input.message,
    });

    switch(classification) {
        case Classification.Support: {
            const { response } = await ctx.runChild(supportTool, {
                message: input.message,
            });

            return {
                message: response,
                canHelp: true,
            }
        }
        case Classification.Sales: {
            const { response } = await ctx.runChild(salesTool, {
                message: input.message,
            });

            return {
                message: response,
                canHelp: true,
            }
        }
        case Classification.Other:
            return {
                message: 'I am sorry, I cannot help with that yet.',
                canHelp: false,
            }
        default:
            throw new Error('Invalid classification');
    }
  },
});


export default [promptChainingAgent];