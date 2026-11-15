export function EmptyState({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="empty">
      <div className="empty-ico">{icon}</div>
      <b>{title}</b>
      <p>{text}</p>
    </div>
  );
}
