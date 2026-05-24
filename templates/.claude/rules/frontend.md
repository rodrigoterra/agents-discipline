---
paths:
  - "apps/web/**"
  - "packages/ui/**"
  - "**/*.tsx"
  - "**/*.css"
---

# Frontend & UI rules

> Loaded when you touch UI code. Keep backend concerns out of here.
> Customize the `paths:` globs above to match this repo's layout.

## Components
- Components are pure functions of props + state. Side effects go in effects or
  event handlers, never in render.
- Shared, reusable components live in `<packages/ui>`. App-specific ones stay in
  the app. Don't promote to `ui` until used in two places.
- No business logic in components. Fetch and transform in hooks/loaders; render
  the result.

## State & data
- Server state (`<react-query | swr | …>`) is separate from UI state (`useState`).
  Don't cache server data in component state by hand.
- Derive, don't duplicate. If a value can be computed from props/state, compute it.
- Co-locate state with the component that owns it. Lift only when shared.

## Styling & accessibility
- Use the design tokens / theme — no hardcoded hex colors or magic pixel values.
- Every interactive element is keyboard-reachable and has an accessible name.
- Images need `alt`; form inputs need associated `<label>`s.

## Tests
- Test behavior the user sees (roles, text, interactions) via
  `<@testing-library/react>`. Don't assert on implementation details or class names.
- A component with conditional rendering ships with a test per branch.
