# Project Guidelines

## Build and Validate
- Use pnpm for all package and script operations.
- Install dependencies: `pnpm install`
- Start dev server: `pnpm dev`
- Production build: `pnpm build`
- Lint (must be clean): `pnpm lint`
- There is no automated test suite in this workspace. For behavior changes, include manual verification notes.

## Architecture
- `src/App.tsx` is the orchestration layer:
  - Initializes tokenizer at startup.
  - Owns top-level `lyricElems` state.
  - Wires `MusicPlayer` ticks to `LyricPanel` through refs.
- `src/lrcm/lrc.ts` contains core lyrics parsing and furigana/token logic.
- `src/lrcm/types.ts` defines core domain models (`LyricElement`, timed objects, selection helpers).
- `src/lrcm/LyricPanel.tsx` and `src/lrcm/SingleWord.tsx` implement lyric editing/timing UI behavior.
- `src/music_player/MusicPlayer.tsx` handles playback and exposes imperative controls/events.
- `src/FileSelector.tsx` is the file ingest boundary for audio/lyrics.

## Conventions
- Preserve TypeScript strictness and existing compiler guarantees.
- Match lint/format rules from `.eslintrc` and `.prettierrc`:
  - 2-space indentation
  - single quotes
  - semicolons
  - max line length 120
- Keep component-local styles in adjacent CSS files (existing `Component.tsx` + `Component.css` pattern).
- Prefer typed props/refs and existing `forwardRef` + `useImperativeHandle` patterns where components coordinate behavior.
- Keep `LyricElement` semantics stable (`hasTimeTag`, `hasStopper`, `furi`, `obj`) unless a task explicitly requires schema changes.

## Domain Pitfalls
- `parseRawLyrics` depends on tokenizer availability in `src/lrcm/lrc.ts`.
  - Ensure `initLrc()` has completed before parser flows that require tokenizer access.
- Kuromoji dictionary files are fetched from a remote URL during initialization. Avoid changes that silently break this initialization path.
- `src/kuromoji/*.js` is treated as vendor-style code and excluded from lint. Avoid broad refactors there unless the task is explicitly about kuromoji integration.
- Parser behavior around small kana, sokuon, and mixed English/Japanese tokens is intentional; preserve behavior unless explicitly asked to change parsing rules.

## Change Checklist
- Run `pnpm lint` after code changes.
- Run `pnpm build` for type/build verification when changes affect runtime behavior.
- For parser or timing changes, manually verify with a lyric file containing:
  - mixed kanji + furigana
  - small kana and sokuon
  - mixed English and Japanese text
