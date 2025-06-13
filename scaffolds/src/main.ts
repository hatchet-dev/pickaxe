import { pickaxe } from "@/client";
import { simpleAgent, simpleToolbox } from "./agents/simple/agent";

async function main() {
  await pickaxe.start({
    agents: [simpleAgent],
    toolboxes: [simpleToolbox],
  });
}

main().catch(console.error).finally(() => {
  process.exit(0);
});