import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth.js";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  async function login(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: "/",
      });
    } catch (e) {
      // signIn throws a redirect on success (must propagate); only auth failures
      // are turned into a friendly error instead of crashing the page.
      if (e instanceof AuthError) redirect("/login?error=1");
      throw e;
    }
  }
  return (
    <form action={login}>
      <h1>Accedi ad AccessScan</h1>
      {error && <p role="alert">Email o password non corretti.</p>}
      <label>Email<input name="email" type="email" required /></label>
      <label>Password<input name="password" type="password" required /></label>
      <button type="submit">Accedi</button>
    </form>
  );
}
