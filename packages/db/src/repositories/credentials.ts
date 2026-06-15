import { prisma } from "../client.js";
import type { Credential } from "@prisma/client";
import { encryptSecret, decryptSecret } from "../lib/vault.js";

export interface CreateCredentialInput {
  domainId: string;
  label: string;
  secret: string;
}

export type CredentialMeta = Pick<Credential, "id" | "domainId" | "label" | "keyId" | "createdAt">;

export async function createCredential(input: CreateCredentialInput): Promise<CredentialMeta> {
  const enc = encryptSecret(input.secret);
  const row = await prisma.credential.create({
    data: { domainId: input.domainId, label: input.label, ...enc },
  });
  return { id: row.id, domainId: row.domainId, label: row.label, keyId: row.keyId, createdAt: row.createdAt };
}

export function listCredentials(domainId: string): Promise<CredentialMeta[]> {
  return prisma.credential.findMany({
    where: { domainId },
    orderBy: { createdAt: "asc" },
    select: { id: true, domainId: true, label: true, keyId: true, createdAt: true },
  });
}

export async function getCredentialSecret(id: string): Promise<string> {
  const row = await prisma.credential.findUnique({ where: { id } });
  if (!row) throw new Error(`Credential not found: ${id}`);
  return decryptSecret(row);
}

export async function resolveSecretsForDomain(domainId: string): Promise<Map<string, string>> {
  const rows = await prisma.credential.findMany({ where: { domainId } });
  const map = new Map<string, string>();
  for (const row of rows) map.set(row.label, decryptSecret(row));
  return map;
}

export function deleteCredential(id: string): Promise<Credential> {
  return prisma.credential.delete({ where: { id } });
}
