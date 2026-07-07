export function AdSlot({ slot }) {
  const style = {
    minHeight: slot.height ? `${Math.min(slot.height, 280)}px` : '120px',
  };

  return (
    <aside
      className="flex items-center justify-center border border-dashed border-terminal-gray bg-surface-container-low p-4 text-center"
      style={style}
      aria-label={`Publicidad ${slot.code}`}
    >
      {slot.activeAd ? (
        <a href={slot.activeAd.targetUrl ?? '#'} className="block">
          {slot.activeAd.imageUrl ? (
            <img src={slot.activeAd.imageUrl} alt={slot.activeAd.title} className="mx-auto max-h-56 object-contain" />
          ) : (
            <span className="font-black text-white">{slot.activeAd.title}</span>
          )}
          {slot.activeAd.sponsorName ? (
            <span className="mt-2 block text-xs uppercase text-on-surface-variant">{slot.activeAd.sponsorName}</span>
          ) : null}
        </a>
      ) : (
        <div>
          <p className="text-xs font-black uppercase text-on-surface-variant">Espacio publicitario</p>
          <p className="mt-1 text-[11px] text-on-surface-variant">{slot.location}</p>
        </div>
      )}
    </aside>
  );
}
