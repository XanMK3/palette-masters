# Tailwind CSS

- Keep utility class names complete and statically discoverable. Map variants to literal class strings instead of constructing fragments such as `bg-${color}-500`.
- Reuse the project's design tokens before adding arbitrary values; recurring design decisions belong in the theme (CSS `@theme` in v4, project config in v3).
- Prefer built-in state variants (`focus-visible:`, `aria-*`, `data-*`, `motion-reduce:`) to extra JavaScript state used only for styling.
- Keep conditional class combinations explicit and small; use the project's existing class composition/merge helpers when conflicting utilities need resolution.
- Use ordinary CSS for complex selectors, third-party markup, or genuinely repeated rules instead of stacking opaque arbitrary variants or blanket `@apply`.
- Preserve the project's installed Tailwind version and configuration style; don't introduce v4-only syntax into a v3 project.
