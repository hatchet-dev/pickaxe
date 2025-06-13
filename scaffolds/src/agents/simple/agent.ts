import { pickaxe } from "@/client";
import { weather } from "./tools/weather";
import { time } from "./tools/time";
import { toolbox } from "../tools/toolbox";


type SimpleAgentInput = {
  message: string;
};


const simpleToolbox = toolbox({
  tools: [weather, time],
});

export const simpleAgent = pickaxe.agent({
  name: "simple-agent",
  executionTimeout: "15m",
  fn: async (input: SimpleAgentInput, ctx) => {
  
    const result = await simpleToolbox.pick({
      prompt: input.message,
    });

    const weatherResult = await ctx.bulkRunChildren(result.steps.map((step) => {
      return {
        workflow: weather,
        input: step.input,
      };
    }));

    return {
      weather: weatherResult.weather,
    };
  },
});
