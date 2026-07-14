/* eslint-disable @next/next/no-img-element */

/**
 * エンジンの鼓動。ドクン、ドクンと2拍で脈打ち、波紋が広がる。
 */
export default function EngineBeat({
  engineSrc,
  size = 120,
}: {
  engineSrc: string;
  size?: number;
}) {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size * 1.5, height: size * 1.5 }}
      aria-hidden
    >
      <div
        className="beat-ring absolute rounded-full border-3"
        style={{
          width: size * 1.15,
          height: size * 1.15,
          borderColor: "var(--accent)",
          borderWidth: 3,
        }}
      />
      <div
        className="beat-ring absolute rounded-full border-3"
        style={{
          width: size * 1.15,
          height: size * 1.15,
          borderColor: "var(--accent)",
          borderWidth: 3,
          animationDelay: "0.35s",
        }}
      />
      <img
        src={engineSrc}
        alt=""
        className="engine-beat pixelated relative"
        style={{ width: size, height: "auto" }}
        draggable={false}
      />
    </div>
  );
}
