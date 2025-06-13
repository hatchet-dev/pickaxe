import { simpleAgent } from "./agents/simple/agent";

async function main() {
  await simpleAgent.run({
    message: "What is the weather in New York?",
  });
}

main().catch(console.error).finally(() => {
  process.exit(0);
});