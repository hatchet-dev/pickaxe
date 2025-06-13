import { z } from "zod";
import { pickaxe } from "@/client";

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