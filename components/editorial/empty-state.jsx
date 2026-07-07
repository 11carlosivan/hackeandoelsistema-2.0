export function EmptyState({ title, body, action }) {
  return (
    <div className="border border-dashed border-terminal-gray bg-surface-container-low p-8 text-center">
      <h3 className="text-xl font-black text-white">{title}</h3>
      {body ? <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-on-surface-variant">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
