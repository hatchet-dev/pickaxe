import { z } from "zod";
import { pickaxe } from "../../../client";

const TimeInputSchema = z.object({
  city: z.string(),
});

type TimeInput = z.infer<typeof TimeInputSchema>;

type TimeOutput = {
  time: string;
};

export default pickaxe.tool({
  name: "time",
  fn: async (input: TimeInput): Promise<TimeOutput> => {
    return {
      time: new Date().toISOString(),
    };
  },
});