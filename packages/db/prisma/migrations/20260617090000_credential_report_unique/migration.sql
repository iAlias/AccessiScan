-- Enforce per-domain unique credential labels (ambiguous secret resolution otherwise)
CREATE UNIQUE INDEX "Credential_domainId_label_key" ON "Credential"("domainId", "label");

-- One report per (scan, type): makes recordReport upsert atomic and prevents duplicates
CREATE UNIQUE INDEX "Report_scanId_type_key" ON "Report"("scanId", "type");
