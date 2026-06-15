import { prisma } from "../client.js";
import type { Domain } from "@prisma/client";
import { registrableDomain } from "../lib/registrable-domain.js";
import { defaultCrawlConfig, type CrawlConfig } from "../lib/crawl-defaults.js";

export interface CreateDomainInput {
  projectId: string;
  baseUrl: string;
  crawlConfig?: Partial<CrawlConfig>;
  standardProfile?: string;
  scheduleCron?: string | null;
}

export function createDomain(input: CreateDomainInput): Promise<Domain> {
  const crawlConfig: CrawlConfig = { ...defaultCrawlConfig, ...input.crawlConfig };
  return prisma.domain.create({
    data: {
      projectId: input.projectId,
      baseUrl: input.baseUrl,
      registrableDomain: registrableDomain(input.baseUrl),
      crawlConfig: crawlConfig as object,
      ...(input.standardProfile ? { standardProfile: input.standardProfile } : {}),
      scheduleCron: input.scheduleCron ?? null,
    },
  });
}

export function listDomains(projectId: string) {
  return prisma.domain.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
}

export function getDomain(id: string) {
  return prisma.domain.findUnique({
    where: { id },
    include: { loginRecipe: true, project: true },
  });
}
