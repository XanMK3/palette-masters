/**
 * Wikimedia Art Service — a framework-agnostic, browser-friendly TypeScript
 * client for Wikidata, Wikimedia Commons and optional Wikipedia summaries.
 *
 * No API key required. Uses only the standard fetch API.
 *
 * @example
 * const art = new WikimediaArtService();
 * const hits = await art.searchEntities('Claude Monet');
 * const artist = await art.getEntity(hits[0].id);
 * const paintings = await art.getArtistPaintings(artist.id);
 */

export type ArtKind = 'artist' | 'painting' | 'other';
export type ArtSearchSource = 'wikidata' | 'commons';

export interface RequestOptions {
  /** Pass an AbortController.signal to cancel a superseded search. */
  signal?: AbortSignal;
}

export interface SearchOptions extends RequestOptions {
  /** Number of Wikidata results (1–50). Default 15. */
  limit?: number;
}

export type CommonsContinuation = Record<string, string | number>;
export interface CommonsSearchPage {
  images: CommonsImage[];
  continuation: CommonsContinuation | null;
}

export interface CommonsSearchOptions extends RequestOptions {
  /** Opaque continuation returned by searchCommonsImagesPage. */
  continuation?: CommonsContinuation;

  /** Number of image matches (1–25). Default 9. */
  limit?: number;
  /** Requested thumbnail width in pixels (100–1600). Default 320. */
  thumbnailWidth?: number;
  /** Add the word “painting” to a Commons search. Default true. */
  appendPaintingKeyword?: boolean;
}

export interface ArtistPaintingsOptions extends RequestOptions {
  /** Max rows (1–50). Default 24. WDQS may return fewer. */
  limit?: number;
  /** Only paintings with a Wikidata P18 image. Default false. */
  onlyWithImage?: boolean;
}

export interface WikimediaArtServiceOptions {
  /** Wikidata labels + Wikimedia Wikipedia language. Default 'en'. */
  language?: string;
  /** Cache lifetime for successful requests in milliseconds. Default 300000. */
  cacheTtlMs?: number;
  /** Provide a custom fetch for tests, SSR, or gateways. */
  fetchImpl?: typeof fetch;
}

export interface WikidataSearchHit {
  id: string;
  label: string;
  description: string | null;
  /** Heuristic based on description, NOT verified instance-of/occupation data. */
  kindHint: ArtKind;
  wikidataUrl: string;
}

export interface WikidataArtEntity {
  id: string;
  label: string;
  description: string | null;
  /** A conservative classification from Wikidata claims, not a taxonomy. */
  kind: ArtKind;
  wikidataUrl: string;
  wikipediaTitle: string | null;
  wikipediaUrl: string | null;
  imageFilename: string | null;
  /** A redirecting Commons image URL. A usable thumbnail is not guaranteed. */
  imageUrl: string | null;
  creatorId: string | null;
  movementId: string | null;
  collectionId: string | null;
  birthplaceId: string | null;
  instanceOfIds: string[];
  occupationIds: string[];
  createdYear: number | null;
  birthYear: number | null;
  deathYear: number | null;
}

export interface CommonsImage {
  fileTitle: string;
  thumbnailUrl: string | null;
  originalUrl: string | null;
  filePageUrl: string | null;
  license: string | null;
  licenseUrl: string | null;
  /** Untrusted HTML metadata supplied by Commons; do NOT inject as innerHTML. */
  artistHtml: string | null;
  descriptionHtml: string | null;
}

export interface ArtistPainting {
  id: string;
  title: string;
  year: number | null;
  imageFilename: string | null;
  imageUrl: string | null;
  wikidataUrl: string;
}

export interface WikipediaSummary {
  title: string;
  description: string | null;
  extract: string | null;
  thumbnailUrl: string | null;
  originalImageUrl: string | null;
  wikidataId: string | null;
  pageUrl: string | null;
}

/** An artwork lookup; hints are optional and may be outdated. */
export interface ArtworkImageLookup {
  title: string;
  artist?: string;
  filename?: string;
  qid?: string;
}

