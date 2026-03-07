import { formatDateTime } from "../lib/date";
import type { PublicSession } from "../types/attendance";

type SessionDetailsProps = {
  session: PublicSession;
};

export function SessionDetails({ session }: SessionDetailsProps) {
  return (
    <section className="card">
      <h2>{session.eventName}</h2>
      <p>Session: {formatDateTime(session.startsAt)} - {formatDateTime(session.endsAt)}</p>
      <p>Token expires: {formatDateTime(session.tokenExpiresAt)}</p>
    </section>
  );
}
