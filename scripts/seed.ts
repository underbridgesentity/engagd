// Dev seed: one organisation, one owner, one active event with attendees.
// Run with: npx tsx scripts/seed.ts
import { db } from "../src/db";
import {
  attendees,
  customQuestions,
  eventProgramItems,
  events,
  memberships,
  organisations,
  users,
} from "../src/db/schema";

async function main() {
  const [user] = await db
    .insert(users)
    .values({ email: "demo@engagd.co.za", name: "Demo Organiser" })
    .onConflictDoNothing()
    .returning();
  if (!user) {
    console.log("Seed already applied, skipping.");
    process.exit(0);
  }

  const [org] = await db
    .insert(organisations)
    .values({ name: "Underbridge Events", slug: "underbridge", planTier: "professional" })
    .returning();

  await db.insert(memberships).values({
    organisationId: org.id,
    userId: user.id,
    role: "owner",
  });

  const [event] = await db
    .insert(events)
    .values({
      organisationId: org.id,
      name: "Cape Town Product Summit",
      slug: "cape-town-product-summit",
      status: "active",
      registrationType: "rsvp_only",
      description: "A day of product talks and workshops at the V&A Waterfront.",
      startsAt: new Date(Date.now() + 14 * 24 * 3600 * 1000),
      endsAt: new Date(Date.now() + 14 * 24 * 3600 * 1000 + 8 * 3600 * 1000),
      venueName: "Workshop17, V&A Waterfront",
      venueAddress: "17 Dock Rd, Cape Town",
      joinCode: "SUMMIT26",
      allowPlusOnes: true,
      maxPlusOnes: 1,
    })
    .returning();

  await db.insert(eventProgramItems).values([
    { eventId: event.id, title: "Registration and coffee", sortOrder: 0 },
    { eventId: event.id, title: "Opening keynote", speaker: "T. Nkosi", sortOrder: 1 },
    { eventId: event.id, title: "Workshops", location: "Rooms 2 and 3", sortOrder: 2 },
  ]);

  await db.insert(customQuestions).values([
    {
      eventId: event.id,
      label: "Company",
      fieldType: "text",
      required: false,
      sortOrder: 0,
    },
    {
      eventId: event.id,
      label: "Session preference",
      fieldType: "select",
      options: ["Product strategy", "Design systems", "Analytics"],
      sortOrder: 1,
    },
  ]);

  await db.insert(attendees).values([
    {
      eventId: event.id,
      firstName: "Lindiwe",
      lastName: "M",
      email: "lindiwe@example.com",
      rsvpStatus: "responded_yes",
      source: "import",
      respondedAt: new Date(),
    },
    {
      eventId: event.id,
      firstName: "Pieter",
      lastName: "V",
      email: "pieter@example.com",
      rsvpStatus: "invited",
      source: "import",
    },
    {
      eventId: event.id,
      firstName: "Aisha",
      lastName: "K",
      email: "aisha@example.com",
      rsvpStatus: "responded_maybe",
      source: "public_link",
      respondedAt: new Date(),
    },
  ]);

  console.log(`Seeded org "${org.slug}" with event "${event.slug}".`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
