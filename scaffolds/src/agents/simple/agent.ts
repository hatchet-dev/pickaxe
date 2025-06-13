import { pickaxe } from "@/client";
import { weather } from "./tools/weather";
import { time } from "./tools/time";


type SimpleAgentInput = {
  message: string;
};


export const simpleAgent = pickaxe.agent({
  name: "simple-agent",
  executionTimeout: "15m",
  fn: async (input: SimpleAgentInput, ctx) => {


    const weatherResult = await ctx.runChild(weather, {
      city: "New York",
    });
    const timeResult = await ctx.runChild(time, {
      city: "New York",
    });

    return {
      weather: weatherResult.weather,
      time: timeResult.time,
    };
  },
});
