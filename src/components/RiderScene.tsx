/* eslint-disable @next/next/no-img-element */

/**
 * ヒーロー下の走行シーン。
 * 空(昼/夜グラデーション) → 星(夜のみ) → 太陽/月 → 雲 → 遠景の山 →
 * 近景の丘 → 木々 → 草地 → ライダー → 路面。奥ほど遅いパララックス。
 */
export default function RiderScene({ riderSrc }: { riderSrc: string }) {
  return (
    <div
      className="scene-sky relative w-full overflow-hidden"
      style={{
        borderTop: "3px solid var(--line)",
        borderBottom: "3px solid var(--line)",
      }}
      aria-hidden
    >
      {/* 星(夜のみ) */}
      <div className="scene-stars absolute inset-x-0 top-0 h-28" />

      {/* 太陽 / 月 */}
      <div className="scene-sun absolute right-[12%] top-6 h-11 w-11 md:h-14 md:w-14" />

      {/* 雲 (最奥) */}
      <div className="scene-clouds absolute inset-x-0 top-3 h-20" />

      {/* 山: 遠景 → 近景 */}
      <div className="scene-mountains-far absolute inset-x-0 bottom-11 h-28" />
      <div className="scene-mountains absolute inset-x-0 bottom-11 h-[84px]" />

      {/* 木々 */}
      <div className="scene-trees absolute inset-x-0 bottom-11 h-[72px]" />

      <div className="relative mx-auto h-52 max-w-5xl md:h-60">
        {/* スピード線 */}
        {[46, 58, 70].map((top, i) => (
          <div
            key={top}
            className="speed-line absolute z-10 h-[3px] w-12 rounded-full bg-line/40"
            style={{
              top: `${top}%`,
              left: `${18 + i * 6}%`,
              animationDelay: `${i * 0.13}s`,
            }}
          />
        ))}

        {/* ライダー */}
        <div className="ride-bob absolute bottom-1 left-1/2 z-10 -translate-x-1/2">
          <img
            src={riderSrc}
            alt=""
            className="pixelated h-32 w-auto md:h-40"
            draggable={false}
          />
        </div>
      </div>

      {/* 草地 */}
      <div className="relative h-2 w-full" style={{ background: "#4c8a52" }} />

      {/* 路面 */}
      <div className="relative h-9 w-full bg-line pt-4" style={{ background: "#3a3733" }}>
        <div
          className="road-lines h-[3px] w-full"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to right, #f2ead8 0 60px, transparent 60px 120px)",
          }}
        />
      </div>
    </div>
  );
}
