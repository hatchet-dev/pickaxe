import { pickaxe } from "@/pickaxe-client";
import z from "zod";

const CommonAgentResponseSchema = z.object({
  message: z.string(),
});

const supportAgent = pickaxe.agent({
  name: "support-agent",
  executionTimeout: "1m",
  inputSchema: z.object({
    message: z.string(),
  }),
  outputSchema: CommonAgentResponseSchema,
  description: "A support agent that provides support to the user",
  fn: async (input, ctx) => {
    return { message: "Hello from support agent" };
  },
});

const salesAgent = pickaxe.agent({
  name: "sales-agent",
  description: "A sales agent that sells the product to the user",
  executionTimeout: "1m",
  inputSchema: z.object({
    message: z.string(),
  }),
  outputSchema: CommonAgentResponseSchema,
  fn: async (input, ctx) => {
    return { message: "Hello from sales agent" };
  },
});


export const multiAgentToolbox = pickaxe.toolbox({
  tools: [supportAgent, salesAgent],
});


export const rootAgent = pickaxe.agent({
  name: "root-agent",
  executionTimeout: "1m",
  inputSchema: z.object({
    message: z.string(),
  }),
  outputSchema: z.object({
    message: z.string(),
  }),
  description: "A root agent that orchestrates the other agents",
  fn: async (input, ctx) => {
    const result = await multiAgentToolbox.pickAndRun(ctx, {
      prompt: input.message,
    });

    return { message: result.output.message };
  },
});

