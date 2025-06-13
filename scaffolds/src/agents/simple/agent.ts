import { pickaxe } from "@/pickaxe-client";
import { weather } from "./tools/weather";
import { time } from "./tools/time";
import z from "zod";


const SimpleAgentInput = z.object({
  message: z.string(),
});

const SimpleAgentOutput = z.object({
  message: z.string(),
});

export const simpleToolbox = pickaxe.toolbox({
  tools: [weather, time],
});

export const simpleAgent = pickaxe.agent({
  name: "simple-agent",
  executionTimeout: "15m",
  inputSchema: SimpleAgentInput,
  outputSchema: SimpleAgentOutput,
  description: "A simple agent to get the weather and time",
  fn: async (input, ctx) => {
    const results = await simpleToolbox.pickAndRun(ctx, {
      prompt: input.message,
      maxTools: 1,
    });

    for (const result of results) {
      if (result.name === "weather") {
        return {
          message: `The weather in ${result.args.city} is ${result.output}`,
        };
      }

      if (result.name === "time") {
        return {
          message: `The time in ${result.args.city} is ${result.output}`,
        };
      }
    }

    return {
      message: "No tools were executed.",
    };
  },
});


export default [simpleAgent, simpleToolbox];