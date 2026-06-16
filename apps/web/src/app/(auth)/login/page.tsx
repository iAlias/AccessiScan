import { signIn } from "@/lib/auth.js";

export default function LoginPage() {
  async function login(formData: FormData) {
    "use server";
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  }
  return (
    <form action={login}>
      <h1>Accedi ad AccessScan</h1>
      <label>Email<input name="email" type="email" required /></label>
      <label>Password<input name="password" type="password" required /></label>
      <button type="submit">Accedi</button>
    </form>
  );
}
