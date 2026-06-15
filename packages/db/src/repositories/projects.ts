import { prisma } from "../client.js";
import type { Project } from "@prisma/client";

export interface CreateProjectInput {
  name: string;
  ownerId: string;
}

export function createProject(input: CreateProjectInput): Promise<Project> {
  return prisma.project.create({ data: { name: input.name, ownerId: input.ownerId } });
}

export function listProjects() {
  return prisma.project.findMany({
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
