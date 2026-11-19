import { forwardRef, useMemo, type ComponentProps } from 'react';
import { Animated, StyleSheet } from 'react-native';
import Svg, { ClipPath, Defs, FeGaussianBlur, Filter, G, LinearGradient, Mask, Path, Pattern, Rect, Stop } from 'react-native-svg';

// Animated adds a native-only prop that SVG elements must not forward to the web DOM.
const PaperPath = forwardRef<Path, ComponentProps<typeof Path> & { collapsable?: boolean }>(function PaperPath({ collapsable: _collapsable, ...props }, ref) {
  return <Path ref={ref} {...props} />;
});
const PaperRect = forwardRef<Rect, ComponentProps<typeof Rect> & { collapsable?: boolean }>(function PaperRect({ collapsable: _collapsable, ...props }, ref) {
  return <Rect ref={ref} {...props} />;
});
const AnimatedPath = Animated.createAnimatedComponent(PaperPath);
const AnimatedRect = Animated.createAnimatedComponent(PaperRect);
const INSET = 32;
export const TICKET_EDGE_HEIGHT = 10;
const GRAIN_TILE = 48;

// Deterministic pseudo-random so every render (and every platform) gets the same paper.
function seeded(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

// Fibres and specks of the paper, as an SVG pattern so it also works on native (no feTurbulence there).
const GRAIN = Array.from({ length: 160 }, (_, index) => ({
  x: seeded(index * 3 + 1) * GRAIN_TILE,
  y: seeded(index * 3 + 2) * GRAIN_TILE,
  size: 0.5 + seeded(index * 3 + 3) * 0.9,
  opacity: 0.025 + seeded(index * 7 + 5) * 0.06,
}));

// Hand-torn teeth are never identical: vary the depth of each valley slightly.
function toothDepth(index: number) {
  return TICKET_EDGE_HEIGHT - seeded(index + 101) * 3;
}

// `sheet` is the ticket itself (lit from above). `roll` is the paper still coming out of the
// printer below it: it continues the sheet without a highlight and sinks into shade, so both
// read as one continuous strip until the tear.
// `flat` only carries grain and curl, for small patches that must blend into either.
type PaperVariant = 'sheet' | 'roll' | 'flat';

function PaperFinish({ id, d, ink, variant = 'sheet' }: { id: string; d: string; ink: string; variant?: PaperVariant }) {
  return <>
    <Defs>
      <Pattern id={`${id}-grain`} patternUnits="userSpaceOnUse" width={GRAIN_TILE} height={GRAIN_TILE}>
        {GRAIN.map((speck, index) => <Rect key={index} x={speck.x} y={speck.y} width={speck.size} height={speck.size} fill={ink} opacity={speck.opacity} />)}
      </Pattern>
      {variant === 'sheet' ? <LinearGradient id={`${id}-light`} x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.55} />
        <Stop offset="0.12" stopColor="#FFFFFF" stopOpacity={0} />
      </LinearGradient> : variant === 'roll' && <LinearGradient id={`${id}-light`} x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#000000" stopOpacity={0} />
        <Stop offset="0.35" stopColor="#000000" stopOpacity={0.015} />
        <Stop offset="1" stopColor="#000000" stopOpacity={0.09} />
      </LinearGradient>}
      {/* Paper never lies perfectly flat: the long edges curl a little and catch shade. */}
      <LinearGradient id={`${id}-curl`} x1="0" y1="0" x2="1" y2="0">
        <Stop offset="0" stopColor="#000000" stopOpacity={0.06} />
        <Stop offset="0.05" stopColor="#000000" stopOpacity={0} />
        <Stop offset="0.95" stopColor="#000000" stopOpacity={0} />
        <Stop offset="1" stopColor="#000000" stopOpacity={0.06} />
      </LinearGradient>
    </Defs>
    <Path d={d} fill={`url(#${id}-grain)`} />
    {variant !== 'flat' && <Path d={d} fill={`url(#${id}-light)`} />}
    <Path d={d} fill={`url(#${id}-curl)`} />
  </>;
}

function PaperShadow({ id, d, opacity = 1, clipPath }: { id: string; d: string; opacity?: number | Animated.Value | Animated.AnimatedSubtraction<number>; clipPath?: string }) {
  return <G clipPath={clipPath}>
    <Defs>
      <Filter id={`${id}-ambient`} x="-50%" y="-50%" width="200%" height="200%"><FeGaussianBlur stdDeviation="10" /></Filter>
      <Filter id={`${id}-contact`} x="-50%" y="-50%" width="200%" height="200%"><FeGaussianBlur stdDeviation="1.2" /></Filter>
    </Defs>
    {/* Soft, wide shadow: the paper floats above the map. */}
    <AnimatedPath d={d} fill="#000000" opacity={typeof opacity === 'number' ? 0.16 * opacity : opacity.interpolate({ inputRange: [0, 1], outputRange: [0, 0.16] })} transform="translate(0 12)" filter={`url(#${id}-ambient)`} />
    {/* Tight contact shadow: replaces the hard outline that made it look like a card. */}
    <AnimatedPath d={d} fill="#000000" opacity={typeof opacity === 'number' ? 0.2 * opacity : opacity.interpolate({ inputRange: [0, 1], outputRange: [0, 0.2] })} transform="translate(0 1)" filter={`url(#${id}-contact)`} />
  </G>;
}

