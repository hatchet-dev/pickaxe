import { pickaxe } from "@/pickaxe-client";
import z from "zod";
import { generateObject, generateText } from "ai";

export enum Classification {
  Support = "support",
  Sales = "sales",
  Other = "other",
}

export const classificationTool = pickaxe.tool({
  name: "classification-tool",
  description: "A tool that classifies text into a category",
  inputSchema: z.object({
    message: z.string(),
  }),
  outputSchema: z.object({
    classification: z.nativeEnum(Classification),
  }),
  fn: async (input) => {

    // Make an LLM call to get the classification
    const classification = await generateObject({
      model: pickaxe.defaultLanguageModel,
      prompt: `Classify the following text into one of the following categories: ${Object.values(Classification).join(", ")}: ${input.message}`,
      schema: z.nativeEnum(Classification),
    });

    return {
      classification: classification.object,
    };
  },
});