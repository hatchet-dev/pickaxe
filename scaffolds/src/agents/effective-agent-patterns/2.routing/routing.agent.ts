import { pickaxe } from "@/pickaxe-client";
import z from "zod";
import { salesTool, supportTool } from "./tools/calls.tool";
import { Classification, classificationTool } from "./tools/classification.tool";

/**
 * ROUTING PATTERN
 * 
 * Based on Anthropic's "Building Effective Agents" blog post:
 * https://www.anthropic.com/engineering/building-effective-agents
 * 
 * Pattern Description:
 * Routing classifies an input and directs it to a specialized followup task. 
 * This allows separation of concerns and building more specialized prompts 
 * without one input type hurting performance on others.
 * 
 * When to use:
 * - Complex tasks with distinct categories better handled separately
 * - Classification can be handled accurately by LLM or traditional algorithms
 * - Need specialized handling for different input types
 * 
 * Examples:
 * - Customer service: routing questions, refunds, technical support
 * - Multi-model routing: easy questions to smaller models, hard to larger
 * - Content classification with specialized processors
 */

const RoutingAgentInput = z.object({
  message: z.string(),
});

const RoutingAgentOutput = z.object({
  message: z.string(),
  canHelp: z.boolean(),
});

export const routingAgent = pickaxe.agent({
  name: "routing-agent",
  executionTimeout: "1m",
  inputSchema: RoutingAgentInput,
  outputSchema: RoutingAgentOutput,
  description: "Demonstrates routing: classify input and direct to specialized handlers",
  fn: async (input, ctx) => {
    
    // STEP 1: Classification - Determine the type of request
    // This is the key step in routing - understanding what kind of input we have
    // so we can direct it to the most appropriate specialized handler
    const { classification } = await ctx.runChild(classificationTool, {
        message: input.message,
    });

    // STEP 2: Route to specialized handler based on classification
    // Each case represents a different specialized workflow optimized for that type
    switch(classification) {
        case Classification.Support: {
            // Route to support-specialized LLM with support-specific tools and prompts
            const { response } = await ctx.runChild(supportTool, {
                message: input.message,
            });

            return {
                message: response,
                canHelp: true,
            }
        }
        case Classification.Sales: {
            // Route to sales-specialized LLM with sales-specific tools and prompts
            const { response } = await ctx.runChild(salesTool, {
                message: input.message,
            });

            return {
                message: response,
                canHelp: true,
            }
        }
        case Classification.Other:
            // Fallback case - graceful degradation for unhandled categories
            // This prevents the agent from trying to handle cases it's not designed for
            return {
                message: 'I am sorry, I cannot help with that yet.',
                canHelp: false,
            }
        default:
            // This should never happen if classification is working correctly
            throw new Error('Invalid classification');
    }
  },
});
