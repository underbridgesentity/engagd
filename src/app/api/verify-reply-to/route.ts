import { eq } from "drizzle-orm";
import { db } from "@/db";
import { replyToVerifications } from "@/db/schema";
import { audit } from "@/lib/audit";

// Verification landing. The query carries only the opaque row token, never an
// email address or any other PII.
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");

  const page = (title: string, body: string, ok: boolean) =>
    new Response(
      `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title} | Engagd</title>
<style>
  body { background: #0b0e14; color: #e8ecf4; font-family: sans-serif; display: grid; place-items: center; min-height: 100vh; margin: 0; }
  .card { max-width: 420px; padding: 2rem; border: 1px solid #232b3d; border-radius: 10px; background: #131824; text-align: center; }
  h1 { font-size: 1.25rem; }
  p { color: #9aa5bc; font-size: 0.9rem; line-height: 1.5; }
  .mark { color: ${ok ? "#3ed598" : "#ff5c5c"}; }
</style>
</head>
<body>
  <div class="card">
    <h1 class="mark">${title}</h1>
    <p>${body}</p>
  </div>
</body>
</html>`,
      {
        status: ok ? 200 : 400,
        headers: { "content-type": "text/html; charset=utf-8" },
      }
    );

  if (!token) {
    return page(
      "Missing token",
      "This verification link is incomplete. Open the link from your email again, or ask for a new one.",
      false
    );
  }

  const [row] = await db
    .select()
    .from(replyToVerifications)
    .where(eq(replyToVerifications.token, token));

  if (!row) {
    return page(
      "Link not recognised",
      "This verification link is invalid or the address was removed. Ask your organisation admin to send a new one.",
      false
    );
  }

  if (row.verifiedAt) {
    return page(
      "Already verified",
      "This reply-to address is already confirmed. Replies to event emails will reach it.",
      true
    );
  }

  await db
    .update(replyToVerifications)
    .set({ verifiedAt: new Date() })
    .where(eq(replyToVerifications.id, row.id));
  await audit({
    organisationId: row.organisationId,
    action: "reply_to.verified",
    entityType: "reply_to_verification",
    entityId: row.id,
    detail: { email: row.email },
  });

  return page(
    "Address verified",
    "Thanks, this address is now confirmed. Replies to event emails from this organisation will land in this inbox.",
    true
  );
}
