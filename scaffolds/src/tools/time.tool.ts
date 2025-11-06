import { z } from "zod";
import { icepick } from "@/icepick-client";

const TimeInput = z.object({
  city: z.string().describe("The city to get the time for")
});

const TimeOutput = z.object({
  time: z.string()
});

export const time = icepick.tool({
  name: "time",
  description: "Get the current time in a given city",
  inputSchema: TimeInput,
  outputSchema: TimeOutput,
  fn: async (input) => {
    return {
      time: new Date().toLocaleTimeString(),
    };
  },
});

const HolidayInput = z.object({
  country: z.string().describe("The country to get the holiday for")
});

const HolidayOutput = z.object({
  holiday: z.string()
});

export const holiday = icepick.tool({
  name: "holiday",
  description: "Get the current holiday in a given country",
  inputSchema: HolidayInput,
  outputSchema: HolidayOutput,
  fn: async (input) => {
    return {
      holiday: "No holiday today",
    };
  },
});
