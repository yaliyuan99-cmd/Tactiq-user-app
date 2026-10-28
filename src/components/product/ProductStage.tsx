import { useId, type ReactNode } from 'react';
import { CONTACT_KEYS, type ContactKey } from '@/domain/contacts';
import { type Hand } from '@/domain/models';
import { HAND_OUTLINE, RING_BARS } from '@/components/hand/geometry';
import { cn } from '@/lib/cn';
import {
  arcPath,
  contactPoint,
  CONTACT_CHORDS,
  CONTACT_ROLES,
  mirrorTransform,
  reachPath,
  RING_CENTRE,
  STAGE_FRAMES,
  THUMB_PAD,
  WINDOW_ARC_END_DEG,
  WINDOW_ARC_START_DEG,
  WINDOW_ARCS,
  type StageVariant,
} from './stageGeometry';

export interface ProductStageProps {
  /** Which hand wears the ring. Mirrors the whole drawing, as HandMap does. */
  readonly hand?: Hand;
  /** 'hero' adds the squeeze arcs, the thumb's reach and the frame ticks. */
  readonly variant?: StageVariant;
  /** Drawn with a halo: the point the surrounding text or controls are about. */
  readonly highlightContact?: ContactKey | null;
  /** A key to the markings. On by default in the hero, off in the compact frame. */
  readonly legend?: boolean;
  /** Visible description of the drawing; the drawing itself is decorative. */
  readonly caption?: ReactNode;
  readonly className?: string;
}

const LEGEND_ITEMS: readonly { readonly id: string; readonly label: string }[] = [
  { id: 'fixed', label: 'Fixed command' },
  { id: 'shortcut', label: 'Shortcut you choose' },
  { id: 'emergency', label: 'Five-second hold: Emergency' },
  { id: 'ring', label: 'Ring, worn on the index finger' },
];

function LegendSwatch({ id }: { id: string }) {
  if (id === 'ring') {
    return (
      <span aria-hidden="true" className="flex h-5 w-5 shrink-0 flex-col justify-center gap-[3px]">
        <span className="h-[3px] w-5 rounded-full bg-primary" />
        <span className="h-[3px] w-5 rounded-full bg-primary" />
      </span>
    );
  }
  return (
    <span aria-hidden="true" className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
      <span className={cn('h-3 w-3 rounded-full', id === 'fixed' ? 'bg-foreground' : 'bg-primary')} />
      {id === 'emergency' && <span className="absolute inset-0 rounded-full border-2 border-dashed border-primary" />}
    </span>
  );
}

type OutlineInset = 0 | 5;

/** The hand outline from geometry.ts, optionally inset to draw an inner contour. */
function OutlineRects({ inset = 0 }: { inset?: OutlineInset }) {
  return (
    <>
      {HAND_OUTLINE.map((rect) => (
        <rect
          key={rect.id}
          x={rect.x + inset}
          y={rect.y + inset}
          width={Math.max(rect.width - inset * 2, 2)}
          height={Math.max(rect.height - inset * 2, 2)}
          rx={Math.max(rect.rx - inset, 1)}
          transform={rect.transform}
        />
      ))}
    </>
  );
}

/**
 * The shared product visual: the hand, the ring and the eight contact points,
 * drawn from the app's own geometry (see ./stageGeometry.ts).
 *
 * Deliberately static. There is no parallax, no video, no WebGL and no
 * background motion: depth comes from four stepped arcs around the ring, two
 * measured chords across the contact points and one bowed line for the
 * thumb's reach. Reduced motion therefore changes nothing here.
 *
 * The SVG is decorative — every point it draws is named in words by the
 * caption, the legend, or the controls a caller puts beside it.
 */
