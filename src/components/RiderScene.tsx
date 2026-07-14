/* eslint-disable @next/next/no-img-element */

/**
 * ヒーロー下の走行シーン。
 * バイクは ride-bob で上下に揺れ、路面の白線とスピード線が後ろへ流れる。
 */
export default function RiderScene({ riderSrc }: { riderSrc: string }) {
  return (
    <div
      className="relative w-full overflow-hidden border-y-3 bg-card"
      style={{ borderColor: "var(--line)", borderTopWidth: 3, borderBottomWidth: 3 }}
      aria-hidden
    >
      <div className="relative mx-auto h-44 max-w-5xl md:h-52">
        {/* 雲 */}
        <div className="absolute left-[8%] top-5 h-3 w-14 rounded-full bg-border-soft" />
        <div className="absolute left-[55%] top-9 h-3 w-20 rounded-full bg-border-soft" />
        <div className="absolute left-[80%] top-4 h-3 w-12 rounded-full bg-border-soft" />

        {/* スピード線 */}
        {[38, 52, 66].map((top, i) => (
          <div
            key={top}
            className="speed-line absolute h-[3px] w-12 rounded-full bg-line/50"
            style={{
              top: `${top}%`,
              left: `${18 + i * 6}%`,
              animationDelay: `${i * 0.13}s`,
            }}
          />
        ))}

        {/* ライダー */}
        <div className="ride-bob absolute bottom-9 left-1/2 -translate-x-1/2 md:bottom-10">
          <img
            src={riderSrc}
            alt=""
            className="pixelated h-28 w-auto md:h-36"
            draggable={false}
          />
        </div>
      </div>

      {/* 路面 */}
      <div className="h-9 w-full bg-line pt-4">
        <div
          className="road-lines h-[3px] w-full"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to right, var(--background) 0 60px, transparent 60px 120px)",
          }}
        />
      </div>
    </div>
  );
}
