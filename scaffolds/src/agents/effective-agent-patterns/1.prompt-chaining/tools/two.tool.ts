import { pickaxe } from "@/pickaxe-client";
import { generateText } from "ai";
import z from "zod";

export const twoTool = pickaxe.tool({
  name: "two-tool",
  description: "Translates text into spanish",
  inputSchema: z.object({
    message: z.string(),
  }),
  outputSchema: z.object({
    twoOutput: z.string(),
  }),
  fn: async (input) => {

    // Make an LLM call to get the twoOutput
    const twoOutput = await generateText({
      model: pickaxe.defaultLanguageModel,
      prompt: `Translate the following text into spanish: ${input.message}`,
    });

    return {
      twoOutput: twoOutput.text,
    };
  },
});