import { redirect } from "next/navigation";

export default function Home() {
  // Redirect admin users to /admin, clients to /client later
  redirect("/admin");
}
