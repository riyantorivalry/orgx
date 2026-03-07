import type { Member } from "../types/attendance";

type MemberListProps = {
  members: Member[];
  loading: boolean;
  submittingMemberId: string;
  onSelect: (memberId: string) => Promise<void>;
};

export function MemberList({ members, loading, submittingMemberId, onSelect }: MemberListProps) {
  if (!members.length && !loading) {
    return <p className="empty-message">No active members found.</p>;
  }

  return (
    <div className="members-grid">
      {members.map((member) => {
        const isSubmitting = submittingMemberId === member.id;

        return (
          <button
            key={member.id}
            type="button"
            className="member-button"
            disabled={isSubmitting}
            aria-label={`Submit attendance for ${member.fullName}, code ${member.memberCode}`}
            onClick={() => void onSelect(member.id)}
          >
            <span>{member.fullName} ({member.memberCode})</span>
            {isSubmitting && <span className="button-subtext">Submitting...</span>}
          </button>
        );
      })}
    </div>
  );
}
