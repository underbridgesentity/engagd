import Link from "next/link";
import { and, asc, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { memberships, orgInvites, users } from "@/db/schema";
import { requireOrg } from "@/lib/tenancy";
import { canAddSeat, getEntitlements } from "@/lib/entitlements";
import { Badge, Button, Card, Input, Label, Select } from "@/components/ui";
import {
  changeRole,
  inviteMember,
  removeMember,
  resendInvite,
  revokeInvite,
} from "./actions";

const ERROR_COPY: Record<string, string> = {
  "invalid-invite": "Enter a valid email address and pick a role.",
  "owner-only": "Only an owner can grant the owner role.",
  "seats-full":
    "All seats on your plan are taken, counting members and pending invites. Upgrade to add more people.",
  "already-member": "That person is already a member of this organisation.",
  "invite-not-found": "That invite no longer exists.",
  "invalid-role": "That role change did not make sense. Try again.",
  "invalid-remove": "Could not work out which member to remove.",
  "not-found": "That member no longer exists.",
  "last-owner": "You cannot demote or remove the last owner. Promote someone else first.",
};

const OK_COPY: Record<string, string> = {
  invited: "Invite sent. They have 7 days to accept from the link in their email.",
  resent: "Invite resent with a fresh link and expiry.",
  revoked: "Invite revoked. The link no longer works.",
  "role-changed": "Role updated.",
  unchanged: "No change needed, that member already has that role.",
  removed: "Member removed.",
};

const dateFmt = new Intl.DateTimeFormat("en-ZA", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function TeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { orgSlug } = await params;
  const { error, ok } = await searchParams;
  const ctx = await requireOrg(orgSlug);
  const isOwner = ctx.role === "owner";
  const canInvite = ctx.role !== "viewer";
  const now = new Date();

  const [members, invites, ent, seatGate] = await Promise.all([
    db
      .select({
        membershipId: memberships.id,
        role: memberships.role,
        email: users.email,
        name: users.name,
        userId: users.id,
      })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(eq(memberships.organisationId, ctx.organisationId))
      .orderBy(asc(memberships.createdAt)),
    db
      .select({
        id: orgInvites.id,
        email: orgInvites.email,
        role: orgInvites.role,
        expiresAt: orgInvites.expiresAt,
      })
      .from(orgInvites)
      .where(
        and(
          eq(orgInvites.organisationId, ctx.organisationId),
          isNull(orgInvites.acceptedAt)
        )
      )
      .orderBy(asc(orgInvites.createdAt)),
    getEntitlements(ctx.organisationId),
    canAddSeat(ctx.organisationId),
  ]);

  const pendingInvites = invites.filter((i) => i.expiresAt > now);
  const seatsTaken = members.length + pendingInvites.length;
  const invitesFillSeats =
    ent.teamSeats !== null && seatsTaken >= ent.teamSeats;
  const canCreateInvite = seatGate.allowed && !invitesFillSeats;

  const seatsLabel =
    ent.teamSeats === null
      ? `${members.length} of unlimited seats`
      : `${seatsTaken} of ${ent.teamSeats} seats used, including ${pendingInvites.length} pending ${
          pendingInvites.length === 1 ? "invite" : "invites"
        }`;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl text-fg">Team</h1>
      <p className="mt-1 text-sm text-fg-dim">
        {seatsLabel}. Check-in staff are per-event door access and never use a
        seat, add them from an event&apos;s check-in page.
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral"
        >
          {ERROR_COPY[error] ?? "Something went wrong. Try again."}
          {error === "seats-full" && isOwner ? (
            <>
              {" "}
              <Link
                href={`/o/${orgSlug}/billing`}
                className="text-signal-strong hover:underline"
              >
                See plans
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
      {ok ? (
        <p
          role="status"
          className="mt-4 rounded-lg border border-mint/40 bg-mint/10 px-3 py-2 text-sm text-mint"
        >
          {OK_COPY[ok] ?? "Done."}
        </p>
      ) : null}

      <Card className="mt-6 divide-y divide-line p-0">
        {members.map((m) => (
          <div
            key={m.membershipId}
            className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
          >
            <div className="min-w-0">
              <p className="truncate text-sm text-fg">{m.name ?? m.email}</p>
              <p className="truncate font-data text-xs text-fg-faint">{m.email}</p>
            </div>
            <div className="flex items-center gap-3">
              {isOwner ? (
                <>
                  <form
                    action={changeRole.bind(null, orgSlug)}
                    className="flex items-center gap-2"
                  >
                    <input type="hidden" name="membershipId" value={m.membershipId} />
                    <Select
                      name="role"
                      defaultValue={m.role}
                      className="w-28"
                      aria-label={`Role for ${m.email}`}
                    >
                      <option value="owner">Owner</option>
                      <option value="admin">Admin</option>
                      <option value="viewer">Viewer</option>
                    </Select>
                    <Button type="submit" variant="secondary" className="px-3 py-1.5">
                      Save
                    </Button>
                  </form>
                  <form action={removeMember.bind(null, orgSlug)}>
                    <input type="hidden" name="membershipId" value={m.membershipId} />
                    <Button type="submit" variant="danger" className="px-3 py-1.5">
                      Remove
                    </Button>
                  </form>
                </>
              ) : (
                <Badge tone={m.role === "owner" ? "signal" : "neutral"}>{m.role}</Badge>
              )}
            </div>
          </div>
        ))}
      </Card>

      {canInvite && invites.length > 0 ? (
        <>
          <h2 className="mt-8 font-display text-lg text-fg">Pending invites</h2>
          <Card className="mt-3 divide-y divide-line p-0">
            {invites.map((inv) => {
              const expired = inv.expiresAt <= now;
              return (
                <div
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-fg">{inv.email}</p>
                    <p className="font-data text-xs text-fg-faint">
                      {inv.role} ·{" "}
                      {expired
                        ? `expired ${dateFmt.format(inv.expiresAt)}`
                        : `expires ${dateFmt.format(inv.expiresAt)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {expired ? <Badge tone="ember">Expired</Badge> : null}
                    <form action={resendInvite.bind(null, orgSlug)}>
                      <input type="hidden" name="inviteId" value={inv.id} />
                      <Button type="submit" variant="secondary" className="px-3 py-1.5">
                        Resend
                      </Button>
                    </form>
                    <form action={revokeInvite.bind(null, orgSlug)}>
                      <input type="hidden" name="inviteId" value={inv.id} />
                      <Button type="submit" variant="danger" className="px-3 py-1.5">
                        Revoke
                      </Button>
                    </form>
                  </div>
                </div>
              );
            })}
          </Card>
        </>
      ) : null}

      {canInvite ? (
        <Card className="mt-6">
          <h2 className="font-display text-lg text-fg">Invite a member</h2>
          {canCreateInvite ? (
            <form
              action={inviteMember.bind(null, orgSlug)}
              className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end"
            >
              <div className="flex-1">
                <Label htmlFor="invite-email">Email address</Label>
                <Input
                  id="invite-email"
                  name="email"
                  type="email"
                  required
                  placeholder="colleague@company.co.za"
                />
              </div>
              <div className="w-full sm:w-36">
                <Label htmlFor="invite-role">Role</Label>
                <Select id="invite-role" name="role" defaultValue="viewer">
                  {isOwner ? <option value="owner">Owner</option> : null}
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </Select>
              </div>
              <Button type="submit">Send invite</Button>
            </form>
          ) : (
            <div className="mt-4 rounded-lg border border-ember/40 bg-ember/10 px-4 py-3 text-sm text-ember">
              All {ent.teamSeats ?? ""} seats on your plan are spoken for,
              counting members and pending invites.{" "}
              {isOwner ? (
                <Link
                  href={`/o/${orgSlug}/billing`}
                  className="text-signal-strong hover:underline"
                >
                  Upgrade to add more people.
                </Link>
              ) : (
                "Ask an owner to upgrade the plan to add more people."
              )}
            </div>
          )}
          <p className="mt-4 font-data text-xs text-fg-faint">
            Invites expire after 7 days and use a seat while pending. Seats
            cover owners, admins, and viewers. Door staff scanning tickets get
            per-event access links instead and do not count here.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
