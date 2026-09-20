import "dotenv/config";
import { runSeed } from "./seed";
import { pool } from "./index";

async function main() {
  const force = process.argv.includes("--force");
  const result = await runSeed({ force });
  console.log(
    `Seed complete. flights=${result.flights} people=${result.people}`,
  );
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
