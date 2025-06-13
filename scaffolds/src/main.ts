import { pickaxe } from "./client";

async function main() {
  await pickaxe.start();
}

main().catch(console.error).finally(() => {
  process.exit(0);
});