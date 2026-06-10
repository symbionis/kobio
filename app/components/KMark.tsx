/**
 * The Kobio "K" mark — the same geometry as the favicon (app/icon.svg), drawn
 * as rounded strokes in `currentColor` so it inherits the parent's text colour.
 * In the nav it sits on a dark tile (cream K) so the orange stays unique to the
 * Dicter button; the favicon is the orange-tile version of this same mark.
 */
export default function KMark({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <g stroke="currentColor" strokeWidth={4.2} strokeLinecap="round" strokeLinejoin="round">
        <line x1="11" y1="7.5" x2="11" y2="24.5" />
        <line x1="11" y1="16" x2="21.5" y2="8" />
        <line x1="11" y1="16" x2="21.5" y2="24" />
      </g>
    </svg>
  );
}
