# controleEstoque — pacote congelado do ensaio

Cópia byte a byte de `/tmp/ui_mr21_source/` (`l4/`, `answers/`, `request.txt`). `capture.json` não entra neste pacote. Conferido com `cmp` contra essa captura e com os SHA256 dela. Não há comparação dos bytes com o Git.

Commit de procedência do L4 (HEAD observado do 102047, metadado, 07/10): `3851e9a93f1cc6a575e231cd4f8803590c30338f`.

| arquivo | commit | task |
|---|---|---|
| `l4/**` (13 defs + `pipeline/pipeline.json`) | `3851e9a93f1cc6a575e231cd4f8803590c30338f` | — (lido na lib via `mls.stor.files` / `readSourceText` antes do run; `rules.defs.ts` SHA256 `1b7872806ecc60b0b44e4a348bda6f0b300720354f64b30b35d0be28033f7a87`) |
| `request.txt` | `3851e9a93f1cc6a575e231cd4f8803590c30338f` | `20261007065138.1001` (pedido da `ui_mr_06`: `quantidadeMinimaValida` passa a exigir maior que zero) |
| `answers/review20.json` | gerado após `3851e9a93f1cc6a575e231cd4f8803590c30338f`, usando o L4 dessa captura | `20261007202140.1001` (payload bruto aceito; a task `20261007065138.1001`, tentativa 3, ficou com `interaction.payload=null`) |
| `answers/menu20/menu-1.json` | não existia em `3851e9a93f1cc6a575e231cd4f8803590c30338f` | `20261007201518.1001` (`mls.stor.files` / `getContent`, verdict accepted) |

Gravação isolada sem ferramentas `20261007201905.1001` foi rejeitada e não integra estas fixtures.