export function ProductStage({
  hand = 'right',
  variant = 'hero',
  highlightContact = null,
  legend,
  caption,
  className,
}: ProductStageProps) {
  const uid = useId().replace(/:/g, '');
  const frame = STAGE_FRAMES[variant];
  const hero = variant === 'hero';
  const showLegend = legend ?? hero;
  const reachTarget = contactPoint(highlightContact ?? 'index_tip');

  return (
    <figure className={cn('m-0 flex w-full flex-col gap-4', className)} data-hand={hand} data-variant={variant}>
      <div
        className="relative w-full text-foreground"
        style={{ aspectRatio: `${frame.width} / ${frame.height}` }}
      >
        <svg
          viewBox={`0 0 ${frame.width} ${frame.height}`}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
          focusable="false"
          className="absolute inset-0 h-full w-full"
        >
          <defs>
            <linearGradient id={`stage-wash-${uid}`} x1="0" y1="0" x2="0.35" y2="1">
              <stop offset="0" stopColor="currentColor" stopOpacity="0.055" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
            <clipPath id={`stage-clip-${uid}`}>
              <rect x="1" y="1" width={frame.width - 2} height={frame.height - 2} rx="20" />
            </clipPath>
          </defs>

          <g clipPath={`url(#stage-clip-${uid})`}>
            <rect width={frame.width} height={frame.height} fill={`url(#stage-wash-${uid})`} />
            <g transform={mirrorTransform(hand, frame.width)}>
              <g transform={`translate(${frame.offsetX} 0)`}>
                {hero &&
                  WINDOW_ARCS.map((arc) => (
                    <path
                      key={arc.radius}
                      d={arcPath(arc.radius, WINDOW_ARC_START_DEG, WINDOW_ARC_END_DEG)}
                      fill="none"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeOpacity={arc.opacity}
                      strokeDasharray={arc.dashed ? '2 7' : undefined}
                      className="stroke-primary"
                    />
                  ))}

                <g fill="currentColor" fillOpacity="0.045">
                  <OutlineRects />
                </g>
                <g fill="none" stroke="currentColor" strokeOpacity="0.38" strokeWidth="1.75">
                  <OutlineRects />
                </g>
                {hero && (
                  <g fill="none" stroke="currentColor" strokeOpacity="0.11" strokeWidth="1">
                    <OutlineRects inset={5} />
                  </g>
                )}

                {hero &&
                  CONTACT_CHORDS.map((chord) => (
                    <polyline
                      key={chord}
                      points={chord}
                      fill="none"
                      stroke="currentColor"
                      strokeOpacity="0.28"
                      strokeWidth="1"
                      strokeDasharray="4 5"
                    />
                  ))}

                <g strokeLinecap="round" className="stroke-primary">
                  {RING_BARS.map((bar) => (
                    <line key={bar.y} x1={bar.x1} x2={bar.x2} y1={bar.y} y2={bar.y} strokeWidth="5" />
                  ))}
                </g>
                {hero && (
                  <circle
                    cx={RING_CENTRE.x}
                    cy={RING_CENTRE.y}
                    r="26"
                    fill="none"
                    strokeWidth="1.25"
                    strokeOpacity="0.5"
                    className="stroke-primary"
                  />
                )}

                {hero && (
                  <>
                    <path
                      d={reachPath(THUMB_PAD, reachTarget)}
                      fill="none"
                      strokeWidth="1.5"
                      strokeDasharray="5 6"
                      strokeOpacity="0.75"
                      strokeLinecap="round"
                      className="stroke-primary"
                    />
                    <circle
                      cx={THUMB_PAD.x}
                      cy={THUMB_PAD.y}
                      r="4.5"
                      fill="none"
                      strokeWidth="1.5"
                      className="stroke-primary"
                    />
                  </>
                )}

                {CONTACT_KEYS.map((key) => {
                  const { x, y } = contactPoint(key);
                  const role = CONTACT_ROLES[key];
                  const isHighlighted = key === highlightContact;
                  return (
                    <g key={key} data-contact={key}>
                      {isHighlighted && (
                        <>
                          <circle cx={x} cy={y} r="16" className="fill-primary" fillOpacity="0.16" />
                          <circle
                            cx={x}
                            cy={y}
                            r="16"
                            fill="none"
                            strokeWidth="1.5"
                            className="stroke-primary"
                          />
                        </>
                      )}
                      {role === 'emergency' && (
                        <circle
                          cx={x}
                          cy={y}
                          r="11"
                          fill="none"
                          strokeWidth="1.75"
                          strokeDasharray="3 3"
                          className="stroke-primary"
                        />
                      )}
                      <circle
                        cx={x}
                        cy={y}
                        r={isHighlighted ? 7 : 5.5}
                        className={role === 'fixed' ? 'fill-foreground' : 'fill-primary'}
                      />
                    </g>
                  );
                })}
              </g>
            </g>
          </g>

          {hero && (
            <g fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.25" strokeLinecap="square">
              <path d="M 14 32 L 14 14 L 32 14" />
              <path d={`M ${frame.width - 32} 14 L ${frame.width - 14} 14 L ${frame.width - 14} 32`} />
              <path d={`M 14 ${frame.height - 32} L 14 ${frame.height - 14} L 32 ${frame.height - 14}`} />
              <path
                d={`M ${frame.width - 32} ${frame.height - 14} L ${frame.width - 14} ${frame.height - 14} L ${frame.width - 14} ${frame.height - 32}`}
              />
            </g>
          )}
        </svg>
      </div>

      {showLegend && (
        <ul className="grid gap-x-5 gap-y-2 min-[380px]:grid-cols-2">
          {LEGEND_ITEMS.map((item) => (
            <li key={item.id} className="font-mono-label flex items-center gap-2 text-muted-foreground">
              <LegendSwatch id={item.id} />
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      )}

      {caption && <figcaption className="text-sm text-muted-foreground">{caption}</figcaption>}
    </figure>
  );
}
