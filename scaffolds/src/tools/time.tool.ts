import { z } from "zod";
import { pickaxe } from "@/pickaxe-client";

export const time = pickaxe.tool({
  name: "time",
  description: "Get the current time in a given city",
  inputSchema: z.object({
    city: z.string()
  }),
  outputSchema: z.object({
    time: z.string()
  }),
  fn: async (input) => {
    return {
      time: new Date().toISOString()
    };
  }
});

export const holiday = pickaxe.tool({
  name: "holiday",
  description: "Get the current holiday in a given country",
  inputSchema: z.object({
    country: z.string()
  }),
  outputSchema: z.object({
    holiday: z.string()
  }),
  fn: async (input) => {
    return {
      holiday: "Christmas"
    };
  }
});