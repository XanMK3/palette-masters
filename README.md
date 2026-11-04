# Palette Masters

Turn artwork into UI color themes. Browse curated paintings or search Wikimedia,
extract a palette, adjust color roles, and preview the result in three templates.
Export the theme as CSS variables or a Tailwind v4 stylesheet.

Built with Preact, TypeScript, Vite, and Tailwind CSS.

## Local development

Use Node.js 22.12+ and npm.

```bash
npm ci
npm run dev
```

Open http://127.0.0.1:8080/. Wikimedia search and remote artwork require internet
access; no API key is needed.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run build` | Type-check and build into `dist/` |
| `npm run preview` | Serve the production build on port 8080 |
| `npm test` | Run unit tests |
| `npm run test:browser` | Run Playwright tests (requires Google Chrome) |
| `npm run typecheck` | Check TypeScript types |
| `npm run format` | Format source and configuration |
| `npm run format:check` | Check formatting |

Stop the dev server before running `npm run preview`, since both use port 8080.

## GitHub Pages

Set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**.
The [deployment workflow](.github/workflows/deploy-pages.yml) builds and publishes
`dist/` on every push to `master`, including merged pull requests. It also supports
manual runs on `master` from the Actions tab.

Vite's `base: './'` supports the repository subpath without additional configuration.
The published URL appears in the workflow's `github-pages` environment.

## Further reading

- [Color extraction methods](docs/COLOR_EXTRACTION.md)
- [Module architecture](docs/MODULE_ARCHITECTURE.md)
- [Troubleshooting artwork loading and local setup](docs/TROUBLESHOOTING.md)
