import { pickaxe } from "@/client";
import { z } from "zod";

type WeatherInput = {
  city: string;
};

type WeatherOutput = {
  weather: string;
};

export const weather = pickaxe.tool({
  name: "weather",
  description: "Get the weather in a given city",
  inputSchema: z.object({
    city: z.string()
  }),
  outputSchema: z.object({
    weather: z.string()
  }),
  fn: async (input: WeatherInput): Promise<WeatherOutput> => {
    return {
      weather: "sunny",
    };
  },
});