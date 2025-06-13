<div align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./static/pickaxe_dark.png">
  <img width="200" alt="Hatchet Logo" src="./static/pickaxe_light.png">
</picture>
</a>
</div>

## Pickaxe: a Typescript library for building distributed agents

Pickaxe is a library for building distributed agents, built on top of [Hatchet](https://github.com/hatchet-dev/hatchet). Pickaxe agents are:

- **Distributed by default** - all agents and tools run across a fleet of machines, where scheduling is handled gracefully by Hatchet
- **Scalable** - Pickaxe agents allow simple configuration for retries, rate limiting, concurrency control, and much more
- **Durable by default** - all tools called by the agent are sent through a durable message boundary
- **Agnostic to execution pattern** - Pickaxe agents can be written as loops, scatter/gather workflows, or directed acyclic graphs

## Get started

Getting started is as easy as two commands:

```
pnpm i -g @hatchet-dev/pickaxe-cli
pickaxe create first-agent
```

## Concepts

- **Agents** - an agent is simply a loop that calls **tools**
- **Toolbox** - a collection of tools that are available to an agent
- **Tools** - a tool is a function available to an agent. A tool can call other tools, agents, or integrations.
- **Integrations** - an integration is a third-party API call made by a tool

## Is Pickaxe a framework?

Yes and no. Pickaxe is **not opinionated** on how you should structure your LLM calls, business logic, prompts, or contexts. It is designed to be extended and modified -- for example, you could build your own agent library on top of Pickaxe.

However, Pickaxe contains opinions on best practices for deploying agents into production, and lots of the decisions in the project are designed with these best practices in mind. See [agent best practices](#agent-best-practices) for more information.

## Agent Best Practices

When writing agents with Pickaxe, it's useful to follow these rules:

1. Agents should be **stateless reducers** with **no side effects**. They should not depend on external API calls, database calls, or local disk calls; their entire state should be determined by the results of their tool calls. See the [technical deep-dive](#technical-deep-dive) for more information.

2. All quanta of work should be invoked as a task or a tool call.

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
- Anthropic's [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents) -- we have ensured that each pattern documented in this post are compatible with Pickaxe
