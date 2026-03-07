import { MemberList } from "./MemberList";
import { MemberSearchForm } from "./MemberSearchForm";
import { SessionDetails } from "./SessionDetails";
import { StatusMessage } from "./StatusMessage";
import { useAttendanceFlow } from "../hooks/useAttendanceFlow";

export function MemberCheckInPage() {
  const {
    token,
    session,
    members,
    query,
    loading,
    error,
    result,
    submittingMemberId,
    setQuery,
    searchMembers,
    submitAttendance,
  } = useAttendanceFlow();

  return (
    <main className="container" aria-busy={loading}>
      <header className="page-header">
        <h1>Attendance Check-in</h1>
        <p id="attendance-instructions">Select your name and tap once to submit attendance.</p>
      </header>

      {!token && (
        <StatusMessage tone="warning" assertive>
          QR token is missing. Please scan the latest QR code from the attendance screen.
        </StatusMessage>
      )}

      {error && (
        <StatusMessage tone="error" assertive>
          {error}
        </StatusMessage>
      )}

      {session && <SessionDetails session={session} />}

      {result && <StatusMessage tone={result.status === "recorded" ? "success" : "warning"}>{result.message}</StatusMessage>}

      {session && (
        <section className="card">
          <MemberSearchForm query={query} onChange={setQuery} onSubmit={searchMembers} />
          <MemberList
            members={members}
            loading={loading}
            submittingMemberId={submittingMemberId}
            onSelect={submitAttendance}
          />
        </section>
      )}

      {token && loading && <p className="loading-text">Loading...</p>}
    </main>
  );
}
