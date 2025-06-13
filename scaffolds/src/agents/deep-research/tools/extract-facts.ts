import { z } from "zod";
import { generateObject } from "ai";
import { pickaxe } from "@/client";

const ExtractFactsInputSchema = z.object({
  source: z.string(),
  query: z.string(),
  sourceInfo: z.object({
    url: z.string(),
    title: z.string().optional(),
    index: z.number(),
  }),
});

const Fact = z.object({
  text: z.string(),
  sourceIndex: z.number(),
});

const ExtractFactsOutputSchema = z.object({
  facts: z.array(Fact),
});

export const extractFacts = pickaxe.tool({
  name: "extract-facts",
  description: "Extract relevant facts from a source",
  inputSchema: ExtractFactsInputSchema,
  outputSchema: ExtractFactsOutputSchema,
  executionTimeout: "5m",
  fn: async (input) => {
    const validatedInput = ExtractFactsInputSchema.parse(input);

    const result = await generateObject({
      prompt: `
Extract relevant facts from the following source that are related to this query:
"""${validatedInput.query}"""

Source:
"""${validatedInput.source}"""

Extract only factual statements that are directly relevant to the query. Each fact should be a complete, standalone statement.
`,
      model: pickaxe.defaultLanguageModel,
      schema: z.object({
        facts: z.array(z.string()),
      }),
    });

    return {
      facts: result.object.facts.map((fact) => ({
        text: fact,
        sourceIndex: validatedInput.sourceInfo.index,
      })),
    };
  },
});
