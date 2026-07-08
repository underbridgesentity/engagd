import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { currentUserOrgs } from "@/lib/tenancy";

// Post-login landing: route the user to their first organisation, or to
// onboarding when they have none.
export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const orgs = await currentUserOrgs(session.user.id);
  if (orgs.length === 0) redirect("/onboarding");
  redirect(`/o/${orgs[0].org.slug}`);
}
