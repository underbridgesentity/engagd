"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { emailCampaigns, photoGalleries, photos } from "@/db/schema";
import { audit } from "@/lib/audit";
import { enqueueCampaignSend } from "@/lib/jobs";
import {
  deleteObject,
  galleryKey,
  signedUploadUrl,
  storageConfigured,
} from "@/lib/storage";
import { requireOrg, requireOrgEvent } from "@/lib/tenancy";
import { appBaseUrl } from "@/lib/url";

const APP_URL = appBaseUrl();

function photosPath(orgSlug: string, eventId: string) {
  return `/o/${orgSlug}/events/${eventId}/photos`;
}

// Load a gallery only if it belongs to the given event, which itself has
// already been verified against the org.
async function requireGallery(eventId: string, galleryId: string) {
  const [gallery] = await db
    .select()
    .from(photoGalleries)
    .where(and(eq(photoGalleries.id, galleryId), eq(photoGalleries.eventId, eventId)));
  if (!gallery) throw new Error("Gallery not found");
  return gallery;
}

export async function createGallery(
  orgSlug: string,
  eventId: string,
  formData: FormData
): Promise<void> {
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);

  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  if (!title) return;

  await db.insert(photoGalleries).values({ eventId: event.id, title });

  revalidatePath(photosPath(orgSlug, event.id));
}

const uploadRequestSchema = z
  .array(
    z.object({
      name: z.string().min(1).max(300),
      type: z.string().regex(/^image\//, "Only image uploads are allowed"),
    })
  )
  .min(1)
  .max(50);

// Step 1 of the upload flow: hand the browser presigned PUT URLs so files go
// straight to the bucket. Keys are server-generated, never client-chosen.
export async function requestUploadUrls(
  orgSlug: string,
  eventId: string,
  galleryId: string,
  files: Array<{ name: string; type: string }>
): Promise<
  | { error: string }
  | { uploads: Array<{ name: string; key: string; url: string }> }
> {
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);
  await requireGallery(event.id, galleryId);
  if (!storageConfigured()) return { error: "Storage is not configured" };

  const parsed = uploadRequestSchema.safeParse(files);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid upload request" };
  }

  const uploads = await Promise.all(
    parsed.data.map(async (f) => {
      const key = galleryKey(event.id, f.name);
      return { name: f.name, key, url: await signedUploadUrl(key, f.type) };
    })
  );
  return { uploads };
}

// Step 2: after the browser PUTs succeed, record the photos rows.
export async function confirmUploads(
  orgSlug: string,
  eventId: string,
  galleryId: string,
  keys: string[]
): Promise<{ error?: string; ok?: boolean }> {
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);
  const gallery = await requireGallery(event.id, galleryId);

  // Only accept keys inside this event's gallery prefix, so a tampered
  // confirm call cannot claim someone else's objects.
  const prefix = `galleries/${event.id}/`;
  const valid = keys.filter(
    (k) => typeof k === "string" && k.startsWith(prefix) && !k.includes("..")
  );
  if (valid.length === 0) return { error: "No valid uploads to confirm" };

  const existing = await db
    .select({ sortOrder: photos.sortOrder })
    .from(photos)
    .where(eq(photos.galleryId, gallery.id));
  let nextOrder = existing.reduce((m, p) => Math.max(m, p.sortOrder + 1), 0);

  await db.insert(photos).values(
    valid.map((storageKey) => ({
      galleryId: gallery.id,
      storageKey,
      sortOrder: nextOrder++,
    }))
  );

  revalidatePath(photosPath(orgSlug, event.id));
  return { ok: true };
}

export async function updateCaption(
  orgSlug: string,
  eventId: string,
  photoId: string,
  formData: FormData
) {
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);

  const caption = String(formData.get("caption") ?? "")
    .trim()
    .slice(0, 500);

  const [photo] = await db
    .select({ photo: photos, gallery: photoGalleries })
    .from(photos)
    .innerJoin(photoGalleries, eq(photoGalleries.id, photos.galleryId))
    .where(and(eq(photos.id, photoId), eq(photoGalleries.eventId, event.id)));
  if (!photo) return;

  await db
    .update(photos)
    .set({ caption: caption || null })
    .where(eq(photos.id, photoId));

  revalidatePath(photosPath(orgSlug, event.id));
}

