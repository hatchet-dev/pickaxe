<div align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./static/pickaxe_dark.png">
  <img width="200" alt="Hatchet Logo" src="./static/pickaxe_light.png">
</picture>
</a>
</div>

## Pickaxe: a Typescript library for building effective agents

Pickaxe is a library for building effective agents, built on top of [Hatchet](https://github.com/hatchet-dev/hatchet). Pickaxe agents are:

- **Durable by default** - all tools called by the agent are serialized through a durable message boundary
- **Support any execution pattern** - Pickaxe agents can be written as loops, scatter/gather workflows, or directed acyclic graphs
- **Simple to scale** - Pickaxe agents allow simple configuration for retries, rate limiting, concurrency control, and much more

## Is Pickaxe a framework?

Pickaxe is **not a framework, it's a library**. While there are some prebuilt components, Pickaxe is designed to be extended and modified (for example, you could build your own agent library on top of Pickaxe).

When building with Pickaxe, you are expected to:

- Own your prompting layer
- Own your context window
- Own your control flow
- Write your own tools for tool-calling

## Get started

Getting started is as easy as two commands:

```
pnpm i -g @hatchet-dev/pickaxe
pickaxe create
```

## Technical Deep-Dive

Pickaxe is a utility layer built on top of [Hatchet](https://github.com/hatchet-dev/hatchet). Hatchet is a platform for async processing and background jobs, with features like:

- Queues
- Task Orchestration (DAGs and durable execution)
- Flow Control (concurrency or rate limiting)
- Scheduling (cron jobs and scheduled tasks)
- Task routing (sticky execution and affinity)
- Event triggers and listeners

It is built on the concept of a **durable task queue**, which means that every task which gets called in Hatchet is stored in a database. This is useful because tasks can easily be replayed and recover from failure, even when the underlying hardware crashes. Another way to look at it: Hatchet makes _distributed systems incredibly easy to deploy and maintain_.

For agents, this is particularly useful because they are extremely long-running, and thus need to be resilient to hardware failure. Agents also need to manage third-party rate limits and need concurrency control to prevent the system from getting overwhelmed.

Beyond Hatchet, there are two other points of inspiration for Pickaxe:

- [12-factor agents](https://github.com/humanlayer/12-factor-agents) -- this is the foundation for why Pickaxe advocates owning your control flow, context window, and prompts
- Anthropic's [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents) -- we have ensured that each pattern documented in this post are compatible with Pickaxe
