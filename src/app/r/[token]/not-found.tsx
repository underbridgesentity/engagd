import { FriendlyNotFound } from "../../e/microsite";

export default function PersonalLinkNotFound() {
  return (
    <FriendlyNotFound message="This personal RSVP link is not valid or the event is no longer available. Check the link from your invitation, or ask the organiser to resend it." />
  );
}
