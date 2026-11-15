# TypeScript

- Use `unknown` at untrusted boundaries; narrow or validate values before use. A type assertion does not perform runtime validation.
- Model mutually exclusive states with discriminated unions, not objects with many optional fields; use exhaustive checks when a new variant must be handled.
- Prefer inferred types for local expressions and explicit types at public boundaries when they clarify the contract.
- Use `satisfies` to check config/lookup objects without discarding useful literal inference; avoid `as` casts that merely silence errors.
- Prefer straightforward unions and interfaces over complex conditional/mapped types when simpler types communicate the same contract.
- Handle returned promises explicitly (await, return, or catch); `void` suppresses lint noise, not runtime rejection handling.
- Avoid non-null assertions (`!`) unless an invariant is established and the assertion is justified locally.
