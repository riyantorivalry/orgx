import { FormEvent } from "react";

type MemberSearchFormProps = {
  query: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent) => Promise<void>;
};

export function MemberSearchForm({ query, onChange, onSubmit }: MemberSearchFormProps) {
  return (
    <form className="search-form" onSubmit={onSubmit}>
      <label htmlFor="member-search" className="sr-only">
        Search member name
      </label>
      <input
        id="member-search"
        type="search"
        value={query}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search your name"
        aria-describedby="attendance-instructions"
      />
      <button type="submit">Search</button>
    </form>
  );
}
