import { FriendlyNotFound } from "../microsite";

export default function EventNotFound() {
  return (
    <FriendlyNotFound message="This event may not be published yet, or the link may be out of date. Check the link you were sent, or ask the organiser for a new one." />
  );
}
