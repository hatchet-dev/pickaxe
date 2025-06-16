import { simpleAgent } from "./agents/simple.agent";

async function main() {
  const result = await simpleAgent.run({
    message: "what holiday is it in toronto?",
  });
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error).finally(() => {
  process.exit(0);
});