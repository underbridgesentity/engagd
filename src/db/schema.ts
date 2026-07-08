import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import type { AdapterAccountType } from "next-auth/adapters";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => createId());

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

// Enums

export const membershipRole = pgEnum("membership_role", [
  "owner",
  "admin",
  "viewer",
]);
export const eventStatus = pgEnum("event_status", [
  "draft",
  "active",
  "completed",
  "archived",
]);
export const registrationType = pgEnum("registration_type", [
  "rsvp_only",
  "free_ticket",
  "paid_ticket",
]);
export const rsvpStatus = pgEnum("rsvp_status", [
  "invited",
  "opened",
  "responded_yes",
  "responded_no",
  "responded_maybe",
  "waitlisted",
]);
export const customFieldType = pgEnum("custom_field_type", [
  "text",
  "textarea",
  "select",
  "multiselect",
  "checkbox",
  "number",
  "date",
]);
export const invitationChannel = pgEnum("invitation_channel", [
  "email",
  "manual",
  "public_link",
  "import",
]);
export const ticketPaymentStatus = pgEnum("ticket_payment_status", [
  "not_required",
  "pending",
  "paid",
  "refunded",
  "failed",
]);
export const paymentStatus = pgEnum("payment_status", [
  "created",
  "pending",
  "succeeded",
  "failed",
  "refunded",
]);
export const paymentProvider = pgEnum("payment_provider", [
  "yoco",
  "paystack",
]);
export const questionStatus = pgEnum("question_status", [
  "pending",
  "approved",
  "answered",
  "dismissed",
]);
export const pollStatus = pgEnum("poll_status", ["draft", "open", "closed"]);
export const domainVerificationStatus = pgEnum("domain_verification_status", [
  "pending",
  "verified",
  "failed",
]);
export const campaignStatus = pgEnum("campaign_status", [
  "draft",
  "scheduled",
  "sending",
  "sent",
  "cancelled",
  "failed",
]);
export const campaignAudience = pgEnum("campaign_audience", [
  "all",
  "non_responders",
  "attending",
  "not_attending",
  "maybe",
  "waitlisted",
  "checked_in",
  "no_shows",
]);
export const planTier = pgEnum("plan_tier", [
  "free",
  "starter",
  "professional",
  "enterprise",
]);
export const billingInterval = pgEnum("billing_interval", [
  "monthly",
  "annual",
]);
export const billingStatus = pgEnum("billing_status", [
  "active",
  "trialing",
  "past_due",
  "cancelled",
]);
export const surveyStatus = pgEnum("survey_status", [
  "draft",
  "open",
  "closed",
]);

// Tenancy

export const organisations = pgTable("organisations", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  planTier: planTier("plan_tier").notNull().default("free"),
  billingInterval: billingInterval("billing_interval")
    .notNull()
    .default("monthly"),
  billingStatus: billingStatus("billing_status").notNull().default("active"),
  // Per-org overrides layered on top of the plan config, used for enterprise custom limits.
  entitlementOverrides: jsonb("entitlement_overrides")
    .$type<Partial<import("../lib/entitlements/types").Entitlements>>()
    .notNull()
    .default({}),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const users = pgTable("users", {
  id: id(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  image: text("image"),
  createdAt: createdAt(),
});

export const memberships = pgTable(
  "memberships",
  {
    id: id(),
    organisationId: text("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: membershipRole("role").notNull().default("viewer"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("memberships_org_user_idx").on(t.organisationId, t.userId),
  ]
);

// Check-in staff are event-scoped door access, not seat-consuming members.
export const checkInStaffAccess = pgTable(
  "check_in_staff_access",
  {
    id: id(),
    organisationId: text("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    // Hash of the door PIN; the plain PIN is shown once at creation.
    pinHash: text("pin_hash").notNull(),
    // Opaque token embedded in the staff access link.
    accessToken: text("access_token")
      .notNull()
      .unique()
      .$defaultFn(() => createId()),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdByUserId: text("created_by_user_id").references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [index("check_in_staff_event_idx").on(t.eventId)]
);

// Auth.js tables

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })]
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })]
);

// Events

