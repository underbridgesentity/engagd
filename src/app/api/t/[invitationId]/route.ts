import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { attendees, invitations } from "@/db/schema";

// A transparent 1x1 gif.
const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

function gifResponse() {
  return new Response(new Uint8Array(GIF), {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(GIF.length),
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ invitationId: string }> }
) {
  const { invitationId } = await params;

  try {
    // First open wins; later opens do not move the timestamp.
    const [invitation] = await db
      .update(invitations)
      .set({ openedAt: new Date() })
      .where(and(eq(invitations.id, invitationId), isNull(invitations.openedAt)))
      .returning({ attendeeId: invitations.attendeeId });

    if (invitation) {
      // Only step invited -> opened. Responses always outrank an open.
      await db
        .update(attendees)
        .set({ rsvpStatus: "opened" })
        .where(and(eq(attendees.id, invitation.attendeeId), eq(attendees.rsvpStatus, "invited")));
    }
  } catch {
    // Tracking must never break the image response.
  }

  return gifResponse();
}
