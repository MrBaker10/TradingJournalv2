import { redirect } from "next/navigation";

// There is no front page. Signed in, the journal starts at the dashboard;
// signed out, src/proxy.ts has already sent the request to /login.
export default function Home() {
  redirect("/dashboard");
}
