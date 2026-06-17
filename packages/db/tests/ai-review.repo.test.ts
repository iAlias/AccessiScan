import { beforeEach, afterAll, expect, test } from "vitest";
import { prisma, createProject, createDomain, createScan } from "../src/index.js";
import { persistAiSuggestions, getAiSuggestions, setAiReviewStatus, isAiReviewCancelRequested, pendingManualCriteria } from "../src/repositories/ai-review.js";
import { resetDb } from "./helpers/reset-db.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function scan() {
  const u = await prisma.user.create({ data: { email: "o@x.it", name: "O", passwordHash: "x", role: "ADMIN" } });
  const p = await createProject({ name: "P", ownerId: u.id });
  const d = await createDomain({ projectId: p.id, baseUrl: "https://a.it" });
  return (await createScan(d.id)).id;
}

test("persistAiSuggestions writes ai* and never touches state/source", async () => {
  const scanId = await scan();
  await prisma.criterionResult.create({ data: { scanId, wcagSc: "2.4.6", state: "NEEDS_MANUAL_REVIEW", source: "AUTOMATED" } });
  await persistAiSuggestions(scanId, [{ wcagSc: "2.4.6", verdict: "FAIL", confidence: 0.8, reasoning: "bad", evidence: "u — sel" }]);
  const row = await prisma.criterionResult.findFirstOrThrow({ where: { scanId, wcagSc: "2.4.6" } });
  expect(row.aiState).toBe("FAIL");
  expect(row.aiReasoning).toBe("bad");
  expect(row.state).toBe("NEEDS_MANUAL_REVIEW"); // unchanged
  expect(row.source).toBe("AUTOMATED");           // unchanged
});

test("pendingManualCriteria returns only NEEDS_MANUAL_REVIEW criteria", async () => {
  const scanId = await scan();
  await prisma.criterionResult.createMany({ data: [
    { scanId, wcagSc: "2.4.6", state: "NEEDS_MANUAL_REVIEW" },
    { scanId, wcagSc: "1.4.3", state: "FAIL" },
  ] });
  expect(await pendingManualCriteria(scanId)).toEqual(["2.4.6"]);
});

test("ai review status + cancel flag round-trip", async () => {
  const scanId = await scan();
  await setAiReviewStatus(scanId, "RUNNING");
  expect((await prisma.scan.findUniqueOrThrow({ where: { id: scanId } })).aiReviewStatus).toBe("RUNNING");
  await prisma.scan.update({ where: { id: scanId }, data: { aiReviewCancelRequested: true } });
  expect(await isAiReviewCancelRequested(scanId)).toBe(true);
  expect(await getAiSuggestions(scanId)).toEqual([]);
});
