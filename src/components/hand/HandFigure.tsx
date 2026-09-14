import { type Hand } from '@/domain/models';
import { HAND_OUTLINE, HAND_VIEWBOX_HEIGHT, HAND_VIEWBOX_WIDTH, RING_BARS } from './geometry';

/** The line-drawn hand and ring. Decorative: the contact points carry the meaning. */
export function HandFigure({ hand, className }: { hand: Hand; className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${HAND_VIEWBOX_WIDTH} ${HAND_VIEWBOX_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
      className={className}
      data-hand={hand}
    >
      <g transform={hand === 'left' ? `translate(${HAND_VIEWBOX_WIDTH} 0) scale(-1 1)` : undefined}>
        <g fill="currentColor" opacity="0.05">
          {HAND_OUTLINE.map((rect) => (
            <rect
              key={rect.id}
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
              rx={rect.rx}
              transform={rect.transform}
            />
          ))}
        </g>
        <g fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="2">
          {HAND_OUTLINE.map((rect) => (
            <rect
              key={rect.id}
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
              rx={rect.rx}
              transform={rect.transform}
            />
          ))}
        </g>
        <g strokeWidth="5" strokeLinecap="round" className="stroke-primary">
          {RING_BARS.map((bar) => (
            <line key={bar.y} x1={bar.x1} x2={bar.x2} y1={bar.y} y2={bar.y} />
          ))}
        </g>
      </g>
    </svg>
  );
}
