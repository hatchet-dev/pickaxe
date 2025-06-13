import { pickaxe } from "../../client";
import { extractFacts, judgeFacts, judgeResults, planSearch, summarize, search } from "../../tools";
import { websiteToMd } from "../../tools/website-to-md";


type Message = {
  message: string;
};

type Source = {
  url: string;
  title?: string;
  index: number;
};

type Fact = {
  text: string;
  sourceIndex: number;
};

export const deepResearchAgent = pickaxe.agent({
  name: "weather-agent",
  executionTimeout: "15m",
  fn: async (input: Message, ctx) => {
    ctx.logger.info(`Starting deep research agent with query: ${input.message}`);

    let iteration = 0;
    const maxIterations = 3;
    const allFacts: Fact[] = [];
    const allSources: Source[] = [];
    let missingAspects: string[] = [];

    while (!ctx.cancelled && iteration < maxIterations) {
      iteration++;
      ctx.logger.info(`Starting iteration ${iteration}/${maxIterations}`);

      // Plan the search based on the query, existing facts, and missing aspects
      ctx.logger.info(
        `Planning search with ${allFacts.length} existing facts and ${missingAspects.length} missing aspects`
      );

      const plan = await ctx.runChild(planSearch, {
        query: input.message,
        existingFacts: allFacts.map((f) => f.text),
        missingAspects: missingAspects,
      });

      ctx.logger.info(
        `Search plan for iteration ${iteration}: ${plan.reasoning}. Queries:`
      );

      for (const query of plan.queries) {
        ctx.log(`${query}`);
      }

      ctx.logger.info(`Executing ${plan.queries.length} search queries`);
      const results = await ctx.bulkRunChildren(
        plan.queries.map((query: string) => ({
          workflow: search,
          input: { query },
        }))
      );

      // Flatten and deduplicate sources
      const newSources = results.flatMap((result) => result.sources);
      const uniqueSources = new Map(
        newSources.map((source, index) => [source.url, { ...source, index }])
      );

      ctx.logger.info(
        `Found ${newSources.length} new sources, ${uniqueSources.size} unique sources`
      );

      // Add new sources to all sources
      allSources.push(...Array.from(uniqueSources.values()));

      // Convert sources to markdown
      ctx.logger.info(`Converting ${uniqueSources.size} sources to markdown`);
      const mdResults = await ctx.bulkRunChildren(
        Array.from(uniqueSources.values())
          .sort((a, b) => a.index - b.index)
          .map((source) => ({
            workflow: websiteToMd,
            input: {
              url: source.url,
              index: source.index,
              title: source.title,
            },
          }))
      );

      // Extract facts from each source
      ctx.logger.info("Extracting facts from markdown content");
      const factsResults = await ctx.bulkRunChildren(
        mdResults.map((result) => ({
          workflow: extractFacts,
          input: {
            source: result.markdown,
            query: input.message,
            sourceInfo: {
              url: result.url,
              title: result.title,
              index: result.index,
            },
          },
        }))
      );

      // Add new facts to all facts
      const newFacts = factsResults.flatMap((result) => result.facts);
      allFacts.push(...newFacts);
      ctx.logger.info(
        `Extracted ${newFacts.length} new facts, total facts: ${allFacts.length}`
      );

      // Judge if we have enough facts
      ctx.logger.info("Judging if we have enough facts");
      const factsJudgment = await ctx.runChild(judgeFacts, {
        query: input.message,
        facts: allFacts.map((f) => f.text),
      });

      // Update missing aspects for next iteration
      missingAspects = factsJudgment.missingAspects;
      ctx.logger.info(`Missing aspects: ${missingAspects.join(", ")}`);

      // If we have enough facts or reached max iterations, generate final summary
      if (factsJudgment.hasEnoughFacts || iteration >= maxIterations) {
        ctx.logger.info(
          `Generating final summary (hasEnoughFacts: ${
            factsJudgment.hasEnoughFacts
          }, reachedMaxIterations: ${iteration >= maxIterations})`
        );

        const summarizeResult = await ctx.runChild(summarize, {
          text: input.message,
          facts: allFacts,
          sources: allSources,
        });

        ctx.logger.info("Judging final results");
        const judgeResult = await ctx.runChild(judgeResults, {
          query: input.message,
          result: summarizeResult.summary,
        });

        ctx.log(
          `Deep research complete (isComplete: ${judgeResult.isComplete}, totalFacts: ${allFacts.length}, totalSources: ${allSources.length}, iterations: ${iteration})`
        );

        return {
          result: {
            isComplete: judgeResult.isComplete,
            reason: judgeResult.reason,
            sources: allSources,
            summary: summarizeResult.summary,
            facts: allFacts,
            iterations: iteration,
            factsJudgment: factsJudgment,
            searchPlans: plan.reasoning,
          },
        };
      }
    }
  },
});
