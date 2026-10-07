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

`answers/plan20/plan-1.json`: cópia byte a byte de `/tmp/ui_mr21_source/answers/plan20/plan-1.json`, task isolada `20261007220558.1001` (done). Resposta bruta `submitP1BackendResolution`, aliases/merges vazios; schema da ferramenta aceito, gate de domínio ainda não alcançado pelo replay. Prompt original obtido pelo hook público L1 e `mls.stor.files` da bancada do run `20261007201518.1001`; nenhum arquivo aplicado pela resposta. SHA256 `9f6b7f0ba3ee850ee9d37f4e17909df993e16b4b8d64f3aba32c4a6e7cfd3c68` (294 bytes).


`ledger/evidence.json`: exportado pela execução real dos hooks de revisão e planners L4/L2/L1 do ensaio, worker Studio, hub em memória e `ReviewRunService` da plataforma. Inclui binding, progressos review/planner, fontes dos artefatos com os bytes originais e o registro `ready` aceito pelo ledger. Identidades, hashes e resultados são os produzidos nessa execução; não foram corrigidos na fixture. Usa exclusivamente este L4 congelado e as respostas acima, sem LLM ou rede. O teste da plataforma repete claim/report e confere os hashes das fontes exportadas. O teste Studio percorre novamente toda a cadeia e lê menu/backend/effort do mesmo run.

Para regenerar (cwd `mls-base/mls-102035/l2`):
```sh
rtk proxy env EXPORT_ENSAIO_LEDGER=1 ../../node_modules/.bin/tsx --import ../../test/register-hooks.mjs --import ../../test/setup-l2.ts --test ensaio/revisao.test.ts
```
A execução normal não regrava a captura. Origem de código: s3 `72263c6`, mr23 `7baeead`/`d0ff7a1` e a bancada s4; task simulada `ensaio`, sem task viva do Messages. As identidades/datas de uma nova exportação mudam por serem criadas pelos produtores reais.
