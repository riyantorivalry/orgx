type StatusMessageProps = {
  tone: "error" | "success" | "warning";
  children: string;
  assertive?: boolean;
};

export function StatusMessage({ tone, children, assertive = false }: StatusMessageProps) {
  const className = `card status status-${tone}`;
  const role = assertive ? "alert" : "status";
  const ariaLive = assertive ? "assertive" : "polite";

  return (
    <section className={className} role={role} aria-live={ariaLive}>
      {children}
    </section>
  );
}
