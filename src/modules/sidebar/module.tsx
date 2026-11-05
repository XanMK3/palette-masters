import { render } from 'preact';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { ArtworkImage, ImageError } from '../artwork.js';
import { Header, ShuffleIcon } from './header.js';
import { createPaintingAnimation } from './painting-animation.js';
import { DEFAULT_PAINTINGS, FEATURED_MOVEMENTS } from '../../featured-collections.js';
import { INITIAL_ARTWORK } from '../../initial-artwork.js';
import { DEFAULT_PRESET, PRESET_IDS, PRESET_LABELS } from '../../extraction/presets.js';
import { ROLE_KEYS, type ThemeRoleKey } from '../../theme.service.js';
import type { ArtworkSelection } from '../../artwork-selection.js';
import type { SidebarModule, SidebarOptions, SidebarState } from './contracts.js';

function PaintingImage({
  work,
  sources,
}: {
  work: ArtworkSelection & { wikipediaTitle: string };
  sources: SidebarOptions['sources'];
}) {
  const direct = sources.featuredDirectImage(work);
  const [resolved, setResolved] = useState<{ url?: string; error?: string } | null>(null);
  useLayoutEffect(() => {
    if (direct) return;
    let active = true;
    sources
      .resolveFeatured(work)
      .then((image) => {
        if (active)
          setResolved(
            image?.thumbnailUrl || image?.originalUrl
              ? { url: image.thumbnailUrl || image.originalUrl || undefined }
              : { error: 'not available for this artwork' },
          );
      })
      .catch(() => {
        if (active) setResolved({ error: 'Wikimedia API blocked' });
      });
    return () => {
      active = false;
    };
  }, [work.wikipediaTitle, sources, direct]);
  const url = direct || resolved?.url;
  return url ? (
    <ArtworkImage
      key={url}
      url={url}
      title={work.title}
      artworkKey={work.wikipediaTitle}
      priority={work.wikipediaTitle === INITIAL_ARTWORK.wikipediaTitle}
      loading="eager"
    />
  ) : resolved?.error ? (
    <ImageError label={resolved.error} artworkKey={work.wikipediaTitle} />
  ) : (
    <div class="noimage">Checking Wikimedia…</div>
  );
}

