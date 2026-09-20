# newRelease

## 2026-09-20 — ui_01 Review tab

- Eighth tab **Review** reads `l4/<module>/pool/l2/web/menu.json` of the selected project (schema `2026-09-20-p2-menu-v2.2`).
- Actor selector uses `authorities` order; a hub reveals descendants; an explicit node without a visible ancestor becomes a root.
- `new`/`change` are bold with distinct labels, `keep` is muted, `remove` is struck through. The state is also in text. `meta.removed` is a separate tree, only in Everyone, and is not a navigation link.
- Pending `tobe/plan` (`manifest.changes.length > 0`) hides the menu and shows a disabled **Calculate changes**. A valid menu shows a disabled **Continue**. Neither button dispatches an agent.
- Collapsed Pool section lists the three boxes via `listPoolBoxForProject` (file, from, round/3, mode, subject).
- Apply / Execute and the seven existing tabs are unchanged.
