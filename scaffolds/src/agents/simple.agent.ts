import { icepick } from "@/icepick-client";
import { weather } from "../tools/weather.tool";
import { holiday, time } from "../tools/time.tool";
import z from "zod";


const SimpleAgentInput = z.object({
  message: z.string(),
});

const SimpleAgentOutput = z.object({
  message: z.string(),
});

export const simpleToolbox = icepick.toolbox({
  tools: [weather, time, holiday],
});

export const simpleAgent = icepick.agent({
  name: "simple-agent",
  executionTimeout: "1m",
  inputSchema: SimpleAgentInput,
  outputSchema: SimpleAgentOutput,
  description: "A simple agent to get the weather and time",
  fn: async (input, ctx) => {
    const result = await simpleToolbox.pickAndRun({
      prompt: input.message,
    });

    switch (result.name) {
      case "weather":
        return {
          message: `The weather in ${result.args.city} is ${result.output.weather}`,
        };
      case "time":
        return {
          message: `The time in ${result.args.city} is ${result.output.time}`,
        };
      case "holiday":
        return {
          message: `The holiday in ${result.args.country} is ${result.output.holiday}`,
        };
      default:
        simpleToolbox.assertExhaustive(result);
        return {
          message: "Unknown tool result",
        };
    }
  },
});