export async function deletePhoto(orgSlug: string, eventId: string, photoId: string) {
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);

  const [row] = await db
    .select({ photo: photos })
    .from(photos)
    .innerJoin(photoGalleries, eq(photoGalleries.id, photos.galleryId))
    .where(and(eq(photos.id, photoId), eq(photoGalleries.eventId, event.id)));
  if (!row) return;

  await db.delete(photos).where(eq(photos.id, photoId));
  try {
    await deleteObject(row.photo.storageKey);
  } catch {
    // The row is gone; a leaked object is preferable to a phantom photo.
  }

  await audit({
    organisationId: ctx.organisationId,
    userId: ctx.userId,
    action: "gallery.photo_deleted",
    entityType: "photo",
    entityId: photoId,
    detail: { eventId: event.id, storageKey: row.photo.storageKey },
  });

  revalidatePath(photosPath(orgSlug, event.id));
}

export async function setGalleryPublished(
  orgSlug: string,
  eventId: string,
  galleryId: string,
  published: boolean
) {
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);
  await requireGallery(event.id, galleryId);

  await db
    .update(photoGalleries)
    .set({ published })
    .where(eq(photoGalleries.id, galleryId));

  await audit({
    organisationId: ctx.organisationId,
    userId: ctx.userId,
    action: published ? "gallery.published" : "gallery.unpublished",
    entityType: "gallery",
    entityId: galleryId,
    detail: { eventId: event.id },
  });

  revalidatePath(photosPath(orgSlug, event.id));
  revalidatePath(`/e/${event.slug}`);
}

export async function deleteGallery(orgSlug: string, eventId: string, galleryId: string) {
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);
  await requireGallery(event.id, galleryId);

  const rows = await db
    .select({ storageKey: photos.storageKey })
    .from(photos)
    .where(eq(photos.galleryId, galleryId));

  await db.delete(photoGalleries).where(eq(photoGalleries.id, galleryId));
  for (const r of rows) {
    try {
      await deleteObject(r.storageKey);
    } catch {
      // Best effort cleanup.
    }
  }

  await audit({
    organisationId: ctx.organisationId,
    userId: ctx.userId,
    action: "gallery.deleted",
    entityType: "gallery",
    entityId: galleryId,
    detail: { eventId: event.id, photoCount: rows.length },
  });

  revalidatePath(photosPath(orgSlug, event.id));
  revalidatePath(`/e/${event.slug}`);
}

const notifySchema = z.object({
  audience: z.enum(["all", "checked_in"]),
  subject: z.string().trim().min(1).max(300),
});

export async function notifyAttendees(
  orgSlug: string,
  eventId: string,
  galleryId: string,
  formData: FormData
) {
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);
  const gallery = await requireGallery(event.id, galleryId);
  if (!gallery.published) return;

  const parsed = notifySchema.safeParse({
    audience: formData.get("audience"),
    subject: formData.get("subject"),
  });
  if (!parsed.success) return;

  const micrositeUrl = `${APP_URL}/e/${event.slug}`;
  const bodyHtml = [
    `<p style="margin:0 0 16px 0;">Photos from ${escapeHtml(event.name)} are now up. Take a look and relive the day.</p>`,
    `<p style="margin:0 0 16px 0;"><a href="${micrositeUrl}" style="color:#5b8cff;font-weight:bold;">View the photo gallery</a></p>`,
  ].join("\n");

  const [campaign] = await db
    .insert(emailCampaigns)
    .values({
      organisationId: ctx.organisationId,
      eventId: event.id,
      name: `Photos: ${gallery.title}`,
      subject: parsed.data.subject,
      bodyHtml,
      audience: parsed.data.audience,
      status: "scheduled",
      createdByUserId: ctx.userId,
    })
    .returning({ id: emailCampaigns.id });

  await enqueueCampaignSend(campaign.id);

  await audit({
    organisationId: ctx.organisationId,
    userId: ctx.userId,
    action: "gallery.notified",
    entityType: "gallery",
    entityId: galleryId,
    detail: { eventId: event.id, campaignId: campaign.id, audience: parsed.data.audience },
  });

  revalidatePath(photosPath(orgSlug, event.id));
  revalidatePath(`/o/${orgSlug}/events/${event.id}/invites`);
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