export function PaperSwatch({ width, height, color, ink }: { width: number; height: number; color: string; ink: string }) {
  const d = `M 0 0 H ${width} V ${height} H 0 Z`;
  return <Svg pointerEvents="none" width={width} height={height} style={StyleSheet.absoluteFill} aria-hidden>
    <Path d={d} fill={color} />
    <PaperFinish id="ticket-swatch" d={d} ink={ink} variant="flat" />
  </Svg>;
}

function edgePoints(width: number) {
  const count = Math.max(1, Math.round(width / 16));
  const size = width / count;
  const points = Array.from({ length: count }, (_, index) => {
    const x = index * size;
    return `L ${INSET + x + size / 2} ${INSET + TICKET_EDGE_HEIGHT - toothDepth(index)} L ${INSET + x + size} ${INSET + TICKET_EDGE_HEIGHT}`;
  }).join(' ');
  return { points, length: count * 2 * Math.hypot(size / 2, TICKET_EDGE_HEIGHT) };
}

type PaperProps = { width: number; color: string; ink: string; tear: Animated.Value };

export function TicketBackground({ width, height, color, ink, tear }: PaperProps & { height: number }) {
  const { points, length } = edgePoints(width);
  const edgeY = height - TICKET_EDGE_HEIGHT;
  const count = Math.max(1, Math.round(width / 16));
  const size = width / count;
  const edge = `M ${INSET} ${INSET + TICKET_EDGE_HEIGHT} ${points}`;
  const paper = `M ${INSET} ${INSET} H ${INSET + width} V ${INSET + height} ` +
    Array.from({ length: count }, (_, index) => {
      const x = INSET + width - index * size;
      return `L ${x - size / 2} ${INSET + height - toothDepth(count - 1 - index)} L ${x - size} ${INSET + height}`;
    }).join(' ') + ' Z';
  const offset = tear.interpolate({ inputRange: [0, 1], outputRange: [length, 0] });

  return <Svg pointerEvents="none" width={width + INSET * 2} height={height + INSET * 2} style={styles.background} aria-hidden>
    <PaperShadow id="ticket" d={paper} />
    <Path d={paper} fill={color} stroke="#000000" strokeOpacity={0.07} strokeWidth={0.75} strokeLinejoin="miter" />
    <PaperFinish id="ticket" d={paper} ink={ink} />
    <AnimatedPath d={edge} transform={`translate(0 ${edgeY})`} fill="none" stroke={ink} strokeOpacity={0.3} strokeWidth={1} strokeDasharray={[length, length]} strokeDashoffset={offset} />
  </Svg>;
}

export function TicketStrip({ width, height, color, ink, tear }: PaperProps & { height: number }) {
  const { points } = edgePoints(width);
  const strip = `M ${INSET} ${INSET + TICKET_EDGE_HEIGHT} ${points} V ${INSET + height} H ${INSET} Z`;
  const attached = useMemo(() => Animated.subtract(1, tear), [tear]);
  return <Svg pointerEvents="none" width={width + INSET * 2} height={height + INSET * 2} style={styles.background} aria-hidden>
    <Defs><ClipPath id="ticket-strip-sides"><Rect x={0} y={INSET + TICKET_EDGE_HEIGHT} width={width + INSET * 2} height={height + INSET} /></ClipPath></Defs>
    {/* Attached, the roll shares the ticket's side shadow but casts none onto it. */}
    <PaperShadow id="ticket-strip-attached" d={strip} opacity={attached} clipPath="url(#ticket-strip-sides)" />
    {/* Once torn it is a loose piece of paper, so its top edge casts shadow too. */}
    <PaperShadow id="ticket-strip" d={strip} opacity={tear} />
    <Path d={strip} fill={color} stroke="#000000" strokeOpacity={0.07} strokeWidth={0.75} strokeLinejoin="miter" />
    <PaperFinish id="ticket-strip" d={strip} ink={ink} variant="roll" />
  </Svg>;
}

export function TearGuide({ width, color, tear }: { width: number; color: string; tear: Animated.Value }) {
  const fadeWidth = 24;
  const fadingEdge = tear.interpolate({ inputRange: [0, 1], outputRange: [-fadeWidth, width] });
  const intactEdge = tear.interpolate({ inputRange: [0, 1], outputRange: [0, width + fadeWidth] });
  return <Svg pointerEvents="none" width={width} height={TICKET_EDGE_HEIGHT} style={styles.guide} aria-hidden>
    <Defs>
      <LinearGradient id="ticket-tear-fade" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="white" stopOpacity={0} /><Stop offset="1" stopColor="white" /></LinearGradient>
      <Mask id="ticket-tear-guide" maskUnits="userSpaceOnUse" x={0} y={0} width={width} height={TICKET_EDGE_HEIGHT}>
        <AnimatedRect x={fadingEdge} y={0} width={fadeWidth} height={TICKET_EDGE_HEIGHT} fill="url(#ticket-tear-fade)" />
        <AnimatedRect x={intactEdge} y={0} width={width} height={TICKET_EDGE_HEIGHT} fill="white" />
      </Mask>
    </Defs>
    <Path d={`M 1 ${TICKET_EDGE_HEIGHT / 2} H ${width - 1}`} fill="none" stroke={color} strokeWidth={1} strokeLinecap="round" strokeDasharray="1 4" mask="url(#ticket-tear-guide)" />
  </Svg>;
}

const styles = StyleSheet.create({ background: { position: 'absolute', left: -INSET, top: -INSET }, guide: { position: 'absolute', left: 0, top: 0 } });
