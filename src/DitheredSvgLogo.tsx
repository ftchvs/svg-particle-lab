import { useEffect, useRef, type CSSProperties } from 'react';

const DOT_STEP = 1;
const DOT_FILL_RATIO = 0.78;
const COLOR_QUANT_BITS = 4;

const SHOCKWAVE_DURATION = 675;
const SHOCKWAVE_SPEED = 225;
const SHOCKWAVE_WIDTH = 37;
const SHOCKWAVE_STRENGTH = 20;
const HOVER_RADIUS = 100;
const HOVER_STRENGTH = 40;
const SMOOTHING = 0.12;
const ZERO_SNAP = 0.01;

export type SvgFit = 'stretch' | 'contain';

export type DitheredSvgStats = {
  dotCount: number;
  colorCount: number;
  grid: number;
};

export type DitheredSvgLogoProps = {
  /** URL of the SVG to render. Same-origin, object URLs, or CORS-enabled URLs work best. */
  svgSrc: string;
  /** Sampling grid size. Higher = more dots, sharper detail, slower draw. */
  grid?: number;
  /** How the SVG is rasterized into the square sampling grid. */
  fit?: SvgFit;
  /** CSS pixel size of the square canvas. */
  size?: number;
  className?: string;
  style?: CSSProperties;
  onStats?: (stats: DitheredSvgStats) => void;
  'aria-label'?: string;
};

type Extracted = {
  dots: Int16Array;
  colors: string[];
  grid: number;
};

type State = {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  scale: number;
  dotSize: number;
  count: number;
  logoX: Float32Array;
  logoY: Float32Array;
  renderX: Float32Array;
  renderY: Float32Array;
  dispX: Float32Array;
  dispY: Float32Array;
  colorBuckets: Int32Array[];
  colors: string[];
  mouseX: number;
  mouseY: number;
  mouseActive: boolean;
  shockwaves: { x: number; y: number; start: number }[];
  needsAnim: boolean;
  hasDisplacement: boolean;
  firstRender: boolean;
};

function loadSvgImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load SVG: ${src}`));
    img.src = src;
  });
}

async function extractDotsFromSvg(
  src: string,
  grid: number,
  fit: SvgFit,
): Promise<Extracted> {
  const img = await loadSvgImage(src);
  const offscreen = document.createElement('canvas');
  offscreen.width = offscreen.height = grid;
  const ctx = offscreen.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D context is unavailable.');

  if (fit === 'contain') {
    const naturalWidth = img.naturalWidth || grid;
    const naturalHeight = img.naturalHeight || grid;
    const scale = Math.min(grid / naturalWidth, grid / naturalHeight);
    const drawWidth = naturalWidth * scale;
    const drawHeight = naturalHeight * scale;
    ctx.drawImage(img, (grid - drawWidth) / 2, (grid - drawHeight) / 2, drawWidth, drawHeight);
  } else {
    ctx.drawImage(img, 0, 0, grid, grid);
  }

  const data = ctx.getImageData(0, 0, grid, grid).data;
  const shift = 8 - COLOR_QUANT_BITS;
  const colorMap = new Map<number, number>();
  const colors: string[] = [];
  const raw: number[] = [];

  for (let y = 0; y < grid; y += DOT_STEP) {
    const row = y * grid;
    for (let x = 0; x < grid; x += DOT_STEP) {
      const i = (row + x) * 4;
      if (data[i + 3] < 128) continue;

      const rq = data[i] >> shift;
      const gq = data[i + 1] >> shift;
      const bq = data[i + 2] >> shift;
      const key = (rq << (COLOR_QUANT_BITS * 2)) | (gq << COLOR_QUANT_BITS) | bq;

      let colorIndex = colorMap.get(key);
      if (colorIndex === undefined) {
        colorIndex = colors.length;
        colorMap.set(key, colorIndex);
        const r = (rq << shift) | (rq >> COLOR_QUANT_BITS);
        const g = (gq << shift) | (gq >> COLOR_QUANT_BITS);
        const b = (bq << shift) | (bq >> COLOR_QUANT_BITS);
        colors.push(`rgb(${r}, ${g}, ${b})`);
      }

      raw.push(x, y, colorIndex);
    }
  }

  return { dots: Int16Array.from(raw), colors, grid };
}

function buildState(canvas: HTMLCanvasElement, extracted: Extracted): State | null {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  if (width === 0 || height === 0) return null;

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const scale = Math.min(width, height) / extracted.grid;
  const offsetX = (width - extracted.grid * scale) / 2;
  const offsetY = (height - extracted.grid * scale) / 2;
  const count = extracted.dots.length / 3;
  const numColors = extracted.colors.length;

  const logoX = new Float32Array(count);
  const logoY = new Float32Array(count);
  const renderX = new Float32Array(count);
  const renderY = new Float32Array(count);
  const dispX = new Float32Array(count);
  const dispY = new Float32Array(count);

  const counts = new Int32Array(numColors);
  for (let i = 0; i < count; i += 1) counts[extracted.dots[i * 3 + 2]] += 1;
  const colorBuckets = Array.from({ length: numColors }, (_, c) => new Int32Array(counts[c]));
  const cursors = new Int32Array(numColors);

  for (let i = 0; i < count; i += 1) {
    const x = extracted.dots[i * 3];
    const y = extracted.dots[i * 3 + 1];
    const color = extracted.dots[i * 3 + 2];
    logoX[i] = renderX[i] = offsetX + x * scale;
    logoY[i] = renderY[i] = offsetY + y * scale;
    colorBuckets[color][cursors[color]] = i;
    cursors[color] += 1;
  }

  return {
    ctx,
    width,
    height,
    scale,
    dotSize: Math.max(1, scale * DOT_STEP * DOT_FILL_RATIO),
    count,
    logoX,
    logoY,
    renderX,
    renderY,
    dispX,
    dispY,
    colorBuckets,
    colors: extracted.colors,
    mouseX: -9999,
    mouseY: -9999,
    mouseActive: false,
    shockwaves: [],
    needsAnim: false,
    hasDisplacement: false,
    firstRender: false,
  };
}

const wrapperStyle: CSSProperties = {
  position: 'relative',
  display: 'inline-block',
  aspectRatio: '1 / 1',
  touchAction: 'none',
  userSelect: 'none',
  WebkitTapHighlightColor: 'transparent',
};

const canvasStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  height: '100%',
  opacity: 0,
  transition: 'opacity 240ms cubic-bezier(0.23, 1, 0.32, 1)',
};

export function DitheredSvgLogo({
  svgSrc,
  grid = 256,
  fit = 'stretch',
  size,
  className,
  style,
  onStats,
  ...rest
}: DitheredSvgLogoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<State | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    let cancelled = false;
    let rafId: number | null = null;
    let extracted: Extracted | null = null;
    canvas.removeAttribute('data-ready');
    canvas.style.opacity = '0';

    const animate = (now: number) => {
      const state = stateRef.current;
      if (!state) return;
      state.needsAnim = false;

      state.shockwaves = state.shockwaves.filter(
        (shockwave) => now - shockwave.start < SHOCKWAVE_DURATION,
      );
      const hasShockwave = state.shockwaves.length > 0;

      if (state.mouseActive || hasShockwave || state.hasDisplacement) {
        state.hasDisplacement = false;
        const shockwaveMultiplier = 1 + (state.shockwaves.length - 1) * 0.5;
        if (hasShockwave) state.needsAnim = true;

        for (let i = 0; i < state.count; i += 1) {
          const ox = state.logoX[i];
          const oy = state.logoY[i];
          let dx = 0;
          let dy = 0;

          if (state.mouseActive) {
            const ex = ox + state.dispX[i] - state.mouseX;
            const ey = oy + state.dispY[i] - state.mouseY;
            const distanceSquared = ex * ex + ey * ey;
            if (distanceSquared < HOVER_RADIUS * HOVER_RADIUS && distanceSquared > 0.1) {
              const distance = Math.sqrt(distanceSquared);
              const falloff = 1 - distance / HOVER_RADIUS;
              const force = falloff * falloff * falloff * HOVER_STRENGTH;
              dx = (ex / distance) * force;
              dy = (ey / distance) * force;
            }
          }

          for (const shockwave of state.shockwaves) {
            const age = (now - shockwave.start) / 1000;
            const radius = age * SHOCKWAVE_SPEED;
            const life = 1 - (now - shockwave.start) / SHOCKWAVE_DURATION;
            const mx = ox - shockwave.x;
            const my = oy - shockwave.y;
            const distance = Math.sqrt(mx * mx + my * my);
            if (distance < 0.1) continue;

            const ringDistance = Math.abs(distance - radius);
            if (ringDistance < SHOCKWAVE_WIDTH) {
              const strength =
                (1 - ringDistance / SHOCKWAVE_WIDTH) *
                life *
                SHOCKWAVE_STRENGTH *
                shockwaveMultiplier;
              dx += (mx / distance) * strength;
              dy += (my / distance) * strength;
            }
          }

          state.dispX[i] += (dx - state.dispX[i]) * SMOOTHING;
          state.dispY[i] += (dy - state.dispY[i]) * SMOOTHING;
          if (Math.abs(state.dispX[i]) < ZERO_SNAP) state.dispX[i] = 0;
          if (Math.abs(state.dispY[i]) < ZERO_SNAP) state.dispY[i] = 0;

          if (state.dispX[i] !== 0 || state.dispY[i] !== 0) {
            state.needsAnim = true;
            state.hasDisplacement = true;
          }

          state.renderX[i] = ox + state.dispX[i];
          state.renderY[i] = oy + state.dispY[i];
        }
      }

      state.ctx.clearRect(0, 0, state.width, state.height);
      const half = state.dotSize * 0.5;
      for (let color = 0; color < state.colors.length; color += 1) {
        state.ctx.fillStyle = state.colors[color];
        const bucket = state.colorBuckets[color];
        for (let k = 0; k < bucket.length; k += 1) {
          const i = bucket[k];
          state.ctx.fillRect(state.renderX[i] - half, state.renderY[i] - half, state.dotSize, state.dotSize);
        }
      }

      if (!state.firstRender) {
        state.firstRender = true;
        requestAnimationFrame(() => {
          canvas.dataset.ready = 'true';
          canvas.style.opacity = '1';
        });
      }

      rafId = state.mouseActive || state.needsAnim ? requestAnimationFrame(animate) : null;
    };

    const kick = () => {
      if (rafId === null) rafId = requestAnimationFrame(animate);
    };

    const getCoords = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    const onMove = (event: PointerEvent) => {
      const state = stateRef.current;
      if (!state || event.pointerType !== 'mouse') return;
      const { x, y } = getCoords(event);
      state.mouseX = x;
      state.mouseY = y;
      state.mouseActive = true;
      kick();
    };

    const onLeave = (event: PointerEvent) => {
      const state = stateRef.current;
      if (!state || event.pointerType !== 'mouse') return;
      state.mouseActive = false;
      kick();
    };

    const onUp = (event: PointerEvent) => {
      const state = stateRef.current;
      if (!state) return;
      const { x, y } = getCoords(event);
      state.shockwaves.push({ x, y, start: performance.now() });
      kick();
    };

    const onResize = () => {
      if (!extracted) return;
      stateRef.current = buildState(canvas, extracted);
      kick();
    };

    void (async () => {
      try {
        const nextExtracted = await extractDotsFromSvg(svgSrc, grid, fit);
        if (cancelled) return;
        extracted = nextExtracted;
        stateRef.current = buildState(canvas, nextExtracted);
        onStats?.({
          dotCount: nextExtracted.dots.length / 3,
          colorCount: nextExtracted.colors.length,
          grid: nextExtracted.grid,
        });
        canvas.addEventListener('pointermove', onMove);
        canvas.addEventListener('pointerleave', onLeave);
        canvas.addEventListener('pointerup', onUp);
        window.addEventListener('resize', onResize);
        kick();
      } catch (error) {
        console.error('[DitheredSvgLogo] failed to load SVG:', svgSrc, error);
      }
    })();

    return () => {
      cancelled = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('pointerup', onUp);
      window.removeEventListener('resize', onResize);
    };
  }, [fit, grid, onStats, svgSrc]);

  const dim = size ? { width: `min(${size}px, 100%)` } : undefined;

  return (
    <div
      className={className}
      role="img"
      aria-label={rest['aria-label'] ?? 'Dithered SVG particle canvas'}
      style={{ ...wrapperStyle, ...dim, ...style }}
    >
      <canvas ref={canvasRef} aria-hidden="true" style={canvasStyle} />
    </div>
  );
}
