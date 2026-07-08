import { requireOrg } from "@/lib/tenancy";
import { getEntitlements } from "@/lib/entitlements";
import { orgAnalyticsFull } from "@/lib/analytics";

function csvField(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function pctCell(value: number | null): string {
  return value === null ? "" : String(Math.round(value * 100));
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

  const rows = await orgAnalyticsFull(ctx.organisationId);
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
    "checked_in",
    "check_in_rate_pct",
    "polls",
    "poll_votes",
    "poll_voters",
    "poll_participation_pct",
    "questions_submitted",
    "questions_approved",
    "questions_answered",
    "question_upvotes",
    "surveys",
    "survey_responses",
    "attendees_with_email",
    "survey_response_rate_pct",
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
        pctCell(r.openRate),
        r.yes,
        r.no,
        r.maybe,
        r.waitlisted,
        pctCell(r.rsvpConversion),
        r.checkedIn,
        pctCell(r.checkInRate),
        r.pollCount,
        r.pollVotes,
        r.pollVoters,
        pctCell(r.pollParticipation),
        r.questionsSubmitted,
        r.questionsApproved,
        r.questionsAnswered,
        r.questionUpvotes,
        r.surveyCount,
        r.surveyResponses,
        r.withEmail,
        pctCell(r.surveyResponseRate),
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
