import { redirect } from "next/navigation";

export default function TeamSettingsPage() {
  redirect("/dashboard/settings?tab=team");
}
