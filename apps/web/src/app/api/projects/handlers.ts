import { createProject, listProjects } from "@accessscan/db";
import { createProjectSchema } from "@accessscan/validation";

export interface HandlerResult<T> {
  status: number;
  body: T;
}

export async function handleCreateProject(
  input: unknown,
  ownerId: string,
): Promise<HandlerResult<unknown>> {
  const parsed = createProjectSchema.safeParse(input);
  if (!parsed.success) return { status: 400, body: { error: parsed.error.flatten() } };
  const project = await createProject({ name: parsed.data.name, ownerId });
  return { status: 201, body: project };
}

export async function handleListProjects(ownerId: string): Promise<HandlerResult<unknown>> {
  return { status: 200, body: await listProjects(ownerId) };
}