/** Decoded pixels and a displayable URL for the SAME fetched image bytes. */
export interface LoadedWikimediaImage {
  imageData: ImageData;
  displayUrl: string;
  /** Release the object URL when replacing the selection. */
  dispose(): void;
}

export interface AllSearchResults {
  entities: WikidataSearchHit[];
  images: CommonsImage[];
  /** Partial failures. Search succeeds if either source responds. */
  errors: Array<{ source: ArtSearchSource; message: string }>;
}

export class WikimediaApiError extends Error {
  override name = 'WikimediaApiError';
  constructor(
    message: string,
    public readonly status: number | null,
    public readonly retryAfter: string | null = null,
  ) {
    super(message);
  }
}

// Shape definitions for fields consumed from the Wikimedia APIs.
interface ApiErrorShape {
  error?: { info?: string; code?: string };
}
interface SnakValue {
  id?: string;
  time?: string;
}
interface Statement {
  rank?: string;
  mainsnak?: { datavalue?: { value?: unknown } };
}
interface EntityRecord {
  id?: string;
  labels?: Record<string, { value: string }>;
  descriptions?: Record<string, { value: string }>;
  claims?: Record<string, Statement[]>;
  sitelinks?: Record<string, { title: string }>;
  missing?: string;
}
interface SearchResultRaw {
  id?: string;
  label?: string;
  description?: string;
}
interface SearchResponse extends ApiErrorShape {
  search?: SearchResultRaw[];
}
interface EntitiesResponse extends ApiErrorShape {
  entities?: Record<string, EntityRecord>;
}
interface ImageInfo {
  url?: string;
  thumburl?: string;
  descriptionurl?: string;
  extmetadata?: Record<string, { value?: string }>;
}
interface CommonsPage {
  index?: number;
  title?: string;
  missing?: string;
  imageinfo?: ImageInfo[];
}
interface CommonsResponse extends ApiErrorShape {
  continue?: CommonsContinuation;
  query?: { pages?: Record<string, CommonsPage> };
}
interface SparqlBinding {
  value: string;
}
interface SparqlResponse {
  results?: { bindings?: Array<Record<string, SparqlBinding>> };
}
interface WikipediaSummaryResponse {
  title?: string;
  description?: string;
  extract?: string;
  wikibase_item?: string;
  thumbnail?: { source?: string };
  originalimage?: { source?: string };
  content_urls?: { desktop?: { page?: string } };
}

const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const SPARQL_API = 'https://query.wikidata.org/sparql';
const QID_RE = /^Q[1-9]\d*$/;

