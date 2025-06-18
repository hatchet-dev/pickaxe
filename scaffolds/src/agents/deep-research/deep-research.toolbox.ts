import { search } from '@/agents/deep-research/tools/search.tool';
import { summarize } from '@/agents/deep-research/tools/summarize.tool';
import { pickaxe } from '@/pickaxe-client';

export const deepResearchTaskbox = pickaxe.toolbox({
  tools: [
    search,
    summarize,
  ],
});
