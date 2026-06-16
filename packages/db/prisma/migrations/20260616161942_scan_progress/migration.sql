-- AlterEnum
ALTER TYPE "ScanStatus" ADD VALUE 'CANCELED';

-- AlterTable
ALTER TABLE "Scan" ADD COLUMN     "cancelRequested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "currentUrl" TEXT,
ADD COLUMN     "pagesFound" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "phase" TEXT;
