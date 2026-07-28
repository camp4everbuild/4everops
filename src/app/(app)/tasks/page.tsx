import { redirect } from "next/navigation";

// Tasks and jobs now live on the Home page — this route just keeps old
// links/bookmarks working instead of 404ing.
export default function TasksPage() {
  redirect("/");
}
