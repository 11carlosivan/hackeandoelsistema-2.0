export function SectionHeader({ eyebrow, title, action }) {
  return (
    <div className="mb-5 flex flex-col gap-3 border-b border-terminal-gray pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="hes-kicker">{eyebrow}</p> : null}
        <h2 className="mt-1 text-2xl font-black text-white">{title}</h2>
      </div>
      {action ? <div className="text-sm font-bold text-system-red">{action}</div> : null}
    </div>
  );
}
