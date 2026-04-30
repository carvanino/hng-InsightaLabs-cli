#!/usr/bin/env node
import { program } from "commander";
import { registerAuthCommands } from "../src/commands/auth.js";
import { registerProfileCommands } from "../src/commands/profiles.js";

program
  .name("insighta")
  .description("Insighta Labs CLI — Profile Intelligence Platform")
  .version("1.0.0");

registerAuthCommands(program);
registerProfileCommands(program);

program.parse(process.argv);
