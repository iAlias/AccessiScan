CREATE TYPE "AiReviewStatus" AS ENUM ('IDLE', 'RUNNING', 'DONE', 'FAILED', 'CANCELED');

ALTER TABLE "CriterionResult"
  ADD COLUMN "aiState" "CriterionState",
  ADD COLUMN "aiReasoning" TEXT,
  ADD COLUMN "aiConfidence" DOUBLE PRECISION,
  ADD COLUMN "aiEvidence" TEXT,
  ADD COLUMN "aiReviewedAt" TIMESTAMP(3);

ALTER TABLE "Scan"
  ADD COLUMN "aiReviewStatus" "AiReviewStatus" NOT NULL DEFAULT 'IDLE',
  ADD COLUMN "aiReviewError" TEXT,
  ADD COLUMN "aiReviewCancelRequested" BOOLEAN NOT NULL DEFAULT false;
