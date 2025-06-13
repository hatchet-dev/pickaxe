import { pickaxe } from "@/pickaxe-client";
import { weather } from "./tools/weather";
import { time } from "./tools/time";
import z from "zod";


const SimpleAgentInput = z.object({
  message: z.string(),
});

const SimpleAgentOutput = z.object({
  weather: z.string(),
  time: z.string(),
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
    const result = await simpleToolbox.pickAndRun(ctx, {
      prompt: input.message,
    });


    console.log(result);

    return {
      weather: "sunny",
      time: "10:00",
    };
    // return {
    //   weather: result.weather as string,
    //   time: result.time as string,
    // };
  },
});


export default [simpleAgent, simpleToolbox];