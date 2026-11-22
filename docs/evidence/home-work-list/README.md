# Home work list: rendered evidence

Web captures of the real app (`pnpm export:web` build, `tools/visual/capture.ts`, headless Chrome, iphone-15 profile 390x844, mock relay scenarios pinned with `--scenario`; route `/`).

- `many-light100-light135-light200-dark100.png`: scenario `many` (one waiting, two running, recent): light at 100 %, 135 %, 200 % text, then dark at 100 %. Needs you, Running and Recent sections, the "All conversations" footer, the hero centred in the space the list leaves, the composer unmoved.
- `idle-empty-loading-refused-light100.png`: scenario `idle` (recent only), `empty` (brand-new: two Try rows), `loading` (no frame yet: no list, no skeleton), `billing-inactive` (refusal panel: no list behind it).

Not captured here: a native simulator frame (see the PR description).
