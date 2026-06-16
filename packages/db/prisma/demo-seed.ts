import bcrypt from "bcryptjs";
import { prisma } from "../src/client.js";
import {
  createProject, createDomain, createScan, markScanRunning,
  persistPageWithIssues, markScanDone, persistScanScoring, loadCurrentScanIssues,
} from "../src/index.js";
import { WCAG_CATALOG } from "@accessscan/scanner";

type State = "PASS" | "FAIL" | "NEEDS_MANUAL_REVIEW";

async function main() {
  // 1. admin user (login: admin@accessscan.local / admin1234, role ADMIN)
  const email = "admin@accessscan.local";
  const passwordHash = await bcrypt.hash("admin1234", 12);
  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Admin", passwordHash, role: "ADMIN" },
  });

  // 2. project + domain
  const project = await createProject({ name: "Demo Shop", ownerId: admin.id });
  const domain = await createDomain({ projectId: project.id, baseUrl: "https://demo.example" });

  // 3. a DONE scan with two real issues on the home page
  const scan = await createScan(domain.id);
  await markScanRunning(scan.id, { axe: "4.11.4", playwright: "1.61.0", profile: "wcag21aa-en301549" });
  await persistPageWithIssues(scan.id, { url: "https://demo.example/", httpStatus: 200, depth: 0, discoveredVia: "BFS" }, [
    { ruleId: "color-contrast", wcagSc: "1.4.3", en301549Clause: "9.1.4.3", impact: "SERIOUS", help: "Gli elementi devono avere contrasto sufficiente", helpUrl: "https://dequeuniversity.com/rules/axe/4.11/color-contrast", htmlSnippet: "<p style=\"color:#aaa\">testo</p>", targetSelector: "main > p", failureSummary: "Contrasto 2.1:1, richiesto 4.5:1", fingerprint: "fp-cc-1" },
    { ruleId: "image-alt", wcagSc: "1.1.1", en301549Clause: "9.1.1.1", impact: "CRITICAL", help: "Le immagini informative devono avere un alt", helpUrl: "https://dequeuniversity.com/rules/axe/4.11/image-alt", htmlSnippet: "<img src=\"hero.jpg\">", targetSelector: "img.hero", failureSummary: "Aggiungi attributo alt descrittivo", fingerprint: "fp-ia-1" },
  ]);

  // 4. derive 50 criterion states: full→PASS, the two failing SCs→FAIL, rest→NEEDS_MANUAL_REVIEW
  const failSCs = new Set<string>(["1.4.3", "1.1.1"]);
  const states = new Map<string, State>();
  let pass = 0, fail = 0, needsReview = 0;
  for (const e of WCAG_CATALOG) {
    let st: State;
    if (failSCs.has(e.sc)) { st = "FAIL"; fail += 1; }
    else if (e.automatability === "full") { st = "PASS"; pass += 1; }
    else { st = "NEEDS_MANUAL_REVIEW"; needsReview += 1; }
    states.set(e.sc, st);
  }
  const fullCount = WCAG_CATALOG.filter((e) => e.automatability === "full").length;

  const curr = await loadCurrentScanIssues(scan.id);
  await persistScanScoring({
    scanId: scan.id,
    domainId: domain.id,
    analysis: {
      siteScore: 62, pageScores: [62], verdict: "NON_CONFORME", manualReviewLabel: false,
      coverageRatio: fullCount / WCAG_CATALOG.length,
      counts: { pass, fail, needsReview }, states,
    } as never,
    prevIssues: [], currIssues: curr,
  });
  await markScanDone(scan.id, 1);

  console.log(`Demo seeded.\n  login: admin@accessscan.local / admin1234 (ADMIN)\n  project: ${project.name}\n  domain: ${domain.registrableDomain} (${domain.id})\n  scan:   ${scan.id} (DONE, verdict NON_CONFORME, ${needsReview} criteri da revisionare)`);
}

main().finally(() => prisma.$disconnect());
