import { prisma } from "../client.js";
import type { Project } from "@prisma/client";

export interface CreateProjectInput {
  name: string;
  ownerId: string;
}

export function createProject(input: CreateProjectInput): Promise<Project> {
  return prisma.project.create({ data: { name: input.name, ownerId: input.ownerId } });
}

export function listProjects(ownerId: string) {
  return prisma.project.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { domains: true } } },
  });
}

export function getProject(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: { domains: true, _count: { select: { domains: true } } },
  });
}
