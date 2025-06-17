import { pickaxe } from "@/pickaxe-client";
import z from "zod";
import { evaluatorTool } from "./tools/evaluator.tool";
import { generatorTool } from "./tools/generator.tool";


const EvaluatorOptimizerAgentInput = z.object({
  topic: z.string(),
  targetAudience: z.string(),
});

const EvaluatorOptimizerAgentOutput = z.object({
  post: z.string(),
});

export const evaluatorOptimizerAgent = pickaxe.agent({
  name: "evaluator-optimizer-agent",
  executionTimeout: "2m",
  inputSchema: EvaluatorOptimizerAgentInput,
  outputSchema: EvaluatorOptimizerAgentOutput,
  description: "An agent that generates an optimized social media post for a given topic and target audience",
  fn: async (input, ctx) => {
    
    let post: string | undefined;
    let feedback: string | undefined;

    for (let i = 0; i < 3; i++) {
      // Generate a post
      const { post: newPost } = await ctx.runChild(generatorTool, { 
        topic: input.topic, 
        targetAudience: input.targetAudience, 
        previousPost: post, 
        previousFeedback: feedback 
      });
      post = newPost;

      // Run the evaluator tool
      const evaluatorResult = await ctx.runChild(evaluatorTool, { post: post, topic: input.topic, targetAudience: input.targetAudience });

      feedback = evaluatorResult.feedback;

      if (evaluatorResult.complete) {
        return {
          post: post,
        };
      }
    }

    if (!post) throw new Error("I was unable to generate a post");
    
    return {
      post: post,
    };
  },
});

export default [evaluatorOptimizerAgent]; 