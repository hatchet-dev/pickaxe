<div align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./static/pickaxe_dark.png">
  <img width="200" alt="Hatchet Logo" src="./static/pickaxe_light.png">
</picture>
</a>

### Pickaxe: A Typescript library for building AI agents that scale

[![Docs](https://img.shields.io/badge/docs-pickaxe.hatchet.run-E64327)](https://pickaxe.hatchet.run) [![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT) [![NPM Downloads](https://img.shields.io/npm/dm/%40hatchet-dev%2Fpickaxe)](https://www.npmjs.com/package/@hatchet-dev/pickaxe)

[![Discord](https://img.shields.io/discord/1088927970518909068?style=social&logo=discord)](https://hatchet.run/discord)
[![Twitter](https://img.shields.io/twitter/url/https/twitter.com/hatchet-dev.svg?style=social&label=Follow%20%40hatchet-dev)](https://twitter.com/hatchet_dev)
[![GitHub Repo stars](https://img.shields.io/github/stars/hatchet-dev/pickaxe?style=social)](https://github.com/hatchet-dev/pickaxe)

</div>

Pickaxe is a simple Typescript library for building AI agents that are fault-tolerant and scalable. It handles the complexities of durable execution, queueing and scheduling, allowing you to focus on writing core business logic. [It is not a framework](#philosophy).

Everything in Pickaxe is just a function that **you have written**, which makes it easy to integrate with your existing codebase and business logic. You can build agents that call tools, other agents, or any other functions you define:

```ts
import { pickaxe } from "@hatchet-dev/pickaxe";
import z from "zod";
import { myTool1, myTool2 } from "@/tools";

const MyAgentInput = z.object({
  message: z.string(),
});

const MyAgentOutput = z.object({
  message: z.string(),
});

export const myToolbox = pickaxe.toolbox({
  tools: [myTool1, myTool2],
});

export const myAgent = pickaxe.agent({
  name: "my-agent",
  executionTimeout: "15m",
  inputSchema: MyAgentInput,
  outputSchema: MyAgentOutput,
  description: "Description of what this agent does",
  fn: async (input, ctx) => {
    const result = await myToolbox.pickAndRun({
      prompt: input.message,
    });

    switch (result.name) {
      case "myTool1":
        return {
          message: `Result: ${result.output}`,
        };
      case "myTool2":
        return {
          message: `Another result: ${result.output}`,
        };
      default:
        return myToolbox.assertExhaustive(result);
    }
  },
});
```

_Not sure if Pickaxe is a good fit? [Book office hours](https://cal.com/team/hatchet/office-hours)_

## Demo

https://github.com/user-attachments/assets/b28fc406-f501-4427-9574-e4c756b29dd4

## Get started

Getting started is as easy as two commands:

```
pnpm i -g @hatchet-dev/pickaxe-cli
pickaxe create first-agent
```

This will prompt you to create a new Pickaxe project from a template to see an end to end example of Pickaxe in action.

For a full quickstart, check out our [documentation](https://pickaxe.hatchet.run/quickstart).

## Benefits

Pickaxe is centered around the benefit of **durable execution**, which creates automatic checkpoints for agents so that they can easily recover from failure or wait for external events for a very long time without consuming resources. This is achieved by using a durable task queue called [Hatchet](https://github.com/hatchet-dev/hatchet).

Additionally, Pickaxe agents are:

- **💻 Code-first** - agents are defined as code and are designed to integrate with your business logic.
- **🌐 Distributed** - all agents and tools run across a fleet of machines, where scheduling is handled gracefully by Pickaxe. When your underlying machine fails, Pickaxe takes care of rescheduling and resuming the agent on a different machine.
- **⚙️ Configurable** - simple configuration for retries, rate limiting, concurrency control, and much more
- **☁️ Runnable anywhere** - Pickaxe agents can run on any container-based platform (Hatchet, Railway, Fly.io, Porter, Kubernetes, AWS ECS, GCP Cloud Run)

## Scalability

Pickaxe is designed for scale: specifically, massive throughput and parallelism. Hatchet has run agentic workloads which spawn hundreds of thousands of tasks for a single execution, and runs billions of tasks per month.

## Philosophy

Pickaxe is not a framework. Agents and tools are simply functions that you have written. This means you can choose or build the best memory, knowledge, reasoning, or integrations. It does not impose any constraints on how you design your tools, call LLMs, or implement features like agent memory. Pickaxe is opinionated about the infrastructure layer of your agents, but not about the implementation details of your agents.

## Documentation

### Concepts

- [**Overview**](https://pickaxe.hatchet.run/concepts/overview) - an overview of the Pickaxe execution model
- [**Agents**](https://pickaxe.hatchet.run/concepts/agents) - agents are functions which call other tools and agents.
- [**Tools**](https://pickaxe.hatchet.run/concepts/tools) - tools are functions that perform specific tasks and can be called by agents.
- [**Toolbox**](https://pickaxe.hatchet.run/concepts/toolbox) - a toolbox is a collection of tools with AI-powered selection capabilities.

### API Reference

- [`pickaxe.start`](https://pickaxe.hatchet.run/api-reference/start)
- [`pickaxe.agent`](https://pickaxe.hatchet.run/api-reference/agent)
- [`pickaxe.tool`](https://pickaxe.hatchet.run/api-reference/tool)
- [`pickaxe.toolbox`](https://pickaxe.hatchet.run/api-reference/toolbox)

### Use-Cases and Patterns

- [Prompt chaining](https://pickaxe.hatchet.run/patterns/prompt-chaining)
- [Routing](https://pickaxe.hatchet.run/patterns/routing)
- [Parallelization](https://pickaxe.hatchet.run/patterns/parallelization)
- [Evaluator-optimizer](https://pickaxe.hatchet.run/patterns/evaluator-optimizer)
- [Multi-agent](https://pickaxe.hatchet.run/patterns/multi-agent)
- [Human-in-the-loop](https://pickaxe.hatchet.run/patterns/human-in-the-loop)

## Comparison to Existing Tools

### vs Frameworks (Mastra, Voltagent)

Pickaxe is **not a framework**. It is not opinionated on how you structure your LLM calls, business logic, prompts, or context; we expect you to write these yourself (though Pickaxe does have a few utilities for tool-picking and bundles the AI SDK for calling LLMs).

Pickaxe is designed to be extended and modified -- for example, you could build your own agent library on top of Pickaxe.

### vs Temporal

Pickaxe's execution model is most similar to [Temporal](https://github.com/temporalio/temporal) with a simplified execution model and with more control for workflow scheduling:

| Feature                                     | Pickaxe | Temporal |
| ------------------------------------------- | ------- | -------- |
| **Durable Execution**                       | ✅      | ✅       |
| **Event Listeners within Workflows**        | ✅      | ✅       |
| **Code-First Workflow Definitions**         | ✅      | ✅       |
| **Cron Jobs**                               | ✅      | ✅       |
| **One-Time Scheduling**                     | ✅      | ✅       |
| **Flow Control**                            | ✅      | ✅       |
| **Durable Sleep**                           | ✅      | ✅       |
| **Global Rate Limits**                      | ✅      | ❌       |
| **Event-Based Triggering**                  | ✅      | ❌       |
| **Event Streaming**                         | ✅      | ❌       |
| **DAG Support**                             | ✅      | ❌       |
| **Priority Queues**                         | ✅      | ❌       |
| **Sticky Assignment/Complex Routing Logic** | ✅      | ❌       |

## Agent Best Practices

When writing agents with Pickaxe, it's useful to follow these rules:

1. Agents should be **stateless reducers** with **no side effects**. They should not depend on external API calls, database calls, or local disk calls; their entire state should be determined by the results of their tool calls. See the [technical deep-dive](#technical-deep-dive) for more information.

2. All quanta of work should be invoked as a task or a tool call.

3. Treat **LLM calls as libraries** and **own your data lookups**: applications should not permit unconstrained agentic tool calling with data lookup. All tool calls should validate user permissions and separate data lookup from LLM calls for security reasons.

## Contributions

Contributions are welcome! Please start a discussion in [Discord](https://hatchet.run/discord) before tackling anything larger than a simple bug fix.

## Technical Deep-Dive

Pickaxe is a utility layer built on top of [Hatchet](https://github.com/hatchet-dev/hatchet). It is built on the concept of a **durable task queue**, which means that every task which gets called in Hatchet is stored in a database. This is useful because tasks can easily be replayed and recover from failure, even when the underlying hardware crashes. Another way to look at it: Hatchet makes _distributed systems incredibly easy to deploy and maintain_.

For agents, this is particularly useful because they are extremely long-running, and thus need to be resilient to hardware failure. Agents also need to manage third-party rate limits and need concurrency control to prevent the system from getting overwhelmed.

The first rule of agents is that they should be _stateless reducers with no side effects_. To understand why, it's necessary to understand some concepts of durable execution. At its core, a function which executes durably stores an event log of all functions it has executed up to that point. Let's say an agent has called the tools `search_documents`, `get_document`, and is in the middle of processing `extract_from_document`. Its execution history looks like:

```
Event log:
-> Start search_documents
-> Finish search_documents
-> Start get_document
-> Finish get_document
-> Start extract_from_document...
```

Now, let's say that the machine which the agent is running on crashes during the last step. In order to recover from failure, Pickaxe will automatically replay all steps up to this point in the execution history:

```
Event log:
-> Start search_documents (replayed)
-> Finish search_documents (replayed)
-> Start get_document (replayed)
-> Finish get_document (replayed)
-> Start extract_from_document (replayed)
-> (later) Finish extract_from_document
```

In other words, the execution history is cached by Pickaxe, which allows the agent to recover gracefully from failure, instead of having to replay a bunch of work. Another way to think about it is that the agent automatically "checkpoints" its state.

This execution model is much more powerful when there's a requirement to wait for external systems, like a human reviewer or external event. Building a system that's resilient to failure becomes much more difficult, because if the agent starts from scratch, it may have lost the event which allowed execution to continue. In this model, the event automatically gets stored and replayed.

Beyond Hatchet, there are two other points of inspiration for Pickaxe:

- [12-factor agents](https://github.com/humanlayer/12-factor-agents) -- this is the foundation for why Pickaxe advocates owning your control flow, context window, and prompts
- Anthropic's [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents) -- we have ensured that each pattern documented in Anthropic's post are compatible with Pickaxe
