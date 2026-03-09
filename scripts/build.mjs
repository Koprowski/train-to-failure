import { spawnSync } from "node:child_process";

const env = { ...process.env };

const steps = [
  "npx prisma generate",
  "npx next build",
];

for (const step of steps) {
  const result = spawnSync(step, {
    stdio: "inherit",
    env,
    shell: true,
  });

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
