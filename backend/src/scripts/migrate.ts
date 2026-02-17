import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function runMigration() {
  try {
    console.log("Starting database migration...");
    const { stdout, stderr } = await execAsync("npx prisma migrate deploy");

    console.log("Migration output:", stdout);
    if (stderr) {
      console.error("Migration errors:", stderr);
    }

    console.log("Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
