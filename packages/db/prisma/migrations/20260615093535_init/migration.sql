-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('QUEUED', 'RUNNING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "ScanTrigger" AS ENUM ('MANUAL', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "Verdict" AS ENUM ('CONFORME', 'PARZIALMENTE', 'NON_CONFORME', 'NON_DETERMINABILE');

-- CreateEnum
CREATE TYPE "DiscoveredVia" AS ENUM ('SITEMAP', 'BFS', 'MANUAL');

-- CreateEnum
CREATE TYPE "AuthState" AS ENUM ('ANON', 'AUTHED');

-- CreateEnum
CREATE TYPE "Impact" AS ENUM ('CRITICAL', 'SERIOUS', 'MODERATE', 'MINOR');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'FIXED', 'IGNORED', 'SNOOZED');

-- CreateEnum
CREATE TYPE "CriterionState" AS ENUM ('PASS', 'FAIL', 'NEEDS_MANUAL_REVIEW', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "ResultSource" AS ENUM ('AUTOMATED', 'MANUAL');

-- CreateEnum
CREATE TYPE "ConformanceStatus" AS ENUM ('CONFORME', 'PARZIALMENTE', 'NON_CONFORME');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('PDF', 'CSV', 'JSON');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Domain" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "registrableDomain" TEXT NOT NULL,
    "crawlConfig" JSONB NOT NULL,
    "standardProfile" TEXT NOT NULL DEFAULT 'wcag21aa-en301549',
    "scheduleCron" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Domain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginRecipe" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "loginUrl" TEXT NOT NULL,
    "steps" JSONB NOT NULL,
    "waitFor" JSONB NOT NULL,
    "successCheck" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoginRecipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Credential" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "wrappedDek" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Credential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scan" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "status" "ScanStatus" NOT NULL DEFAULT 'QUEUED',
    "trigger" "ScanTrigger" NOT NULL DEFAULT 'MANUAL',
    "engineVersions" JSONB,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "pagesScanned" INTEGER NOT NULL DEFAULT 0,
    "score" DOUBLE PRECISION,
    "verdict" "Verdict",
    "coverageRatio" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Scan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "httpStatus" INTEGER,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "discoveredVia" "DiscoveredVia" NOT NULL DEFAULT 'BFS',
    "authState" "AuthState" NOT NULL DEFAULT 'ANON',
    "pageScore" DOUBLE PRECISION,
    "scannedAt" TIMESTAMP(3),

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "wcagSc" TEXT NOT NULL,
    "en301549Clause" TEXT,
    "impact" "Impact",
    "help" TEXT,
    "helpUrl" TEXT,
    "htmlSnippet" TEXT,
    "targetSelector" TEXT NOT NULL,
    "failureSummary" TEXT,
    "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',
    "assigneeId" TEXT,
    "fingerprint" TEXT NOT NULL,
    "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CriterionResult" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "wcagSc" TEXT NOT NULL,
    "en301549Clause" TEXT,
    "state" "CriterionState" NOT NULL,
    "source" "ResultSource" NOT NULL DEFAULT 'AUTOMATED',
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "CriterionResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreHistory" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "verdict" "Verdict" NOT NULL,
    "failCount" INTEGER NOT NULL,
    "needsReviewCount" INTEGER NOT NULL,
    "passCount" INTEGER NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanDiff" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "prevScanId" TEXT,
    "newIssueIds" JSONB NOT NULL,
    "fixedIssueIds" JSONB NOT NULL,
    "persistentIssueIds" JSONB NOT NULL,

    CONSTRAINT "ScanDiff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessibilityStatement" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "conformanceStatus" "ConformanceStatus" NOT NULL,
    "nonAccessibleContent" JSONB NOT NULL,
    "method" TEXT NOT NULL,
    "feedbackContact" TEXT,
    "enforcementRoute" TEXT,
    "lastUpdated" TIMESTAMP(3),
    "nextReviewDue" TIMESTAMP(3),

    CONSTRAINT "AccessibilityStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "verapdfPassed" BOOLEAN,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "LoginRecipe_domainId_key" ON "LoginRecipe"("domainId");

-- CreateIndex
CREATE INDEX "Issue_scanId_idx" ON "Issue"("scanId");

-- CreateIndex
CREATE INDEX "Issue_fingerprint_idx" ON "Issue"("fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "CriterionResult_scanId_wcagSc_key" ON "CriterionResult"("scanId", "wcagSc");

-- CreateIndex
CREATE UNIQUE INDEX "ScoreHistory_scanId_key" ON "ScoreHistory"("scanId");

-- CreateIndex
CREATE INDEX "ScoreHistory_domainId_capturedAt_idx" ON "ScoreHistory"("domainId", "capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ScanDiff_scanId_key" ON "ScanDiff"("scanId");

-- CreateIndex
CREATE UNIQUE INDEX "AccessibilityStatement_domainId_key" ON "AccessibilityStatement"("domainId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Domain" ADD CONSTRAINT "Domain_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginRecipe" ADD CONSTRAINT "LoginRecipe_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CriterionResult" ADD CONSTRAINT "CriterionResult_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CriterionResult" ADD CONSTRAINT "CriterionResult_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreHistory" ADD CONSTRAINT "ScoreHistory_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreHistory" ADD CONSTRAINT "ScoreHistory_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanDiff" ADD CONSTRAINT "ScanDiff_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessibilityStatement" ADD CONSTRAINT "AccessibilityStatement_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
