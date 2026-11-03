# Troubleshooting Palette masters on a laptop

## First-run checks

1. Verify Node: `node --version` (20.19+ or 22.12+).
2. In this folder: `npm install && npm run build && npm run dev`.
3. Open `http://127.0.0.1:8080/` in Chrome, Firefox, or Edge.
4. Switch between movement tabs. The 25 curated *labels* should appear without any network request.
5. Run `npm run test:browser` to check image-reading and palette logic with mocked artwork responses, independently of Wikimedia availability.
6. Only then test remote Wikimedia painting images and search.

## How to identify an image failure

Open DevTools → **Network** and **Console** (typically F12).

| Symptom | Likely cause | What to do |
|---|---|---|
| `Refused to connect ... Content Security Policy` | Host's `connect-src` blocks API fetch | Use localhost instead of the ChatGPT embedded preview. A client script cannot override host CSP. |
| `Refused to load image ... Content Security Policy` | Host's `img-src` blocks Wikimedia CDN | Use localhost; if still blocked, inspect your site's own CSP. Use cached/local assets. |
| Image request `404` | Incorrect or renamed Commons file/thumbnail path | Open file page, verify filename; run `npm run cache:art`; update `src/featured-images.ts`. |
| Image request `403` or `429` | Remote host/rate-limit/security restriction | Reduce request volume, respect `Retry-After`, inspect Wikimedia policies. |
| `Failed to fetch`, DNS, TLS | Network / browser extension / proxy / host issue | Test Commons file page in browser; try another network; disable aggressive blockers just for diagnosis. |
| `<img>` displays but palette fails | Cross-origin pixels not CORS-clean | Use locally imported/cached image, or request image bytes from a server you control with appropriate rights/CORS. |
| No image and no useful error | May be a script/rendering bug | Inspect DevTools Console first; report failing URL, HTTP status and stack trace. |
| Search empty but curated works visible | Wikidata/Commons API unavailable or results incomplete | Check `www.wikidata.org`, `commons.wikimedia.org`, `query.wikidata.org` under Network → Fetch/XHR. |
| Mocked artwork tests pass but remote art fails | Artwork URLs/CORS/network, **not** palette quantization | Run `npm run cache:art` on a network-enabled laptop and inspect the report. |
| `npm run cache:art` fails before creating report | No successful Commons image download | Read CLI errors; wrong filenames and access issues are both possible. It deliberately doesn't write a false success report. |

## Offline image cache procedure

With internet access on your own laptop:

```bash
npm run cache:art
```

This script:

1. Reads 20 pinned Commons filenames from `src/featured-images.ts`.
2. Asks the Commons Action API for a real thumbnail URL per file.
3. Downloads supported images up to 2 MB each.
4. Writes genuine `data:image/...;base64,...` bytes to `src/embedded-art.ts`.
5. Rebuilds the Vite production output in `dist/` and writes `assets-report.json` if at least one succeeds.

Then run `npm run dev` and open `http://127.0.0.1:8080/`. Inspect `assets-report.json` for cached IDs and failed files. **The base ZIP does not contain cached paintings.** Don't assume the cache script guarantees success if Wikimedia is unavailable. Don't redistribute an image just because downloading succeeded; review its license/rights.

## CSP and CORS are different

- `connect-src`: permission to make JavaScript API requests (`fetch`).
- `img-src`: permission to load and render images.
- CORS: cross-origin response policy, needed to read pixel data on Canvas from remote image sources.

A URL working as `<img src>` does not guarantee readable Canvas pixels, and an API URL accepting anonymous CORS requests does not override ChatGPT's restrictive embed CSP.

A local development server removes the *embed host's* CSP, not every possible remote-host restriction.

## Useful developer checks

```bash
npm run typecheck
npm test
npm run build
```

`npm test` runs mocked selection workflow regression tests; it does not verify live Wikimedia availability. If you add an integration test for artwork availability, make it opt-in, rate-limit respectful, and report source URLs and license/attribution separately.

## Deployment policy notes

A self-hosted deployment typically needs an image policy permitting your local/cache assets and approved Wikimedia hosts. If directly fetching Wikimedia APIs, a possible **partial** CSP is:

```text
worker-src 'self';
connect-src 'self' https://www.wikidata.org https://commons.wikimedia.org
  https://query.wikidata.org https://en.wikipedia.org
  https://upload.wikimedia.org https://thumb.wikimedia.org;
img-src 'self' data: blob: https://upload.wikimedia.org
  https://thumb.wikimedia.org https://commons.wikimedia.org;
```

Palette extraction and theme mapping use a same-origin bundled Web Worker. Serve the worker asset with the rest of the Vite build and allow it through `worker-src`. If worker startup is blocked, the app retains the previous palette and shows an error; it does not fall back to blocking the main thread.

This is not a complete hardened production CSP. The HTML includes inline CSS; for a strict production CSP, separate assets or use hashes/nonces.

### Local port already in use

If the default port `8080` is occupied, pass a different port (works on macOS, Linux, and Windows):

```bash
npm run dev -- --port 8081
```

For the production preview, use `npm run preview -- --port 8081`.
Then open `http://127.0.0.1:8081/`.
