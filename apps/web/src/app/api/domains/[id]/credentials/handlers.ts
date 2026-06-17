import { prisma, createCredential, listCredentials, deleteCredential } from "@accessscan/db";
import { createCredentialSchema } from "@accessscan/validation";
import type { HandlerResult } from "../../../projects/handlers.js";

// SECURITY: handlers here only ever return credential metadata (id, label,
// keyId, createdAt). The decrypted secret is NEVER returned over the API — it
// is resolved at scan time only, inside the scanner process.

export async function handleCreateCredential(domainId: string, input: unknown): Promise<HandlerResult<unknown>> {
  const domain = await prisma.domain.findUnique({ where: { id: domainId } });
  if (!domain) return { status: 404, body: { error: "domain not found" } };
  const parsed = createCredentialSchema.safeParse(input);
  if (!parsed.success) return { status: 400, body: { error: parsed.error.flatten() } };
  // Labels must be unique per domain, otherwise secret resolution by label is ambiguous.
  const existing = await prisma.credential.findFirst({ where: { domainId, label: parsed.data.label }, select: { id: true } });
  if (existing) return { status: 409, body: { error: "a credential with this label already exists for the domain" } };
  const meta = await createCredential({ domainId, label: parsed.data.label, secret: parsed.data.secret });
  return { status: 201, body: meta };
}

export async function handleListCredentials(domainId: string): Promise<HandlerResult<unknown>> {
  const metas = await listCredentials(domainId);
  return { status: 200, body: metas };
}

export async function handleDeleteCredential(domainId: string, credentialId: string): Promise<HandlerResult<unknown>> {
  const row = await prisma.credential.findUnique({ where: { id: credentialId }, select: { domainId: true } });
  if (!row || row.domainId !== domainId) return { status: 404, body: { error: "credential not found" } };
  await deleteCredential(credentialId);
  return { status: 200, body: { ok: true } };
}
