import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { db } from "@/db";
import { memberships, organisations, orgInvites } from "@/db/schema";
import { canAddSeat } from "@/lib/entitlements";
import { audit } from "@/lib/audit";
import { Button } from "@/components/ui";
import { Wordmark } from "@/components/logo";

// Partially mask an email address for display to a signed-in visitor whose
// session email does not match the invite: j***@domain.com.
function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  return `${email[0]}***${email.slice(at)}`;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Wordmark className="text-xl" />
        </div>
        <div className="rounded-[10px] border border-line bg-raised p-8">
          {children}
        </div>
      </div>
    </main>
  );
}

function State({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <>
      <h1 className="font-display text-2xl text-fg">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-fg-dim">{body}</p>
      {children}
    </>
  );
}

export default async function InviteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const [row] = await db
    .select({ invite: orgInvites, org: organisations })
    .from(orgInvites)
    .innerJoin(organisations, eq(organisations.id, orgInvites.organisationId))
    .where(eq(orgInvites.token, token));

  if (!row) {
    return (
      <Shell>
        <State
          title="This invite is no longer valid"
          body="The link may have been revoked, already used with a newer link, or mistyped. Ask the person who invited you to send a fresh invite."
        />
      </Shell>
    );
  }

  const { invite, org } = row;

  if (invite.acceptedAt) {
    return (
      <Shell>
        <State
          title="Invite already accepted"
          body={`This invite to ${org.name} has already been used. If that was you, sign in to get to your dashboard.`}
        >
          <Link
            href="/login"
            className="mt-6 block rounded-lg bg-signal px-4 py-2 text-center text-sm font-medium text-ink transition-colors hover:bg-signal-strong"
          >
            Sign in
          </Link>
        </State>
      </Shell>
    );
  }

  if (invite.expiresAt <= new Date()) {
    return (
      <Shell>
        <State
          title="This invite has expired"
          body={`Invites to ${org.name} are valid for 7 days. Ask the person who invited you to resend it and you will get a fresh link.`}
        />
      </Shell>
    );
  }

  const session = await auth();

  if (!session?.user?.email) {
    return (
      <Shell>
        <State
          title={`Join ${org.name} on Engagd`}
          body="You have been invited to join this organisation. Sign in with the email address the invite was sent to, then reopen the invite link from your email to accept it."
        >
          <Link
            href="/login"
            className="mt-6 block rounded-lg bg-signal px-4 py-2 text-center text-sm font-medium text-ink transition-colors hover:bg-signal-strong"
          >
            Sign in to accept
          </Link>
          <p className="mt-4 font-data text-xs text-fg-faint">
            After signing in you will land on your home page. Come back to this
            link from your invite email and the invite will be accepted
            automatically.
          </p>
        </State>
      </Shell>
    );
  }

  const sessionEmail = session.user.email.toLowerCase();
  const inviteEmail = invite.email.toLowerCase();

  if (sessionEmail !== inviteEmail) {
    const signOutAction = async () => {
      "use server";
      await signOut({ redirectTo: `/invite/${token}` });
    };
    return (
      <Shell>
        <State
          title="This invite is for a different email"
          body={`The invite to ${org.name} was sent to ${maskEmail(
            invite.email
          )}, but you are signed in with a different address. Sign out, then sign in with the invited email and reopen this link.`}
        >
          <form action={signOutAction} className="mt-6">
            <Button type="submit" variant="secondary" className="w-full">
              Sign out
            </Button>
          </form>
        </State>
      </Shell>
    );
  }

  // Email matches: accept. Skip membership creation if they already belong.
  const userId = session.user.id;
  const [existingMembership] = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(
      and(
        eq(memberships.organisationId, invite.organisationId),
        eq(memberships.userId, userId)
      )
    );

  if (!existingMembership) {
    // Seat gate re-checked at acceptance: the org may have filled up since
    // the invite went out.
    const seat = await canAddSeat(invite.organisationId);
    if (!seat.allowed) {
      return (
        <Shell>
          <State
            title="No seats left"
            body={`${org.name} has used all the seats on its plan since this invite was sent. Ask the person who invited you to free a seat or upgrade, then try the link again.`}
          />
        </Shell>
      );
    }
    await db.insert(memberships).values({
      organisationId: invite.organisationId,
      userId,
      role: invite.role,
    });
  }

  await db
    .update(orgInvites)
    .set({ acceptedAt: new Date() })
    .where(eq(orgInvites.id, invite.id));
  await audit({
    organisationId: invite.organisationId,
    userId,
    action: "invite.accepted",
    entityType: "org_invite",
    entityId: invite.id,
    detail: {
      email: invite.email,
      role: invite.role,
      alreadyMember: Boolean(existingMembership),
    },
  });

  redirect(`/o/${org.slug}`);
}
