import { useState } from 'preact/hooks';
import {
  FEATURED_FILE_PAGES,
  FEATURED_UPLOAD_IMAGES,
  FEATURED_DIRECT_IMAGES,
} from '../featured-images.js';
import { EMBEDDED_ART_IMAGES } from '../embedded-art.js';

export function ImageError({ label, artworkKey }: { label: string; artworkKey?: string }) {
  return (
    <div class="placeholder missing-art" role="img" aria-label="Painting image unavailable">
      <strong class="missing-glyph">▧</strong>
      <small>Artwork image unavailable</small>
      <small class="missing-reason">{label}</small>
      {artworkKey && FEATURED_FILE_PAGES[artworkKey] && (
        <a href={FEATURED_FILE_PAGES[artworkKey]} target="_blank" rel="noopener noreferrer">
          View on Commons ↗
        </a>
      )}
    </div>
  );
}
/** Key by URL so a changed source resets native-image fallback and loading state. */
export function ArtworkImage({
  url,
  title,
  artworkKey,
  priority = false,
  loading = 'lazy',
}: {
  url: string;
  title: string;
  artworkKey?: string;
  priority?: boolean;
  loading?: 'eager' | 'lazy';
}) {
  const [index, setIndex] = useState(0);
  const [cors, setCors] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const urls = [
    ...new Set(
      [
        url,
        ...(artworkKey
          ? [
              EMBEDDED_ART_IMAGES[artworkKey],
              FEATURED_UPLOAD_IMAGES[artworkKey],
              FEATURED_DIRECT_IMAGES[artworkKey],
            ]
          : []),
      ].filter((value): value is string => !!value),
    ),
  ];
  const failed = index >= urls.length;
  return (
    <div class="image-holder">
      <div class={`loading-art${failed ? ' unavailable-art' : ''}`} hidden={loaded}>
        {failed ? `Image unavailable: ${title}` : `Loading ${title}…`}
        {failed && artworkKey && FEATURED_FILE_PAGES[artworkKey] && (
          <a href={FEATURED_FILE_PAGES[artworkKey]} target="_blank" rel="noopener noreferrer">
            Commons source ↗
          </a>
        )}
      </div>
      {!failed && (
        <img
          crossorigin={cors ? 'anonymous' : undefined}
          fetchPriority={priority ? 'high' : 'auto'}
          src={urls[index]}
          alt={title}
          decoding="async"
          loading={priority ? 'eager' : loading}
          class={loaded ? 'loaded' : ''}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setLoaded(false);
            // Keep display working on hosts that do not permit pixel access.
            if (cors) {
              setCors(false);
              return;
            }
            setCors(true);
            setIndex((value) => value + 1);
          }}
        />
      )}
    </div>
  );
}
