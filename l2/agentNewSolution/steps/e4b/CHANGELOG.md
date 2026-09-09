# E4B changelog

## 2026-09-08 — first implementation

Access realization step between E4 and E5. Permanent artifact
`access/access-bindings.defs.ts` (`ns4-access-bindings-v1`): per-grant person-scope anchors
and synthesized authorities `synth:<entity>:<profile>`. Gate validates each hop; a missing
field returns ownership to E4.
