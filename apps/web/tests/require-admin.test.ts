import { expect, test, vi } from "vitest";

vi.mock("../src/lib/auth.js", () => ({ auth: vi.fn() }));
import { auth } from "../src/lib/auth.js";
import { requireAdminRole, UnauthorizedError } from "../src/lib/require-session.js";

test("ADMIN passes", async () => {
  (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
  const s = await requireAdminRole();
  expect(s.user?.role).toBe("ADMIN");
});
test("MEMBER throws UnauthorizedError", async () => {
  (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: "u2", role: "MEMBER" } });
  await expect(requireAdminRole()).rejects.toBeInstanceOf(UnauthorizedError);
});
test("no session throws", async () => {
  (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  await expect(requireAdminRole()).rejects.toBeInstanceOf(UnauthorizedError);
});
