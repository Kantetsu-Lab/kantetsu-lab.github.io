/* eslint-disable @next/next/no-img-element */

/**
 * ヒーロー下の走行シーン。
 * 奥から: 太陽・雲(ゆっくり) → 山(中speed) → 木(速い) → ライダー → 路面。
 * 奥ほど遅く流すパララックスで走っている感を出す。
 */
export default function RiderScene({ riderSrc }: { riderSrc: string }) {
  return (
    <div
      className="relative w-full overflow-hidden border-y-3 bg-card"
      style={{ borderColor: "var(--line)", borderTopWidth: 3, borderBottomWidth: 3 }}
      aria-hidden
    >
      {/* 太陽 */}
      <div className="scene-sun absolute right-[12%] top-5 h-10 w-10 rounded-lg md:h-12 md:w-12" />

      {/* 雲 (最奥) */}
      <div className="scene-clouds absolute inset-x-0 top-2 h-12" />

      {/* 山 (奥) */}
      <div className="scene-mountains absolute inset-x-0 bottom-9 h-20" />

      {/* 木 (中景) */}
      <div className="scene-trees absolute inset-x-0 bottom-9 h-14" />

      <div className="relative mx-auto h-48 max-w-5xl md:h-56">
        {/* スピード線 */}
        {[42, 56, 70].map((top, i) => (
          <div
            key={top}
            className="speed-line absolute z-10 h-[3px] w-12 rounded-full bg-line/50"
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

      {/* 路面 */}
      <div className="relative h-9 w-full bg-line pt-4">
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
