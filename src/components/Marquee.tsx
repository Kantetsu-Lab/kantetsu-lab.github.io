/** 流れる帯。ポップサイト定番のマーキー */
export default function Marquee({
  items,
  className = "",
}: {
  items: string[];
  className?: string;
}) {
  const row = [...items, ...items, ...items, ...items];
  return (
    <div
      className={`overflow-hidden border-y-3 bg-accent py-2 ${className}`}
      style={{ borderColor: "var(--line)", borderTopWidth: 3, borderBottomWidth: 3 }}
      aria-hidden
    >
      <div className="marquee-track">
        {[0, 1].map((half) => (
          <div key={half} className="flex shrink-0 items-center">
            {row.map((item, i) => (
              <span
                key={`${half}-${i}`}
                className="font-pixel mx-5 whitespace-nowrap text-sm font-bold tracking-widest text-white"
              >
                {item} <span className="mx-2">★</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
