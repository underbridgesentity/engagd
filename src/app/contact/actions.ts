"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { sendEmail } from "@/lib/email";

const SALES_EMAIL = process.env.SALES_EMAIL ?? "sales@engagd.co.za";

const contactSchema = z.object({
  name: z.string().trim().min(2, "name"),
  email: z.string().trim().email("email"),
  organisation: z.string().trim().min(2, "organisation"),
  volume: z.enum(
    ["under-500", "500-2000", "2000-10000", "10000-plus"],
    { message: "volume" }
  ),
  message: z.string().trim().min(10, "message").max(5000, "message"),
});

const VOLUME_LABELS: Record<string, string> = {
  "under-500": "Under 500 attendees",
  "500-2000": "500 to 2,000 attendees",
  "2000-10000": "2,000 to 10,000 attendees",
  "10000-plus": "More than 10,000 attendees",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function submitEnterpriseContact(formData: FormData) {
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    organisation: formData.get("organisation"),
    volume: formData.get("volume"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    // Only a field code goes in the URL, never the submitted values.
    const field = parsed.error.issues[0]?.message ?? "form";
    redirect(`/contact?error=${encodeURIComponent(field)}`);
  }

  const d = parsed.data;
  await sendEmail({
    to: SALES_EMAIL,
    subject: `Enterprise enquiry from ${d.organisation}`,
    replyTo: d.email,
    html: `
      <div style="font-family: sans-serif; max-width: 560px;">
        <h2>Enterprise enquiry</h2>
        <p><strong>Name:</strong> ${escapeHtml(d.name)}</p>
        <p><strong>Work email:</strong> ${escapeHtml(d.email)}</p>
        <p><strong>Organisation:</strong> ${escapeHtml(d.organisation)}</p>
        <p><strong>Expected attendee volume:</strong> ${VOLUME_LABELS[d.volume]}</p>
        <p><strong>Message:</strong></p>
        <p style="white-space: pre-wrap;">${escapeHtml(d.message)}</p>
      </div>
    `,
  });

  redirect("/contact?sent=1");
}
