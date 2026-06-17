import { beforeEach, afterAll, expect, test } from "vitest";
import { prisma, createProject, createDomain, createScan, persistPageWithIssues } from "@accessscan/db";
import { resetDb } from "../../db/tests/helpers/reset-db.js";
import { runAiReviewForScan } from "../src/run-for-scan.js";
import { fakeProvider } from "../src/provider.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

test("runAiReviewForScan persists an AI suggestion for a pending criterion", async () => {
  const u = await prisma.user.create({ data: { email: "o@x.it", name: "O", passwordHash: "x", role: "ADMIN" } });
  const p = await createProject({ name: "P", ownerId: u.id });
  const d = await createDomain({ projectId: p.id, baseUrl: "https://a.it" });
  const s = await createScan(d.id);
  await persistPageWithIssues(s.id, { url: "https://a.it/p", httpStatus: 200, depth: 0, discoveredVia: "BFS" }, []);
  await prisma.criterionResult.create({ data: { scanId: s.id, wcagSc: "2.4.6", state: "NEEDS_MANUAL_REVIEW" } });

  await runAiReviewForScan(s.id, {
    provider: fakeProvider({ verdicts: [{ wcagSc: "2.4.6", verdict: "PASS", confidence: 0.9, reasoning: "ok" }] }),
    capture: async (url) => ({ url, a11yTree: "T", domExcerpt: "D", axeFindings: [] }),
  });

  const row = await prisma.criterionResult.findFirstOrThrow({ where: { scanId: s.id, wcagSc: "2.4.6" } });
  expect(row.aiState).toBe("PASS");
  expect((await prisma.scan.findUniqueOrThrow({ where: { id: s.id } })).aiReviewStatus).toBe("DONE");
});
