import { StrictMode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { DitheredSvgLogo, type DitheredSvgStats, type SvgFit } from '../src';
import './styles.css';

const DEFAULT_SVG = '/dithered/sample-mark.svg';
const MAX_FILE_SIZE = 1024 * 1024;
const GRID_OPTIONS = [128, 192, 256, 320] as const;
const FIT_OPTIONS: SvgFit[] = ['stretch', 'contain'];

type Source = {
  src: string;
  name: string;
  sizeLabel: string;
  uploaded: boolean;
};

const defaultSource: Source = {
  src: DEFAULT_SVG,
  name: 'sample-mark.svg',
  sizeLabel: 'sample',
  uploaded: false,
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function isSvgFile(file: File): boolean {
  return file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
}

function getBaseName(fileName: string): string {
  return fileName.replace(/\.svg$/i, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'particle-svg';
}

function App() {
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [source, setSource] = useState<Source>(defaultSource);
  const [grid, setGrid] = useState<(typeof GRID_OPTIONS)[number]>(256);
  const [fit, setFit] = useState<SvgFit>('stretch');
  const [displaySize, setDisplaySize] = useState(340);
  const [stats, setStats] = useState<DitheredSvgStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  useEffect(() => revokeObjectUrl, [revokeObjectUrl]);

  const loadFile = useCallback(
    (file: File) => {
      if (!isSvgFile(file)) {
        setError('Use an SVG file.');
        setMessage(null);
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError('Keep SVG files under 1 MB for this demo.');
        setMessage(null);
        return;
      }

      const nextUrl = URL.createObjectURL(file);
      revokeObjectUrl();
      objectUrlRef.current = nextUrl;
      setSource({
        src: nextUrl,
        name: file.name,
        sizeLabel: formatBytes(file.size),
        uploaded: true,
      });
      setFit('contain');
      setStats(null);
      setError(null);
      setMessage('SVG imported.');
    },
    [revokeObjectUrl],
  );

  const resetToSample = () => {
    revokeObjectUrl();
    setSource(defaultSource);
    setFit('stretch');
    setStats(null);
    setError(null);
    setMessage(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const assetPath = source.uploaded ? `/path/to/${source.name}` : DEFAULT_SVG;
  const codeSnippet = useMemo(
    () => `<DitheredSvgLogo
  svgSrc="${assetPath}"
  grid={${grid}}
  fit="${fit}"
  size={${displaySize}}
  aria-label="${source.name} particle preview"
/>`,
    [assetPath, displaySize, fit, grid, source.name],
  );

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(codeSnippet);
      setMessage('Code copied.');
      setError(null);
    } catch {
      setError('Clipboard access is unavailable in this browser.');
      setMessage(null);
    }
  };

  const downloadPreset = () => {
    const particleConfig = {
      type: 'svg-particle-lab',
      version: 1,
      source: {
        name: source.name,
        uploaded: source.uploaded,
        src: source.uploaded ? null : source.src,
      },
      renderer: {
        component: 'DitheredSvgLogo',
        grid,
        fit,
        size: displaySize,
      },
      stats,
    };
    const blob = new Blob([`${JSON.stringify(particleConfig, null, 2)}\n`], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${getBaseName(source.name)}-particles.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setMessage('Preset downloaded.');
    setError(null);
  };

  return (
    <main className="page">
      <section className="intro" aria-labelledby="page-title">
        <p className="eyebrow">SVG Particle Lab</p>
        <h1 id="page-title">Import SVG to particles</h1>
        <p>
          Drop in an SVG and render it as a dithered field of interactive canvas particles.
          Hover to push the dots apart. Click to fire a shockwave.
        </p>
      </section>

      <section className="workspace" aria-label="SVG particle lab">
        <div className="preview-panel">
          <DitheredSvgLogo
            svgSrc={source.src}
            grid={grid}
            fit={fit}
            size={displaySize}
            onStats={setStats}
            aria-label={`${source.name} particle preview`}
          />
        </div>

        <aside className="controls" aria-label="Renderer controls">
          <label
            className={`dropzone${isDragging ? ' is-dragging' : ''}`}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              event.preventDefault();
              setIsDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              const file = event.dataTransfer.files[0];
              if (file) loadFile(file);
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".svg,image/svg+xml"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) loadFile(file);
              }}
            />
            <span>Upload SVG</span>
            <small>Drag a file here or select one locally.</small>
          </label>

          <section className="panel" aria-label="Source">
            <p className="panel-label">Source</p>
            <p className="source-name">{source.name}</p>
            <p className="muted">{source.sizeLabel}</p>
            {source.uploaded ? (
              <button type="button" className="button secondary" onClick={resetToSample}>
                Reset sample
              </button>
            ) : null}
          </section>

          <section className="panel" aria-label="Grid">
            <p className="panel-label">Grid</p>
            <div className="segmented grid-options">
              {GRID_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={grid === option ? 'active' : ''}
                  onClick={() => {
                    setGrid(option);
                    setStats(null);
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          </section>

          <section className="panel" aria-label="Fit">
            <p className="panel-label">Fit</p>
            <div className="segmented">
              {FIT_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={fit === option ? 'active' : ''}
                  onClick={() => {
                    setFit(option);
                    setStats(null);
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          </section>

          <section className="panel" aria-label="Size">
            <label className="range-label" htmlFor="particle-size">
              <span>Size</span>
              <strong>{displaySize}px</strong>
            </label>
            <input
              id="particle-size"
              type="range"
              min={220}
              max={460}
              step={4}
              value={displaySize}
              onChange={(event) => setDisplaySize(Number(event.target.value))}
            />
          </section>

          <section className="panel" aria-label="Render stats" aria-live="polite">
            <p className="panel-label">Render</p>
            <dl className="stats">
              <div>
                <dt>Particles</dt>
                <dd>{stats ? stats.dotCount.toLocaleString() : '-'}</dd>
              </div>
              <div>
                <dt>Colors</dt>
                <dd>{stats ? stats.colorCount.toLocaleString() : '-'}</dd>
              </div>
            </dl>
            {error ? <p className="status error">{error}</p> : null}
            {message ? <p className="status">{message}</p> : null}
          </section>

          <section className="panel" aria-label="Export">
            <p className="panel-label">Export</p>
            <div className="actions">
              <button type="button" className="button secondary" onClick={copyCode}>
                Copy code
              </button>
              <button type="button" className="button secondary" onClick={downloadPreset}>
                Download preset
              </button>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
