import { simpleAgent } from "./agents/simple/agent";

async function main() {
  const result = await simpleAgent.run({
    message: "What is the weather in Tokyo?",
  });
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error).finally(() => {
  process.exit(0);
});