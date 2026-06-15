import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(1).max(120),
});
export type CreateProjectBody = z.infer<typeof createProjectSchema>;

const crawlConfigSchema = z
  .object({
    maxPages: z.number().int().min(1).max(5000),
    maxDepth: z.number().int().min(0).max(10),
    concurrency: z.number().int().min(1).max(16),
    sameDomainDelaySecs: z.number().min(0).max(10),
    respectRobotsTxt: z.boolean(),
    includePatterns: z.array(z.string()),
    excludePatterns: z.array(z.string()),
  })
  .partial();

export const createDomainSchema = z.object({
  baseUrl: z.string().url().refine((u) => /^https?:\/\//.test(u), {
    message: "baseUrl must be http(s)",
  }),
  crawlConfig: crawlConfigSchema.optional(),
  standardProfile: z.string().optional(),
  scheduleCron: z.string().nullable().optional(),
});
export type CreateDomainBody = z.infer<typeof createDomainSchema>;
