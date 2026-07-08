// Job runner abstraction. Inngest today; the rest of the app only imports
// from this module, so swapping providers means changing this file only.
import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "engagd" });

export type JobEvents = {
  "campaign/scheduled": { data: { campaignId: string } };
  "campaign/send": { data: { campaignId: string } };
  "invitation/send": { data: { attendeeId: string; eventId: string } };
};

export async function enqueueCampaignSend(campaignId: string, at?: Date) {
  await inngest.send({
    name: "campaign/scheduled",
    data: { campaignId },
    ...(at ? { ts: at.getTime() } : {}),
  });
}
