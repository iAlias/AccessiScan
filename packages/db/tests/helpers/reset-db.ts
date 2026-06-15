import { prisma } from "../../src/client.js";

const TABLES = [
  "Report", "ScanDiff", "ScoreHistory", "CriterionResult", "Issue", "Page",
  "Scan", "Credential", "LoginRecipe", "AccessibilityStatement", "Domain",
  "Project", "User",
];

export async function resetDb(): Promise<void> {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE;`,
  );
}
