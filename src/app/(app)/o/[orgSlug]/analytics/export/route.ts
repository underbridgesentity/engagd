import { requireOrg } from "@/lib/tenancy";
import { getEntitlements } from "@/lib/entitlements";
import { orgAnalytics } from "@/lib/analytics";

function csvField(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params;
  const ctx = await requireOrg(orgSlug);
  const ent = await getEntitlements(ctx.organisationId);
  if (ent.analytics !== "full") {
    return new Response(
      "CSV export needs full analytics. Upgrade your plan to use it.",
      { status: 403 }
    );
  }

  const rows = await orgAnalytics(ctx.organisationId);
  const header = [
    "event",
    "status",
    "invited",
    "invites_sent",
    "invites_opened",
    "open_rate_pct",
    "yes",
    "no",
    "maybe",
    "waitlisted",
    "rsvp_conversion_pct",
  ];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        csvField(r.name),
        r.status,
        r.invited,
        r.sent,
        r.opened,
        r.sent > 0 ? Math.round((r.opened / r.sent) * 100) : 0,
        r.yes,
        r.no,
        r.maybe,
        r.waitlisted,
        r.invited > 0 ? Math.round((r.yes / r.invited) * 100) : 0,
      ].join(",")
    ),
  ];

  return new Response(lines.join("\n") + "\n", {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="engagd-analytics-${orgSlug}.csv"`,
    },
  });
}
