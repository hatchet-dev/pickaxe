import { Pickaxe } from "@hatchet-dev/pickaxe/src/client";
import { openai } from "@ai-sdk/openai";

export const pickaxe = Pickaxe.init({
    defaultLanguageModel: openai("gpt-4o-mini"),
});
