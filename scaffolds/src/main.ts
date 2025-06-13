import { pickaxe } from "@/pickaxe-client";
import simple from "./agents/simple/agent";

pickaxe.start({
  register: [simple],
  // toolboxes: [simpleToolbox],
});