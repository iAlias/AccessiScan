import { listProjects } from "@accessscan/db";
import { requireSession } from "@/lib/require-session.js";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  await requireSession();
  const projects = await listProjects();
  return (
    <section>
      <h1>Progetti</h1>
      <ul>
        {projects.map((p) => (
          <li key={p.id}>{p.name} — {p._count.domains} domini</li>
        ))}
      </ul>
    </section>
  );
}
