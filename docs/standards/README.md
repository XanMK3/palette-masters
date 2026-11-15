<!-- agenieer:routing:start -->
# Engineering Standards — Index

> This index is managed by [Agenieer](https://github.com/XanMK3/agenieer).
> Unrelated content below this managed section is preserved.

## Active Standards

| Standard | When to Read |
|----------|-------------|
| [JavaScript](javascript.md) | JavaScript source files and application code |
| [TypeScript](typescript.md) | TypeScript source files and application code |
| [React](react.md) | React components, hooks, and JSX/TSX files |
| [CSS](css.md) | CSS and styling files |
| [Tailwind CSS](tailwind.md) | Tailwind CSS utility usage in source files and stylesheets |
| [Testing (Shared)](testing.md) | All test files, test helpers, and testing infrastructure |
| [Playwright Test](testing/playwright.md) | Playwright Test end-to-end test suites |

## Applicable File Patterns

- **[JavaScript](javascript.md)**: `**/*.js`, `**/*.jsx`, `**/*.mjs`, `**/*.cjs`
- **[TypeScript](typescript.md)**: `**/*.ts`, `**/*.tsx`
- **[React](react.md)**: `**/*.tsx`, `**/*.jsx`, `src/components/**/*`, `src/hooks/**/*`, `src/pages/**/*`
- **[CSS](css.md)**: `**/*.css`, `**/*.scss`, `**/*.sass`
- **[Tailwind CSS](tailwind.md)**: `**/*.css`, `**/*.tsx`, `**/*.jsx`, `**/*.html`
- **[Testing (Shared)](testing.md)**: `**/*.test.ts`, `**/*.test.tsx`, `**/*.test.js`, `**/*.test.jsx`, `**/*.spec.ts`, `**/*.spec.tsx`, `**/*.spec.js`, `**/*.spec.jsx`, `**/__tests__/**/*`, `**/tests/**/*`
- **[Playwright Test](testing/playwright.md)**: `**/*.spec.ts`, `**/*.spec.js`, `**/tests/e2e/**/*`, `**/e2e/**/*`

## Composition Examples

- `tests/e2e/login.spec.ts` (Playwright): read **TypeScript** + **Testing** + **Playwright Test**

## Conflict Resolution

Project-specific documented decisions supersede generic preferences in these standards,
but correctness, security, and accessibility requirements are not silently overridden.

<!-- agenieer:routing:end -->
