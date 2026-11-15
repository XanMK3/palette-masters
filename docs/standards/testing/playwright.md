# Playwright Test

- Locate elements through user-facing roles, names, and labels; use stable test IDs for intentional nonsemantic contracts. Avoid brittle CSS/XPath or positional selectors.
- Use awaited locator actions and auto-retrying `expect` assertions; don't replace readiness checks with `waitForTimeout` or forced clicks.
- Give tests isolated accounts/data/browser state. Share worker-scoped fixtures only for resources safe to share across tests.
- When explicitly waiting for a response or event, register the wait **before** triggering the action that produces it.
- Keep E2E coverage focused on critical cross-system journeys rather than reproducing every small unit-test variation.
- Prefer reusable fixtures for setup/teardown; keep credentials and persisted auth state out of committed test artifacts.
- Diagnose flaky failures with traces and observable readiness conditions, not by increasing global timeouts indiscriminately.
