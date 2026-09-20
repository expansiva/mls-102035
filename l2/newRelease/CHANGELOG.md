# newRelease

## 2026-09-20 — ui_02 compact tabs and review menu

- Tabs stack icon over the name in eight equal columns; long pt-BR labels wrap to two lines. No horizontal tab scroll.
- Below 420px of the index panel, only the active tab keeps its name (Nav 3 fallback); inactive tabs stay icon-only with `aria-label`/`title`.
- Review opens on the first `authorities` actor. Everyone remains a comparison option. Removals stay in a collapsed section there, never on an actor filter.
- Review draws a compact vertical menu: indent, hub/group chevrons, children collapsed except the selected trail. Status is the writing (bold / muted / struck); badges left the nav.
- Detail content stays at the top of its pane.

## 2026-09-20 — ui_03 current i18n catalogs in Studio

- `loadNewReleaseMessages` tries `mls.stor.files` for each candidate before the static URL of the same file.
- Studio `getValueInfo().content = null` falls through to `getContent()`, matching the live 102035 catalog.
- A stale language/project load no longer overwrites a newer one.
- Static release HTTP remains the old catalog until the runtime publish task.

## 2026-09-20 — ui_01 Review tab

- Eighth tab **Review** reads `l4/<module>/pool/l2/web/menu.json` of the selected project (schema `2026-09-20-p2-menu-v2.2`).
- Actor selector uses `authorities` order; a hub reveals descendants; an explicit node without a visible ancestor becomes a root.
- `new`/`change` are bold with distinct labels, `keep` is muted, `remove` is struck through. The state is also in text. `meta.removed` is a separate tree, only in Everyone, and is not a navigation link.
- Pending `tobe/plan` (`manifest.changes.length > 0`) hides the menu and shows a disabled **Calculate changes**. A valid menu shows a disabled **Continue**. Neither button dispatches an agent.
- Collapsed Pool section lists the three boxes via `listPoolBoxForProject` (file, from, round/3, mode, subject).
- Apply / Execute and the seven existing tabs are unchanged.