function Gallery({ state, sources, actions }: SidebarOptions & { state: SidebarState }) {
  const [movementIndex, setMovement] = useState<number | null>(null);
  const gallery = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const animation = useRef<ReturnType<typeof createPaintingAnimation> | null>(null);
  useLayoutEffect(() => {
    const instance = createPaintingAnimation(gallery.current!, overlay.current!);
    animation.current = instance;
    return () => {
      instance.dispose();
      animation.current = null;
    };
  }, []);
  const movement = movementIndex === null ? null : FEATURED_MOVEMENTS[movementIndex];
  return (
    <div id="browseView">
      <select
        class="movement-picker"
        id="movementPicker"
        aria-label="Art period"
        value={movementIndex === null ? '' : String(movementIndex)}
        onChange={(event) => {
          animation.current?.dispose();
          setMovement(event.currentTarget.value === '' ? null : Number(event.currentTarget.value));
        }}
      >
        <option value="">Iconic Paintings · all times</option>
        {FEATURED_MOVEMENTS.map((entry, index) => (
          <option key={entry.id} value={String(index)}>
            {entry.name} · {entry.dates}
          </option>
        ))}
      </select>
      <div class={`works ${movement ? 'cols-3' : 'cols-4'}`} id="paintings" ref={gallery}>
        {(movement?.paintings ?? DEFAULT_PAINTINGS).map((work) => {
          const selected = state.selection?.wikipediaTitle === work.wikipediaTitle;
          return (
            <button
              key={work.wikipediaTitle}
              class={`work${selected ? ' selected' : ''}`}
              data-wikipedia-title={work.wikipediaTitle}
              title={`Select ${work.title}, ${work.artist}`}
              aria-label={`Select ${work.title}, ${work.artist}`}
              aria-pressed={selected}
              onClick={(event) => {
                actions.selectPainting({
                  ...work,
                  movement:
                    movement?.name ??
                    DEFAULT_PAINTINGS.find((entry) => entry.wikipediaTitle === work.wikipediaTitle)
                      ?.movement,
                });
                animation.current?.expand(event.currentTarget, work.artist);
              }}
            >
              <PaintingImage work={work} sources={sources} />
              <span>{work.title}</span>
            </button>
          );
        })}
        <div ref={overlay} style={{ display: 'contents' }} />
      </div>
    </div>
  );
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    console.warn('Clipboard access blocked');
  }
}
function Swatches({ state, actions }: { state: SidebarState; actions: SidebarOptions['actions'] }) {
  const { palette, assignments } = state;
  const roles = ROLE_KEYS.slice(0, 5);
  return (
    <div
      class="swatches"
      id="swatches"
      aria-label="Extracted artwork colors"
      style={{ '--swatch-count': palette?.colors.length || 5 }}
    >
      {palette
        ? palette.colors.map((hex, index) => {
            const role = roles.find((value) => assignments?.[value] === index) ?? 'bg';
            return (
              <div
                class="swatch-column"
                key={palette.swatches[index].id}
                data-swatch-id={palette.swatches[index].id}
              >
                <button
                  class="swatch"
                  type="button"
                  title={`Copy ${hex}`}
                  aria-label={`Copy palette color ${index + 1}, ${hex}`}
                  onClick={() => void copyText(hex)}
                >
                  <div class="pigment" style={{ background: hex }} />
                </button>
                <select
                  id={`palette-role-${index + 1}`}
                  disabled={state.palettePending}
                  data-swatch-index={index}
                  data-role={role}
                  value={role}
                  title={`${hex} · ${role}`}
                  aria-label={`Role for color ${index + 1}, ${hex}`}
                  onChange={(event) => {
                    if (assignments)
                      actions.assignRole(event.currentTarget.value as ThemeRoleKey, index);
                  }}
                >
                  {roles.map((value) => (
                    <option key={value} value={value}>
                      {value === 'bg' ? 'BG' : value[0].toUpperCase() + value.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            );
          })
        : Array.from({ length: 5 }, (_, index) => (
            <div class="swatch-column" key={index}>
              <div class="swatch">
                <div class="pigment" />
              </div>
              <select
                id={`palette-role-${index + 1}`}
                disabled
                aria-label={`Role for color ${index + 1}`}
              >
                <option>—</option>
              </select>
            </div>
          ))}
      {palette && palette.colors.length < 5 && (
        <span class="tiny">{palette.colors.length} distinct colors found</span>
      )}
    </div>
  );
}
function Sidebar({ state, sources, actions }: SidebarOptions & { state: SidebarState }) {
  const [source, setSource] = useState<'curated' | 'wikimedia'>('curated');
  useLayoutEffect(() => {
    if (state.selection?.source) setSource(state.selection.source);
  }, [state.selection]);
  const searched = state.searchedArtwork;
  const active = !!searched && state.selection === searched.item;
  return (
    <>
      <Header />
      <div class="sideinner">
        <section class="sidebar-panel artwork-browser" aria-label="Artwork browser">
          <div class="artwork-source-switch" role="group" aria-label="Artwork source">
            <button
              type="button"
              aria-pressed={source === 'curated'}
              onClick={() => setSource('curated')}
            >
              Selected art
            </button>
            <button
              class="artwork-search"
              id="openSearch"
              type="button"
              aria-haspopup="dialog"
              onClick={() => {
                if (searched) setSource('wikimedia');
                actions.openSearch?.();
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              Wikimedia
            </button>
          </div>
          <div hidden={source !== 'curated'}>
            <Gallery state={state} sources={sources} actions={actions} />
          </div>
          <div hidden={source !== 'wikimedia'}>
            <div class="searched-artwork">
              {searched ? (
                <button
                  class="searched-preview"
                  type="button"
                  aria-pressed={active}
                  aria-label={
                    active ? `Selected: ${searched.item.title}` : `Select ${searched.item.title}`
                  }
                  onClick={() => {
                    if (!active) actions.selectPainting(searched.item);
                  }}
                >
                  {searched.url ? (
                    <ArtworkImage
                      key={searched.url}
                      url={searched.url}
                      title={searched.item.title}
                    />
                  ) : (
                    <div class="noimage" role="status">
                      Preview not available yet
                    </div>
                  )}
                  <div class="searched-caption">
                    <strong title={searched.item.title}>{searched.item.title}</strong>
                    <span title={searched.item.artist}>{searched.item.artist}</span>
                    <small>{active ? '' : 'Click to apply palette'}</small>
                  </div>
                </button>
              ) : (
                <div class="artwork-empty">Search for a painting to get started.</div>
              )}
            </div>
          </div>
        </section>
        <section class="sidebar-panel" aria-label="Extraction settings">
          <div class="fieldrow">
            <div class="field">
              <label for="method">Extraction algorithm</label>
              <select
                id="method"
                value={state.method}
                onChange={(event) => {
                  const method = event.currentTarget.value as SidebarState['method'];
                  actions.changeMethod(method, PRESET_LABELS[method]);
                }}
              >
                {PRESET_IDS.map((id) => (
                  <option key={id} value={id}>
                    {PRESET_LABELS[id]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>
        <section class="sidebar-panel" aria-label="Extracted palette">
          <div class="palette-field">
            <div class="palette-heading">
              <div class="palette-title">
                <div class="palette-title-label">Extracted palette</div>
                <button
                  id="view-pipeline"
                  class="palette-help"
                  type="button"
                  disabled={!state.palette || state.palettePending}
                  aria-label="How this palette was extracted"
                  title="How this palette was extracted"
                  aria-haspopup="dialog"
                  onClick={actions.openPipeline}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4" />
                    <path d="M12 17h.01" />
                  </svg>
                </button>
              </div>
              <button
                id="btn-shuffle"
                type="button"
                disabled={!state.palette || state.palettePending}
                onClick={actions.shuffle}
              >
                <ShuffleIcon />
                <span>Shuffle Roles</span>
              </button>
            </div>
            <Swatches state={state} actions={actions} />
            <p id="palette-error" class="tiny" role="alert">
              {state.error}
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
export function mountSidebar(root: HTMLElement, options: SidebarOptions): SidebarModule {
  let disposed = false;
  const actions: SidebarOptions['actions'] = {
    openSearch: () => {
      if (!disposed) options.actions.openSearch?.();
    },
    selectPainting: (item) => {
      if (!disposed) options.actions.selectPainting(item);
    },
    changeMethod: (method, label) => {
      if (!disposed) options.actions.changeMethod(method, label);
    },
    assignRole: (role, index) => {
      if (!disposed) options.actions.assignRole(role, index);
    },
    shuffle: () => {
      if (!disposed) options.actions.shuffle();
    },
    openPipeline: () => {
      if (!disposed) options.actions.openPipeline();
    },
  };
  const update = (state: SidebarState) => {
    if (!disposed) render(<Sidebar {...options} actions={actions} state={state} />, root);
  };
  update({ selection: null, palette: null, assignments: null, method: DEFAULT_PRESET, error: '' });
  return {
    update,
    dispose() {
      if (disposed) return;
      disposed = true;
      render(null, root);
    },
  };
}