function bounded(value: number | undefined, fallback: number, min: number, max: number): number {
  if (value === undefined) return fallback;
  if (!Number.isFinite(value)) throw new RangeError(`Expected a number between ${min} and ${max}`);
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function assertQid(id: string): void {
  if (!QID_RE.test(id)) throw new TypeError(`Invalid Wikidata QID: ${id}`);
}

function safeQuery(query: string): string {
  const result = query.trim();
  if (!result) throw new TypeError('Search query must not be empty');
  return result;
}

function valueOfClaim(entity: EntityRecord, property: string): unknown {
  const statements = entity.claims?.[property] ?? [];
  const statement =
    statements.find((s) => s.rank === 'preferred') ??
    statements.find((s) => s.rank !== 'deprecated');
  return statement?.mainsnak?.datavalue?.value ?? null;
}

function idsOfClaims(entity: EntityRecord, property: string): string[] {
  const values = entity.claims?.[property] ?? [];
  return values
    .filter((s) => s.rank !== 'deprecated')
    .map((s) => (s.mainsnak?.datavalue?.value as SnakValue | undefined)?.id)
    .filter((id): id is string => typeof id === 'string' && QID_RE.test(id));
}

function entityId(value: unknown): string | null {
  const id = (value as SnakValue | null)?.id;
  return typeof id === 'string' && QID_RE.test(id) ? id : null;
}

function yearOf(value: unknown): number | null {
  const time = (value as SnakValue | null)?.time;
  const match = typeof time === 'string' ? time.match(/^([+-])(\d{4,})-/) : null;
  if (!match) return null;
  const year = Number(match[2]) * (match[1] === '-' ? -1 : 1);
  return Number.isSafeInteger(year) ? year : null;
}

function sparqlYear(date: string | undefined): number | null {
  if (!date) return null;
  const m = date.match(/^([+-]?)(\d{4,})-/);
  if (!m) return null;
  const year = Number(m[2]) * (m[1] === '-' ? -1 : 1);
  return Number.isSafeInteger(year) ? year : null;
}

function kindHint(description: string | undefined): ArtKind {
  const d = (description ?? '').toLowerCase();
  if (/painter|visual artist|artist|printmaker|sculptor|illustrator|portraitist/.test(d))
    return 'artist';
  if (/painting|oil on canvas|fresco|work of art|artwork|portrait of/.test(d)) return 'painting';
  return 'other';
}

function rawImageToFilename(rawUrl: string | undefined): string | null {
  if (!rawUrl) return null;
  try {
    // WDQS ?image uses Commons Special:FilePath URLs.
    const filename = decodeURIComponent(new URL(rawUrl).pathname.split('/').pop() ?? '');
    return filename || null;
  } catch {
    return null;
  }
}

function metadataValue(info: ImageInfo, key: string): string | null {
  return info.extmetadata?.[key]?.value ?? null;
}

function artworkMatchScore(filename: string, title: string, artist: string): number {
  const tokens = (text: string) =>
    text
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .split(' ')
      .filter((t) => t.length > 2);
  const file = tokens(filename.replace(/^File:/i, '').replace(/\.[^.]+$/, ''));
  const t = tokens(title);
  const a = tokens(artist);
  let score = 0;
  for (const token of t) if (file.includes(token)) score += 3;
  for (const token of a) if (file.includes(token)) score += 1;
  return score;
}

function mapCommonsImage(page: CommonsPage): CommonsImage | null {
  const info = page.imageinfo?.[0];
  if (!page.title || !info) return null;
  return {
    fileTitle: page.title,
    thumbnailUrl: info.thumburl ?? null,
    originalUrl: info.url ?? null,
    filePageUrl: info.descriptionurl ?? null,
    license: metadataValue(info, 'LicenseShortName'),
    licenseUrl: metadataValue(info, 'LicenseUrl'),
    artistHtml: metadataValue(info, 'Artist'),
    descriptionHtml: metadataValue(info, 'ImageDescription'),
  };
}

/** Creates a displayable, redirected Commons thumbnail URL for a filename (P18). */
export function commonsThumbnailUrl(filename: string, width = 600): string {
  const clean = filename.replace(/^File:/i, '').trim();
  if (!clean) throw new TypeError('Commons filename must not be empty');
  const w = bounded(width, 600, 100, 3000);
  return `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(clean)}?width=${w}`;
}

export class WikimediaArtService {
  readonly language: string;
  private readonly fetchImpl: typeof fetch;
  private readonly ttl: number;
  private readonly cache = new Map<string, { expires: number; promise: Promise<unknown> }>();

  constructor(options: WikimediaArtServiceOptions = {}) {
    const language = options.language ?? 'en';
    if (!/^[a-z][a-z0-9-]{0,14}$/i.test(language)) throw new TypeError('Invalid language code');
    this.language = language.toLowerCase();
    this.ttl = options.cacheTtlMs ?? 5 * 60 * 1000;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  /**
   * Fetch image pixels with browser CORS enforcement, using Wikimedia image hosts only.
   * This intentionally never calls external proxy providers. A normal <img> can display
   * an image without CORS, but readable Canvas pixels require explicit CORS permission.
   * A blocked response throws; callers must NOT substitute a fictional palette.
   */
  async fetchImagePixels(
    imageUrl: string,
    options: RequestOptions & { maxDimension?: number } = {},
  ): Promise<ImageData> {
    const loaded = await this.fetchArtworkImage(imageUrl, options);
    try {
      return loaded.imageData;
    } finally {
      loaded.dispose();
    }
  }

  /**
   * Try reading real pixels through a CORS-enabled <img> instead of fetch().
   * Image loads are checked by CSP img-src, not connect-src. This can work in
   * embeds which allow display but prohibit JavaScript fetch(). The image host
   * MUST still send CORS response headers or the promise rejects. Never treat
   * a regular, tainted <img> as readable or invent replacement colors.
   */
  async readImagePixelsViaImageTag(
    imageUrl: string,
    options: RequestOptions & { maxDimension?: number } = {},
  ): Promise<ImageData> {
    const url = new URL(imageUrl);
    const isLocalImage =
      /^data:image\/(?:jpeg|png|webp|gif);base64,[a-z0-9+/=]+$/i.test(imageUrl) ||
      (typeof location !== 'undefined' &&
        ['http:', 'https:'].includes(url.protocol) &&
        url.origin === location.origin);
    if (
      !isLocalImage &&
      (url.protocol !== 'https:' ||
        !['upload.wikimedia.org', 'commons.wikimedia.org', 'thumb.wikimedia.org'].includes(
          url.hostname,
        ))
    ) {
      throw new TypeError(
        'Image URL must be a Wikimedia image, a same-origin asset or an imported raster data URL',
      );
    }
    const size = bounded(options.maxDimension, 260, 48, 600);
    if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const image = new Image();
    if (!isLocalImage) image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      const finish = (error?: Error) => {
        image.onload = null;
        image.onerror = null;
        options.signal?.removeEventListener('abort', abort);
        if (error) reject(error);
        else resolve();
      };
      const abort = () => {
        image.src = '';
        finish(new DOMException('Aborted', 'AbortError'));
      };
      image.onload = () => finish();
      image.onerror = () => finish(new Error('CORS-enabled Wikimedia image could not be loaded'));
      options.signal?.addEventListener('abort', abort, { once: true });
      if (options.signal?.aborted) {
        abort();
        return;
      }
      image.src = imageUrl;
    });
    if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (!image.naturalWidth || !image.naturalHeight)
      throw new Error('Invalid Wikimedia image dimensions');
    const ratio = Math.min(1, size / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas 2D API unavailable');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return context.getImageData(0, 0, canvas.width, canvas.height);
  }

  /** Fetch once: return the true image pixels AND an object URL for all previews. */
  async fetchArtworkImage(
    imageUrl: string,
    options: RequestOptions & { maxDimension?: number } = {},
  ): Promise<LoadedWikimediaImage> {
    const url = new URL(imageUrl);
    if (
      url.protocol !== 'https:' ||
      !['upload.wikimedia.org', 'commons.wikimedia.org', 'thumb.wikimedia.org'].includes(
        url.hostname,
      )
    ) {
      throw new TypeError('Image URL must be served by Wikimedia Commons');
    }
    const size = bounded(options.maxDimension, 260, 48, 600);
    const response = await this.fetchImpl(url.toString(), {
      method: 'GET',
      mode: 'cors',
      signal: options.signal,
    });
    if (!response.ok)
      throw new WikimediaApiError(
        `Wikimedia image HTTP ${response.status}`,
        response.status,
        response.headers.get('Retry-After'),
      );
    const length = Number(response.headers.get('Content-Length') || 0);
    if (length > 16_000_000) throw new Error('Image exceeds the 16 MB limit');
    const blob = await response.blob();
    if (blob.size > 16_000_000) throw new Error('Image exceeds the 16 MB limit');
    if (blob.type && !blob.type.startsWith('image/')) throw new Error('Response is not an image');
    if (blob.type.includes('svg')) throw new Error('SVG pixel extraction is disabled');
    if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const displayUrl = URL.createObjectURL(blob);
    let bitmap: ImageBitmap | null = null;
    let temporaryUrl: string | null = null;
    try {
      let w: number, h: number, source: CanvasImageSource;
      if (typeof createImageBitmap === 'function') {
        bitmap = await createImageBitmap(blob);
        source = bitmap;
        w = bitmap.width;
        h = bitmap.height;
      } else {
        temporaryUrl = URL.createObjectURL(blob);
        const img = new Image();
        img.src = temporaryUrl;
        await img.decode();
        source = img;
        w = img.naturalWidth;
        h = img.naturalHeight;
      }
      if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      if (!w || !h) throw new Error('Invalid image dimensions');
      const ratio = Math.min(1, size / Math.max(w, h));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(w * ratio));
      canvas.height = Math.max(1, Math.round(h * ratio));
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Canvas 2D API unavailable');
      context.drawImage(source, 0, 0, canvas.width, canvas.height);
      return {
        imageData: context.getImageData(0, 0, canvas.width, canvas.height),
        displayUrl,
        dispose: () => URL.revokeObjectURL(displayUrl),
      };
    } catch (e) {
      URL.revokeObjectURL(displayUrl);
      throw e;
    } finally {
      bitmap?.close();
      if (temporaryUrl) URL.revokeObjectURL(temporaryUrl);
    }
  }

  /**
   * Resolve a painting to an actual Commons file via API metadata. A curated filename
   * is just a hint: stale/missing files fall back to a Wikidata P18 match, then Commons
   * full-text search. Does NOT construct unchecked Special:Redirect URLs.
   */
  async resolveArtworkImage(
    lookup: ArtworkImageLookup,
    options: RequestOptions & { thumbnailWidth?: number; excludeFileTitles?: string[] } = {},
  ): Promise<CommonsImage | null> {
    const title = safeQuery(lookup.title);
    const width = bounded(options.thumbnailWidth, 700, 100, 1600);
    const failures: string[] = [];
    let successfulLookups = 0;
    const attempt = async (
      promise: () => Promise<CommonsImage | null>,
    ): Promise<CommonsImage | null> => {
      try {
        const result = await promise();
        successfulLookups++;
        return result;
      } catch (e) {
        if (options.signal?.aborted) throw e;
        failures.push(e instanceof Error ? e.message : String(e));
        return null;
      }
    };
    const excluded = new Set((options.excludeFileTitles ?? []).map((v) => v.toLowerCase()));
    if (
      lookup.filename &&
      !excluded.has(('File:' + lookup.filename.replace(/^File:/i, '')).toLowerCase())
    ) {
      const match = await attempt(() =>
        this.getCommonsFile(lookup.filename!, { ...options, thumbnailWidth: width }),
      );
      if (match?.thumbnailUrl || match?.originalUrl) return match;
    }
    if (lookup.qid) {
      try {
        const entity = await this.getEntity(lookup.qid, options);
        if (
          entity?.imageFilename &&
          entity.imageFilename !== lookup.filename &&
          !excluded.has(('File:' + entity.imageFilename).toLowerCase())
        ) {
          const match = await attempt(() =>
            this.getCommonsFile(entity.imageFilename!, { ...options, thumbnailWidth: width }),
          );
          if (match?.thumbnailUrl || match?.originalUrl) return match;
        }
      } catch (e) {
        if (options.signal?.aborted) throw e;
        failures.push(e instanceof Error ? e.message : String(e));
      }
    }
    // Search targeted filename descriptions, not raw web image URLs or third-party proxies.
    // A work with a punctuation-heavy title may index better with its short title.
    const searches = [[title, lookup.artist].filter(Boolean).join(' '), title].filter(
      (q, i, arr) => arr.indexOf(q) === i,
    );
    for (const query of searches) {
      try {
        const results = await this.searchCommonsImages(query, {
          ...options,
          thumbnailWidth: width,
          limit: 12,
          appendPaintingKeyword: false,
        });
        successfulLookups++;
        const ranked = results
          .filter(
            (x) => (x.thumbnailUrl || x.originalUrl) && !excluded.has(x.fileTitle.toLowerCase()),
          )
          .map((image) => ({
            image,
            score: artworkMatchScore(image.fileTitle, title, lookup.artist ?? ''),
          }))
          .sort((a, b) => b.score - a.score);
        // Prevent unrelated Commons search images from being represented as the artwork.
        if (ranked.length && ranked[0].score >= 2) return ranked[0].image;
      } catch (e) {
        if (options.signal?.aborted) throw e;
        failures.push(e instanceof Error ? e.message : String(e));
      }
    }
    // Missing artwork is normal; but distinguish it from Wikimedia being inaccessible.
    if (failures.length && !successfulLookups) {
      throw new Error('Wikimedia image API is inaccessible: ' + failures[0]);
    }
    return null;
  }

  /** Drop successful-response cache immediately (e.g., after user refresh). */
  clearCache(): void {
    this.cache.clear();
  }

  private async request<T>(
    url: string,
    options: RequestOptions = {},
    accept = 'application/json',
  ): Promise<T> {
    const execute = async (): Promise<T> => {
      const res = await this.fetchImpl(url, {
        method: 'GET',
        headers: { Accept: accept },
        signal: options.signal,
      });
      if (!res.ok) {
        throw new WikimediaApiError(
          `Wikimedia HTTP ${res.status} (${new URL(url).hostname})`,
          res.status,
          res.headers.get('Retry-After'),
        );
      }
      const data = (await res.json()) as T & ApiErrorShape;
      if (data.error) {
        throw new WikimediaApiError(
          data.error.info ?? data.error.code ?? 'Wikimedia API error',
          res.status,
        );
      }
      return data;
    };
    // Never share a cached promise across callers with independent AbortSignals.
    if (options.signal || this.ttl <= 0) return execute();
    const key = accept + ':' + url;
    const existing = this.cache.get(key);
    if (existing && Date.now() < existing.expires) return existing.promise as Promise<T>;
    const promise = execute();
    const entry = { expires: Date.now() + this.ttl, promise: promise as Promise<unknown> };
    this.cache.set(key, entry);
    // Evict failed promises; a transient network failure should not be cached.
    void promise.catch(() => {
      if (this.cache.get(key) === entry) this.cache.delete(key);
    });
    return promise;
  }

  private actionUrl(base: string, params: Record<string, string>): string {
    return base + '?' + new URLSearchParams({ ...params, format: 'json', origin: '*' });
  }

  /** Search Wikidata labels/aliases. Does not guarantee results are artists/paintings. */
  async searchEntities(query: string, options: SearchOptions = {}): Promise<WikidataSearchHit[]> {
    const url = this.actionUrl(WIKIDATA_API, {
      action: 'wbsearchentities',
      search: safeQuery(query),
      language: this.language,
      type: 'item',
      limit: String(bounded(options.limit, 15, 1, 50)),
    });
    const response = await this.request<SearchResponse>(url, options);
    return (response.search ?? [])
      .filter((hit) => hit.id && QID_RE.test(hit.id))
      .map((hit) => ({
        id: hit.id!,
        label: hit.label ?? hit.id!,
        description: hit.description ?? null,
        kindHint: kindHint(hit.description),
        wikidataUrl: `https://www.wikidata.org/wiki/${hit.id}`,
      }));
  }

  /** Fetch structured metadata for a Wikidata item (painter or painting QID). */
  async getEntity(id: string, options: RequestOptions = {}): Promise<WikidataArtEntity | null> {
    assertQid(id);
    const site = `${this.language}wiki`;
    const url = this.actionUrl(WIKIDATA_API, {
      action: 'wbgetentities',
      ids: id,
      props: 'labels|descriptions|claims|sitelinks',
      languages: this.language,
      sitefilter: site,
    });
    const response = await this.request<EntitiesResponse>(url, options);
    const raw = response.entities?.[id];
    if (!raw || raw.missing !== undefined) return null;
    const classes = idsOfClaims(raw, 'P31');
    const occupations = idsOfClaims(raw, 'P106');
    const kind: ArtKind = classes.includes('Q3305213')
      ? 'painting'
      : classes.includes('Q5') &&
          (occupations.includes('Q49757') ||
            occupations.includes('Q483501') ||
            kindHint(raw.descriptions?.[this.language]?.value) === 'artist')
        ? 'artist'
        : 'other';
    const fileValue = valueOfClaim(raw, 'P18');
    const imageFilename = typeof fileValue === 'string' ? fileValue : null;
    const wikipediaTitle = raw.sitelinks?.[site]?.title ?? null;
    return {
      id,
      label: raw.labels?.[this.language]?.value ?? id,
      description: raw.descriptions?.[this.language]?.value ?? null,
      kind,
      wikidataUrl: `https://www.wikidata.org/wiki/${id}`,
      wikipediaTitle,
      wikipediaUrl: wikipediaTitle
        ? `https://${this.language}.wikipedia.org/wiki/${encodeURIComponent(wikipediaTitle.replace(/ /g, '_'))}`
        : null,
      imageFilename,
      imageUrl: imageFilename ? commonsThumbnailUrl(imageFilename) : null,
      creatorId: entityId(valueOfClaim(raw, 'P170')),
      movementId: entityId(valueOfClaim(raw, 'P135')),
      collectionId: entityId(valueOfClaim(raw, 'P195')),
      birthplaceId: entityId(valueOfClaim(raw, 'P19')),
      instanceOfIds: classes,
      occupationIds: occupations,
      createdYear: yearOf(valueOfClaim(raw, 'P571')),
      birthYear: yearOf(valueOfClaim(raw, 'P569')),
      deathYear: yearOf(valueOfClaim(raw, 'P570')),
    };
  }

  /** Resolve several related QIDs (creator/movement/collection) in a SINGLE API call. */
  async getLabels(ids: string[], options: RequestOptions = {}): Promise<Record<string, string>> {
    const unique = [...new Set(ids)];
    unique.forEach(assertQid);
    if (!unique.length) return {};
    if (unique.length > 50) throw new RangeError('getLabels supports up to 50 QIDs per request');
    const url = this.actionUrl(WIKIDATA_API, {
      action: 'wbgetentities',
      ids: unique.join('|'),
      props: 'labels',
      languages: this.language,
    });
    const response = await this.request<EntitiesResponse>(url, options);
    const result: Record<string, string> = {};
    for (const [id, item] of Object.entries(response.entities ?? {})) {
      if (item.missing === undefined) result[id] = item.labels?.[this.language]?.value ?? id;
    }
    return result;
  }

  /** Search Commons file namespace. Commons results are not guaranteed to be paintings. */
  async searchCommonsImages(
    query: string,
    options: CommonsSearchOptions = {},
  ): Promise<CommonsImage[]> {
    return (await this.searchCommonsImagesPage(query, options)).images;
  }

  /** One page of Commons results; pass continuation unchanged to fetch the next page. */
  async searchCommonsImagesPage(
    query: string,
    options: CommonsSearchOptions = {},
  ): Promise<CommonsSearchPage> {
    const q = safeQuery(query);
    const term = options.appendPaintingKeyword === false ? q : `${q} painting`;
    const url = this.actionUrl(COMMONS_API, {
      ...Object.fromEntries(
        Object.entries(options.continuation ?? {}).map(([key, value]) => [key, String(value)]),
      ),
      action: 'query',
      generator: 'search',
      gsrsearch: term,
      gsrnamespace: '6',
      gsrlimit: String(bounded(options.limit, 9, 1, 25)),
      prop: 'imageinfo',
      iiprop: 'url|extmetadata',
      iiurlwidth: String(bounded(options.thumbnailWidth, 320, 100, 1600)),
      iiextmetadatafilter: 'LicenseShortName|LicenseUrl|Artist|ImageDescription',
    });
    const response = await this.request<CommonsResponse>(url, options);
    const images = Object.values(response.query?.pages ?? {})
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      .map(mapCommonsImage)
      .filter((item): item is CommonsImage => item !== null);
    return { images, continuation: response.continue ?? null };
  }

  /** Fetch a Commons file's thumbnail, original URL and license metadata. */
  async getCommonsFile(
    fileTitle: string,
    options: RequestOptions & { thumbnailWidth?: number } = {},
  ): Promise<CommonsImage | null> {
    const title = fileTitle.startsWith('File:') ? fileTitle : `File:${fileTitle}`;
    const url = this.actionUrl(COMMONS_API, {
      action: 'query',
      prop: 'imageinfo',
      titles: title,
      redirects: '1',
      iiprop: 'url|extmetadata',
      iiurlwidth: String(bounded(options.thumbnailWidth, 600, 100, 1600)),
      iiextmetadatafilter: 'LicenseShortName|LicenseUrl|Artist|ImageDescription',
    });
    const response = await this.request<CommonsResponse>(url, options);
    return (
      Object.values(response.query?.pages ?? {})
        .map(mapCommonsImage)
        .find(Boolean) ?? null
    );
  }

  /**
   * Fetch a small list of paintings created by the specified artist QID.
   * Queries the public Wikidata SPARQL endpoint; never use this for bulk crawls.
   * Works without P18 are included by default to improve coverage.
   */
  async getArtistPaintings(
    artistId: string,
    options: ArtistPaintingsOptions = {},
  ): Promise<ArtistPainting[]> {
    assertQid(artistId);
    const limit = bounded(options.limit, 24, 1, 50);
    const imageClause = options.onlyWithImage
      ? '?painting wdt:P18 ?image.'
      : 'OPTIONAL { ?painting wdt:P18 ?image. }';
    const query = `SELECT DISTINCT ?painting ?paintingLabel ?image ?date WHERE {
      ?painting wdt:P170 wd:${artistId}; wdt:P31 wd:Q3305213.
      ${imageClause}
      OPTIONAL { ?painting wdt:P571 ?date. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "${this.language}". }
    } LIMIT ${limit}`;
    const url = SPARQL_API + '?' + new URLSearchParams({ query, format: 'json' });
    const data = await this.request<SparqlResponse>(
      url,
      options,
      'application/sparql-results+json',
    );
    return (data.results?.bindings ?? []).flatMap((row) => {
      const id = row.painting?.value?.split('/').pop();
      if (!id || !QID_RE.test(id)) return [];
      const imageFilename = rawImageToFilename(row.image?.value);
      return [
        {
          id,
          title: row.paintingLabel?.value ?? id,
          year: sparqlYear(row.date?.value),
          imageFilename,
          imageUrl: imageFilename ? commonsThumbnailUrl(imageFilename) : null,
          wikidataUrl: `https://www.wikidata.org/wiki/${id}`,
        },
      ];
    });
  }

  /** Optional encyclopedia summary. Can be blocked by a host application's CSP. */
  async getWikipediaSummary(
    pageTitle: string,
    options: RequestOptions = {},
  ): Promise<WikipediaSummary | null> {
    const title = safeQuery(pageTitle).replace(/ /g, '_');
    const url = `https://${this.language}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    try {
      const response = await this.request<WikipediaSummaryResponse>(url, options);
      return {
        title: response.title ?? pageTitle,
        description: response.description ?? null,
        extract: response.extract ?? null,
        thumbnailUrl: response.thumbnail?.source ?? null,
        originalImageUrl: response.originalimage?.source ?? null,
        wikidataId: response.wikibase_item ?? null,
        pageUrl: response.content_urls?.desktop?.page ?? null,
      };
    } catch (error) {
      if (error instanceof WikimediaApiError && error.status === 404) return null;
      throw error;
    }
  }

  /** Search Wikidata and Commons in parallel. Returns partial results if either fails. */
  async searchAll(query: string, options: RequestOptions = {}): Promise<AllSearchResults> {
    const q = safeQuery(query);
    const [entities, images] = await Promise.allSettled([
      this.searchEntities(q, options),
      this.searchCommonsImages(q, options),
    ]);
    if (options.signal?.aborted)
      throw options.signal.reason ?? new DOMException('Aborted', 'AbortError');
    return {
      entities: entities.status === 'fulfilled' ? entities.value : [],
      images: images.status === 'fulfilled' ? images.value : [],
      errors: [
        ...(entities.status === 'rejected'
          ? [{ source: 'wikidata' as const, message: String(entities.reason) }]
          : []),
        ...(images.status === 'rejected'
          ? [{ source: 'commons' as const, message: String(images.reason) }]
          : []),
      ],
    };
  }
}
