# AGENTS.md

## Purpose

This document guides coding agents working in this repository.
Follow these instructions to make consistent, low-risk changes.

---

## Project Snapshot

- Stack: Vite + React + TypeScript + Tailwind + shadcn/ui + Zustand.
- Package manager baseline: npm (README and lockfile use npm).
- Test runner: Vitest with jsdom.
- UI primitives: Radix + shadcn-style components in `src/components/ui`.
- State management: Zustand store in `src/store/sliderStore.ts`.
- Alias: `@` -> `src` (configured in TS and Vite).

---

## Repository Paths to Know

- App entry: `src/main.tsx`
- Root app/router: `src/App.tsx`
- Main page: `src/pages/Index.tsx`
- Store/BLE logic: `src/store/sliderStore.ts`
- BLE protocol reference: `BLE_CONTROL_API.md`
- Test setup: `src/test/setup.ts`
- Example test: `src/test/example.test.ts`
- ESLint config: `eslint.config.js`
- Vitest config: `vitest.config.ts`
- Tailwind config: `tailwind.config.ts`

---

## Install and Run

- Install dependencies:
  - `npm install`
- Start dev server:
  - `npm run dev`
- Preview production build:
  - `npm run preview`

---

## Build / Lint / Test Commands

- Production build:
  - `npm run build`
- Development-mode build:
  - `npm run build:dev`
- Lint:
  - `npm run lint`
- Run all tests once:
  - `npm run test`
- Run tests in watch mode:
  - `npm run test:watch`

---

## Running a Single Test (Important)

Use one of these patterns:

- By file:
  - `npm run test -- src/test/example.test.ts`
- By test name:
  - `npm run test -- -t "should pass"`
- By file + name:
  - `npm run test -- src/test/example.test.ts -t "should pass"`
- Watch a single file:
  - `npm run test:watch -- src/test/example.test.ts`

Notes:

- Vitest include pattern is `src/**/*.{test,spec}.{ts,tsx}`.
- jsdom + global test APIs are enabled in `vitest.config.ts`.
- Shared setup is loaded from `src/test/setup.ts`.

---

## Code Style: Imports

- Prefer absolute alias imports from `@/...` for app code.
- Keep relative imports only for nearby files when clearer.
- Group imports in this order:
  1. External packages
  2. Internal alias imports (`@/...`)
  3. Relative imports (`./...`)
- Keep type imports explicit where useful:
  - `import type { Foo } from "...";`
- Existing files show mixed quote style; preserve local file style unless touching many lines.
- Do not introduce unused imports (lint catches many baseline issues).

---

## Code Style: Formatting and Structure

- Follow existing formatting in edited file; avoid large reformat-only diffs.
- Use semicolons consistently in files that already use them.
- Prefer concise functional React components.
- Keep JSX readable:
  - one prop per line when lines get long,
  - keep className strings organized by layout -> spacing -> color/typography.
- Reuse `cn()` from `src/lib/utils.ts` for class merging.
- Avoid adding comments unless logic is non-obvious.

---

## TypeScript Guidelines

- TS strictness is intentionally relaxed in this repo (`strict: false`, `noImplicitAny: false`).
- Even so, prefer explicit, safe types in new/changed code.
- Use interfaces for component props and complex object shapes.
- Use literal unions for constrained values (e.g., mode strings).
- Avoid adding new `any`; if unavoidable, keep scope narrow and document why in PR notes.
- Narrow unknown/error values with guards:
  - `error instanceof Error ? error.message : "Fallback message"`

---

## Naming Conventions

- Components: PascalCase (`VelocityMode`, `SettingsDialog`).
- Hooks: `useXxx` (`useToast`, `useIsMobile`).
- Store selectors/actions: camelCase (`setActiveMode`, `manualConnect`).
- Constants: UPPER_SNAKE_CASE (`MAX_ENCODER_VELOCITY`).
- Files:
  - Component files usually PascalCase outside `ui`.
  - shadcn/ui files often kebab-case in `src/components/ui`.

---

## React and State Patterns

- Use function components and hooks.
- For Zustand, prefer selector-based subscriptions:
  - `useSliderStore((s) => s.someField)`
- Keep BLE/device side effects in store/domain logic, not UI components.
- UI event handlers should call store actions and remain lightweight.
- Keep persisted-store shape stable; changing persisted keys can break old local state.

---

## Error Handling and Reliability

- Wrap async BLE operations in `try/catch`.
- Convert unknown errors to user-facing strings safely.
- Store user-visible errors in Zustand (`error` field) when appropriate.
- For JSON decoding from BLE notifications:
  - parse in `try/catch`,
  - ignore malformed payloads safely,
  - avoid hard crashes from bad device data.
- Prefer returning booleans from command-style async actions where existing patterns do so.

---

## BLE API Contract (Critical)

- Treat `BLE_CONTROL_API.md` as the source of truth for BLE command/response payloads.
- Do not invent, rename, or remove command keys without updating frontend usage and `BLE_CONTROL_API.md` in the same change.
- Ensure command JSON uses documented shapes (`cmd`, command-specific fields, optional `requestId`).
- Prefer sending `requestId` for correlation and handling ACK/NAK on response notifications.
- Treat commands as successful only when response has `ok: true`; handle error `reason` values explicitly.
- On reconnect or `sessionId` change, clear transient command state and resync from latest status payload.
- Keep UUID usage aligned with the BLE reference (service + command/status/response characteristics).

---

## Testing Guidelines

- Put tests next to source under `src/**` with `.test.ts` or `.spec.tsx`.
- Use Vitest + Testing Library conventions.
- `@testing-library/jest-dom` is preloaded in setup.
- For UI tests, prefer behavior-focused assertions over implementation details.
- Add tests for store logic when changing command encoding/parsing behavior.

---

## Linting Notes

- ESLint uses `@eslint/js` + `typescript-eslint` + React hooks + React refresh rules.
- Current config disables `@typescript-eslint/no-unused-vars`.
- Still remove dead code when practical; keep touched files clean.
- Ignore `dist/` output.

---

## Tailwind / UI Guidelines

- Use design tokens and semantic colors already defined in `tailwind.config.ts`.
- Prefer existing ui primitives from `src/components/ui` before creating new base components.
- Keep visual behavior consistent with current shadcn patterns.
- Do not add a new styling system.

---

## Agent Change Scope Rules

- Make minimal, targeted edits.
- Do not refactor unrelated files in the same change.
- Preserve public APIs unless task explicitly requires changes.
- If changing command payload shapes, update all callers in same patch.

---

## Cursor / Copilot Rule Files

- `.cursorrules`: not found.
- `.cursor/rules/`: not found.
- `.github/copilot-instructions.md`: not found.

If these files are added later, treat them as higher-priority repository instructions and update this document.

---

## Practical Workflow for Agents

1. Read relevant files before editing.
2. Implement minimal change.
3. Run:
   - `npm run lint`
   - `npm run test` (or targeted single-test command first)
4. If command behavior changed, run a production build:
   - `npm run build`
5. Summarize:
   - what changed,
   - why,
   - how it was validated.

---

## Known Context

- This repository includes generated/templated shadcn-style UI files.
- Preserve existing patterns in those files unless task requires deliberate divergence.
- Some code is in-progress (commented blocks in store/components); do not assume all commented paths are active requirements.