export const events = pgTable(
  "events",
  {
    id: id(),
    organisationId: text("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    status: eventStatus("status").notNull().default("draft"),
    registrationType: registrationType("registration_type")
      .notNull()
      .default("rsvp_only"),
    description: text("description"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    timezone: text("timezone").notNull().default("Africa/Johannesburg"),
    venueName: text("venue_name"),
    venueAddress: text("venue_address"),
    coverImageUrl: text("cover_image_url"),
    // Microsite branding: colours, logo, theme choices.
    micrositeConfig: jsonb("microsite_config")
      .$type<{
        accentColor?: string;
        backgroundColor?: string;
        logoUrl?: string;
        hideEngagdBranding?: boolean;
      }>()
      .notNull()
      .default({}),
    // Short code attendees can type at /join.
    joinCode: text("join_code").unique(),
    allowPlusOnes: boolean("allow_plus_ones").notNull().default(false),
    maxPlusOnes: integer("max_plus_ones").notNull().default(0),
    collectDietary: boolean("collect_dietary").notNull().default(true),
    publicRsvpEnabled: boolean("public_rsvp_enabled").notNull().default(true),
    // Soft-wall flag: set when attendee count exceeded the plan cap.
    overAttendeeCap: boolean("over_attendee_cap").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("events_org_idx").on(t.organisationId, t.status)]
);

export const eventProgramItems = pgTable(
  "event_program_items",
  {
    id: id(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    title: text("title").notNull(),
    description: text("description"),
    speaker: text("speaker"),
    location: text("location"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("program_items_event_idx").on(t.eventId)]
);

export const customQuestions = pgTable(
  "custom_questions",
  {
    id: id(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    fieldType: customFieldType("field_type").notNull().default("text"),
    required: boolean("required").notNull().default(false),
    options: jsonb("options").$type<string[]>().notNull().default([]),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("custom_questions_event_idx").on(t.eventId)]
);

// Attendees

export const attendees = pgTable(
  "attendees",
  {
    id: id(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    firstName: text("first_name"),
    lastName: text("last_name"),
    email: text("email"),
    phone: text("phone"),
    rsvpStatus: rsvpStatus("rsvp_status").notNull().default("invited"),
    plusOnes: integer("plus_ones").notNull().default(0),
    dietaryNotes: text("dietary_notes"),
    accessibilityNotes: text("accessibility_notes"),
    customAnswers: jsonb("custom_answers")
      .$type<Record<string, string | string[] | number | boolean>>()
      .notNull()
      .default({}),
    // Opaque token used in the attendee's personal RSVP link and check-in QR.
    qrToken: text("qr_token")
      .notNull()
      .unique()
      .$defaultFn(() => createId()),
    source: invitationChannel("source").notNull().default("manual"),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("attendees_event_idx").on(t.eventId),
    uniqueIndex("attendees_event_email_idx").on(t.eventId, t.email),
  ]
);

export const invitations = pgTable(
  "invitations",
  {
    id: id(),
    attendeeId: text("attendee_id")
      .notNull()
      .references(() => attendees.id, { onDelete: "cascade" }),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    channel: invitationChannel("channel").notNull().default("email"),
    providerMessageId: text("provider_message_id"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    openedAt: timestamp("opened_at", { withTimezone: true }),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("invitations_event_idx").on(t.eventId)]
);

// Ticketing and payments

export const ticketTypes = pgTable(
  "ticket_types",
  {
    id: id(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // Amount in cents, ZAR. Zero for free tickets.
    priceCents: integer("price_cents").notNull().default(0),
    currency: text("currency").notNull().default("ZAR"),
    quantity: integer("quantity"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("ticket_types_event_idx").on(t.eventId)]
);

export const tickets = pgTable(
  "tickets",
  {
    id: id(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    attendeeId: text("attendee_id")
      .notNull()
      .references(() => attendees.id, { onDelete: "cascade" }),
    ticketTypeId: text("ticket_type_id")
      .notNull()
      .references(() => ticketTypes.id),
    qrToken: text("qr_token")
      .notNull()
      .unique()
      .$defaultFn(() => createId()),
    paymentStatus: ticketPaymentStatus("payment_status")
      .notNull()
      .default("not_required"),
    paymentId: text("payment_id"),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("tickets_event_idx").on(t.eventId)]
);

export const payments = pgTable(
  "payments",
  {
    id: id(),
    organisationId: text("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id),
    attendeeId: text("attendee_id").references(() => attendees.id),
    provider: paymentProvider("provider").notNull(),
    providerReference: text("provider_reference"),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("ZAR"),
    status: paymentStatus("status").notNull().default("created"),
    // Raw server-side verification response from the provider.
    verificationResult: jsonb("verification_result"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("payments_org_idx").on(t.organisationId)]
);

export const paymentProviderConfigs = pgTable(
  "payment_provider_configs",
  {
    id: id(),
    organisationId: text("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    eventId: text("event_id").references(() => events.id, {
      onDelete: "cascade",
    }),
    provider: paymentProvider("provider").notNull(),
    // Public key is safe client-side.
    publicKey: text("public_key"),
    // AES-256-GCM ciphertext of the secret key or subaccount credentials. Never sent to the browser.
    encryptedSecret: text("encrypted_secret"),
    subaccountCode: text("subaccount_code"),
    feeLogic: jsonb("fee_logic")
      .$type<{ absorbFees?: boolean; platformFeePercent?: number }>()
      .notNull()
      .default({}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("payment_configs_org_idx").on(t.organisationId)]
);

// Check-in

export const checkIns = pgTable(
  "check_ins",
  {
    id: id(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    attendeeId: text("attendee_id")
      .notNull()
      .references(() => attendees.id, { onDelete: "cascade" }),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    checkedInByUserId: text("checked_in_by_user_id").references(() => users.id),
    checkedInByStaffId: text("checked_in_by_staff_id").references(
      () => checkInStaffAccess.id
    ),
  },
  (t) => [
    index("check_ins_event_idx").on(t.eventId),
    uniqueIndex("check_ins_event_attendee_idx").on(t.eventId, t.attendeeId),
  ]
);

// Live engagement

export const polls = pgTable(
  "polls",
  {
    id: id(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    status: pollStatus("status").notNull().default("draft"),
    allowMultiple: boolean("allow_multiple").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("polls_event_idx").on(t.eventId)]
);

export const pollOptions = pgTable("poll_options", {
  id: id(),
  pollId: text("poll_id")
    .notNull()
    .references(() => polls.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const pollVotes = pgTable(
  "poll_votes",
  {
    id: id(),
    pollId: text("poll_id")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    pollOptionId: text("poll_option_id")
      .notNull()
      .references(() => pollOptions.id, { onDelete: "cascade" }),
    // Anonymous attendee-side: only a session fingerprint to prevent double voting.
    voterFingerprint: text("voter_fingerprint").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("poll_votes_unique_idx").on(
      t.pollId,
      t.pollOptionId,
      t.voterFingerprint
    ),
  ]
);

export const audienceQuestions = pgTable(
  "audience_questions",
  {
    id: id(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    displayName: text("display_name"),
    upvotes: integer("upvotes").notNull().default(0),
    status: questionStatus("status").notNull().default("pending"),
    createdAt: createdAt(),
  },
  (t) => [index("audience_questions_event_idx").on(t.eventId)]
);

// Post-event

export const surveys = pgTable("surveys", {
  id: id(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  status: surveyStatus("status").notNull().default("draft"),
  createdAt: createdAt(),
});

export const surveyQuestions = pgTable("survey_questions", {
  id: id(),
  surveyId: text("survey_id")
    .notNull()
    .references(() => surveys.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  fieldType: customFieldType("field_type").notNull().default("text"),
  required: boolean("required").notNull().default(false),
  options: jsonb("options").$type<string[]>().notNull().default([]),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const surveyResponses = pgTable(
  "survey_responses",
  {
    id: id(),
    surveyId: text("survey_id")
      .notNull()
      .references(() => surveys.id, { onDelete: "cascade" }),
    attendeeId: text("attendee_id").references(() => attendees.id, {
      onDelete: "set null",
    }),
    answers: jsonb("answers")
      .$type<Record<string, string | string[] | number | boolean>>()
      .notNull()
      .default({}),
    createdAt: createdAt(),
  },
  (t) => [index("survey_responses_survey_idx").on(t.surveyId)]
);

export const photoGalleries = pgTable("photo_galleries", {
  id: id(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  published: boolean("published").notNull().default(false),
  createdAt: createdAt(),
});

export const photos = pgTable(
  "photos",
  {
    id: id(),
    galleryId: text("gallery_id")
      .notNull()
      .references(() => photoGalleries.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    caption: text("caption"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("photos_gallery_idx").on(t.galleryId)]
);

// Email

export const emailDomains = pgTable(
  "email_domains",
  {
    id: id(),
    organisationId: text("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(),
    resendDomainId: text("resend_domain_id"),
    status: domainVerificationStatus("status").notNull().default("pending"),
    dnsRecords: jsonb("dns_records")
      .$type<Array<{ type: string; name: string; value: string; status?: string }>>()
      .notNull()
      .default([]),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("email_domains_org_domain_idx").on(t.organisationId, t.domain)]
);

export const replyToVerifications = pgTable(
  "reply_to_verifications",
  {
    id: id(),
    organisationId: text("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    token: text("token")
      .notNull()
      .$defaultFn(() => createId()),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("reply_to_org_email_idx").on(t.organisationId, t.email),
  ]
);

export const emailCampaigns = pgTable(
  "email_campaigns",
  {
    id: id(),
    organisationId: text("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    subject: text("subject").notNull(),
    bodyHtml: text("body_html").notNull(),
    audience: campaignAudience("audience").notNull().default("all"),
    status: campaignStatus("status").notNull().default("draft"),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    recipientCount: integer("recipient_count"),
    createdByUserId: text("created_by_user_id").references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("campaigns_event_idx").on(t.eventId)]
);

// Audit

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    organisationId: text("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    detail: jsonb("detail").notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index("audit_logs_org_idx").on(t.organisationId, t.createdAt)]
);
