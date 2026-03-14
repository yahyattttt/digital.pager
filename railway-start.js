import { spawn } from "child_process";

const child = spawn("node", ["dist/index.js"], {
  stdio: "inherit",
  shell: true,
});

child.on("close", (code) => {
  process.exit(code);
});
