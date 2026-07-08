import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { photoGalleries, photos } from "@/db/schema";
import { signedViewUrl, storageConfigured } from "@/lib/storage";
import { requireOrg, requireOrgEvent } from "@/lib/tenancy";
import { Badge, Button, Card, EmptyState, Input, Label, Select } from "@/components/ui";
import {
  confirmUploads,
  createGallery,
  deleteGallery,
  deletePhoto,
  notifyAttendees,
  requestUploadUrls,
  setGalleryPublished,
  updateCaption,
} from "./actions";
import { PhotoUploader } from "./uploader";

export default async function PhotosPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventId: string }>;
}) {
  const { orgSlug, eventId } = await params;
  const ctx = await requireOrg(orgSlug, "admin");
  const event = await requireOrgEvent(ctx, eventId);

  const configured = storageConfigured();

  const galleries = await db
    .select()
    .from(photoGalleries)
    .where(eq(photoGalleries.eventId, event.id))
    .orderBy(desc(photoGalleries.createdAt));

  const galleryIds = galleries.map((g) => g.id);
  const allPhotos =
    galleryIds.length > 0
      ? await db
          .select()
          .from(photos)
          .where(inArray(photos.galleryId, galleryIds))
          .orderBy(asc(photos.sortOrder), asc(photos.createdAt))
      : [];

  // One server pass for all thumbnails; short-lived URLs, never stored.
  const viewUrls = new Map<string, string>();
  if (configured) {
    await Promise.all(
      allPhotos.map(async (p) => {
        viewUrls.set(p.id, await signedViewUrl(p.storageKey, 3600));
      })
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl text-fg">Photo galleries</h2>
        <p className="mt-1 text-sm text-fg-dim">
          Upload event photos and publish them to the event microsite for your
          guests.
        </p>
      </div>

      {!configured ? (
        <Card>
          <h3 className="font-display text-base text-fg">Storage not configured</h3>
          <p className="mt-1 text-sm text-fg-dim">
            Photo uploads need S3-compatible storage. Set these environment
            variables and restart the app:
          </p>
          <ul className="mt-3 space-y-1 font-data text-sm text-fg-dim">
            <li>S3_BUCKET (required)</li>
            <li>S3_REGION (defaults to af-south-1)</li>
            <li>S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY</li>
            <li>S3_ENDPOINT (only for non-AWS providers)</li>
          </ul>
        </Card>
      ) : (
        <Card className="space-y-3">
          <h3 className="font-display text-base text-fg">New gallery</h3>
          <form
            action={createGallery.bind(null, orgSlug, event.id)}
            className="flex flex-wrap items-end gap-3"
          >
            <div className="min-w-64 flex-1">
              <Label htmlFor="title">Gallery title</Label>
              <Input
                id="title"
                name="title"
                required
                maxLength={200}
                placeholder="Highlights, Ceremony, Afterparty..."
              />
            </div>
            <Button type="submit">Create gallery</Button>
          </form>
        </Card>
      )}

      {galleries.length === 0 ? (
        <EmptyState
          title="No galleries yet"
          hint="Create a gallery, upload your photos, then publish it so guests can see it on the event page."
        />
      ) : (
        galleries.map((gallery) => {
          const galleryPhotos = allPhotos.filter((p) => p.galleryId === gallery.id);
          return (
            <Card key={gallery.id} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h3 className="font-display text-lg text-fg">{gallery.title}</h3>
                  <Badge tone={gallery.published ? "mint" : "neutral"}>
                    {gallery.published ? "published" : "draft"}
                  </Badge>
                  <span className="font-data text-xs text-fg-faint">
                    {galleryPhotos.length} photo{galleryPhotos.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <form
                    action={setGalleryPublished.bind(
                      null,
                      orgSlug,
                      event.id,
                      gallery.id,
                      !gallery.published
                    )}
                  >
                    <Button type="submit" variant="secondary">
                      {gallery.published ? "Unpublish" : "Publish"}
                    </Button>
                  </form>
                  <form action={deleteGallery.bind(null, orgSlug, event.id, gallery.id)}>
                    <Button type="submit" variant="danger">
                      Delete gallery
                    </Button>
                  </form>
                </div>
              </div>

              {configured ? (
                <PhotoUploader
                  requestUrls={requestUploadUrls.bind(null, orgSlug, event.id, gallery.id)}
                  confirm={confirmUploads.bind(null, orgSlug, event.id, gallery.id)}
                />
              ) : null}

              {gallery.published ? (
                <form
                  action={notifyAttendees.bind(null, orgSlug, event.id, gallery.id)}
                  className="flex flex-wrap items-end gap-3 rounded-[10px] border border-line bg-ink-2 p-4"
                >
                  <div className="min-w-56 flex-1">
                    <Label htmlFor={`subject-${gallery.id}`}>Notification subject</Label>
                    <Input
                      id={`subject-${gallery.id}`}
                      name="subject"
                      required
                      maxLength={300}
                      defaultValue={`Photos from ${event.name}`}
                    />
                  </div>
                  <div className="w-48">
                    <Label htmlFor={`audience-${gallery.id}`}>Audience</Label>
                    <Select
                      id={`audience-${gallery.id}`}
                      name="audience"
                      defaultValue="checked_in"
                    >
                      <option value="checked_in">Checked in</option>
                      <option value="all">Everyone with an email</option>
                    </Select>
                  </div>
                  <Button type="submit" variant="secondary">
                    Notify attendees
                  </Button>
                </form>
              ) : null}

              {galleryPhotos.length === 0 ? (
                <p className="text-sm text-fg-faint">No photos in this gallery yet.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {galleryPhotos.map((photo) => {
                    const url = viewUrls.get(photo.id);
                    return (
                      <div
                        key={photo.id}
                        className="space-y-2 rounded-[10px] border border-line bg-ink-2 p-2"
                      >
                        {url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={url}
                            alt={photo.caption ?? ""}
                            loading="lazy"
                            className="aspect-square w-full rounded-lg object-cover"
                          />
                        ) : (
                          <div className="aspect-square w-full rounded-lg bg-raised" />
                        )}
                        <form
                          action={updateCaption.bind(null, orgSlug, event.id, photo.id)}
                          className="flex gap-1.5"
                        >
                          <Input
                            name="caption"
                            defaultValue={photo.caption ?? ""}
                            maxLength={500}
                            placeholder="Caption"
                            className="px-2 py-1 text-xs"
                          />
                          <Button
                            type="submit"
                            variant="ghost"
                            className="px-2 py-1 text-xs"
                          >
                            Save
                          </Button>
                        </form>
                        <form action={deletePhoto.bind(null, orgSlug, event.id, photo.id)}>
                          <Button
                            type="submit"
                            variant="danger"
                            className="w-full px-2 py-1 text-xs"
                          >
                            Delete
                          </Button>
                        </form>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}
