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

const waitForSchema = z.object({
  type: z.enum(["selector", "urlContains"]),
  value: z.string().min(1),
});

export const loginRecipeSchema = z.object({
  loginUrl: z.string().url().refine((u) => /^https?:\/\//.test(u), { message: "loginUrl must be http(s)" }),
  steps: z.array(z.object({
    action: z.enum(["fill", "click"]),
    selector: z.string().min(1),
    valueRef: z.string().optional(),
  })),
  waitFor: waitForSchema,
  successCheck: waitForSchema,
});
export type LoginRecipeBody = z.infer<typeof loginRecipeSchema>;

export const createCredentialSchema = z.object({
  label: z.string().min(1).max(120),
  secret: z.string().min(1),
});
export type CreateCredentialBody = z.infer<typeof createCredentialSchema>;

export const statementSchema = z.object({
  conformanceStatus: z.enum(["PARZIALMENTE", "NON_CONFORME"]),
  nonAccessibleContent: z.object({
    inosservanzaL4_2004: z.array(z.string()),
    onereSproporzionato: z.array(z.string()),
    fuoriAmbito: z.array(z.string()),
  }),
  feedbackContact: z.string().min(1).nullable().optional(),
  enforcementRoute: z.string().nullable().optional(),
});
export type StatementBody = z.infer<typeof statementSchema>;
