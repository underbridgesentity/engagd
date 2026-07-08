"use client";

import * as React from "react";
import { useActionState } from "react";
import { Button, Card, Input, Label, Select, Textarea } from "@/components/ui";
import type { EventFormState } from "../actions";

const TIMEZONES = [
  "Africa/Johannesburg",
  "Africa/Nairobi",
  "Africa/Lagos",
  "Africa/Cairo",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Singapore",
  "Australia/Sydney",
  "UTC",
];

function clientSlugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export type EventFormDefaults = {
  name: string;
  slug: string;
  description: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  venueName: string;
  venueAddress: string;
  coverImageUrl: string;
  registrationType: string;
  allowPlusOnes: boolean;
  maxPlusOnes: number;
  collectDietary: boolean;
};

export function EventForm({
  action,
  defaults,
  paidTicketingAllowed,
  orgSlug,
  submitLabel,
}: {
  action: (prev: EventFormState, formData: FormData) => Promise<EventFormState>;
  defaults: EventFormDefaults;
  paidTicketingAllowed: boolean;
  orgSlug: string;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {} as EventFormState);
  const [name, setName] = React.useState(defaults.name);
  const [slug, setSlug] = React.useState(defaults.slug);
  const [slugTouched, setSlugTouched] = React.useState(Boolean(defaults.slug));
  const [allowPlusOnes, setAllowPlusOnes] = React.useState(defaults.allowPlusOnes);

  const err = (field: string) => state.fieldErrors?.[field];

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <div className="rounded-[10px] border border-coral/40 bg-coral/10 px-4 py-3 text-sm text-coral">
          {state.error}
        </div>
      ) : null}

      <Card className="space-y-4">
        <h2 className="font-display text-lg text-fg">Basics</h2>
        <div>
          <Label htmlFor="name">Event name</Label>
          <Input
            id="name"
            name="name"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(clientSlugify(e.target.value));
            }}
            placeholder="Annual gala dinner"
          />
          {err("name") ? <p className="mt-1 text-xs text-coral">{err("name")}</p> : null}
        </div>
        <div>
          <Label htmlFor="slug">Slug</Label>
          <div className="flex items-center gap-2">
            <span className="shrink-0 font-data text-xs text-fg-faint">/e/</span>
            <Input
              id="slug"
              name="slug"
              required
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(clientSlugify(e.target.value));
              }}
            />
          </div>
          <p className="mt-1 text-xs text-fg-faint">
            The public microsite address. Must be unique.
          </p>
          {err("slug") ? <p className="mt-1 text-xs text-coral">{err("slug")}</p> : null}
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            rows={4}
            defaultValue={defaults.description}
            placeholder="What guests should know about this event"
          />
        </div>
        <div>
          <Label htmlFor="coverImageUrl">Cover image URL</Label>
          <Input
            id="coverImageUrl"
            name="coverImageUrl"
            type="url"
            defaultValue={defaults.coverImageUrl}
            placeholder="https://..."
          />
          {err("coverImageUrl") ? (
            <p className="mt-1 text-xs text-coral">{err("coverImageUrl")}</p>
          ) : null}
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-display text-lg text-fg">When and where</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="startsAt">Starts</Label>
            <Input id="startsAt" name="startsAt" type="datetime-local" defaultValue={defaults.startsAt} />
          </div>
          <div>
            <Label htmlFor="endsAt">Ends</Label>
            <Input id="endsAt" name="endsAt" type="datetime-local" defaultValue={defaults.endsAt} />
          </div>
        </div>
        <div>
          <Label htmlFor="timezone">Timezone</Label>
          <Select id="timezone" name="timezone" defaultValue={defaults.timezone}>
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="venueName">Venue name</Label>
            <Input id="venueName" name="venueName" defaultValue={defaults.venueName} placeholder="The Atrium" />
          </div>
          <div>
            <Label htmlFor="venueAddress">Venue address</Label>
            <Input
              id="venueAddress"
              name="venueAddress"
              defaultValue={defaults.venueAddress}
              placeholder="12 Long Street, Cape Town"
            />
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-display text-lg text-fg">Registration</h2>
        <div>
          <Label htmlFor="registrationType">Registration type</Label>
          <Select id="registrationType" name="registrationType" defaultValue={defaults.registrationType}>
            <option value="rsvp_only">RSVP only</option>
            <option value="free_ticket">Free ticket</option>
            <option value="paid_ticket" disabled={!paidTicketingAllowed}>
              Paid ticket{paidTicketingAllowed ? "" : " (upgrade required)"}
            </option>
          </Select>
          {!paidTicketingAllowed ? (
            <p className="mt-1 text-xs text-fg-faint">
              Paid ticketing is available on higher plans.{" "}
              <a href={`/o/${orgSlug}/billing`} className="text-signal-strong underline underline-offset-2">
                View plans
              </a>
            </p>
          ) : null}
          {err("registrationType") ? (
            <p className="mt-1 text-xs text-coral">{err("registrationType")}</p>
          ) : null}
        </div>
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="allowPlusOnes"
            name="allowPlusOnes"
            className="mt-1 accent-[var(--signal)]"
            checked={allowPlusOnes}
            onChange={(e) => setAllowPlusOnes(e.target.checked)}
          />
          <div className="flex-1">
            <label htmlFor="allowPlusOnes" className="block text-sm text-fg">
              Allow plus-ones
            </label>
            <p className="text-xs text-fg-faint">Guests can bring companions when they RSVP.</p>
            {allowPlusOnes ? (
              <div className="mt-2 max-w-[8rem]">
                <Label htmlFor="maxPlusOnes">Max per guest</Label>
                <Input
                  id="maxPlusOnes"
                  name="maxPlusOnes"
                  type="number"
                  min={0}
                  max={20}
                  defaultValue={defaults.maxPlusOnes || 1}
                />
              </div>
            ) : (
              <input type="hidden" name="maxPlusOnes" value="0" />
            )}
          </div>
        </div>
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="collectDietary"
            name="collectDietary"
            className="mt-1 accent-[var(--signal)]"
            defaultChecked={defaults.collectDietary}
          />
          <div>
            <label htmlFor="collectDietary" className="block text-sm text-fg">
              Collect dietary requirements
            </label>
            <p className="text-xs text-fg-faint">Adds a dietary notes field to the RSVP form.</p>
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
