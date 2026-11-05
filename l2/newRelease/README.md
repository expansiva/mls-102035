# New Release (L2)

Este serviço edita um módulo L4 em rodadas locais. A aba **Revisão** calcula o esforço, aplica as mudanças, permite conferir o resultado e encerra a rodada por confirmação explícita. Confirmar **não publica**.

## Onde mudar uma aba

`widgets/index.ts` é o shell: escolhe projeto, módulo, versão e aba, carrega os dados comuns e mostra diferenças e validação. Cada aba tem componente, modelo, estilo LESS e testes juntos:

| Aba | Pasta | Dados principais |
| --- | --- | --- |
| Geral | `widgets/general/` | `module.defs.ts`, idiomas e pedido geral |
| Jornadas | `widgets/journeys/` | `journeys/*.defs.ts` e índice |
| Ontologia | `widgets/ontology/` | entidades, campos e relações |
| Matriz de acesso | `widgets/access/` | atores, autoridades e concessões |
| Regras | `widgets/rules/` | `rules.defs.ts` |
| Workflows | `widgets/workflows/` | `workflows.defs.ts` |
| Integração | `widgets/integration/` | `integration.defs.ts` |
| Revisão | `widgets/review/` | diferenças, esforço, tasks, histórico e publicação |

`widgets/shared/` contém componentes e modelos usados por mais de uma aba, como o seletor de ícones. `helpers/` guarda leitura, validação e orquestração compartilhadas. `tobe.ts` lê e grava o candidato e encerra uma rodada confirmada. O contrato de implementação e suas fases ficam em `solution/candidate/moduleImplementation.ts`.

## Ciclo de uma rodada

1. **Atual** (`asis`) lê o L4 local. A primeira edição prepara **Em alteração** (`tobe`), sem modificar o Atual.
2. **Calcular esforço** cria uma revisão vinculada à revisão L4; o vínculo permite recuperar a task depois de F5.
3. **Aplicar mudanças** aceita o plano e executa as fases de `implementationCommands()` em ordem. O registro `implementation.json` guarda fase, task e resultado. Enquanto esse registro está ativo, a edição é bloqueada.
4. **Conferir localmente** permite inspecionar o resultado. **Confirmar e continuar** chama `completeTobeImplementation()`, grava `confirmation.json` no change, retira o candidato e volta ao Atual. Os registros da rodada permanecem em `pipeline/changes/` e aparecem em **Rodadas confirmadas**.
5. **Publicar** só indica que há rodadas locais pendentes; a ação de publicação ainda não existe.

O número de caixas de task vem do plano real. Na manutenção estrutural podem existir cinco comandos fixos e comandos adicionais; na geração inicial há quatro ou cinco. Não fixe quatro caixas no componente.

## Traduções, estilo e testes

As mensagens ficam no bloco TypeScript `helpers/i18n.ts`. Todo texto novo visível deve ter chaves para en e pt-BR. Os componentes usam Lit **sem Shadow DOM**; o estilo fica em `.less` ao lado do `.ts`, sob o seletor do elemento.

Use `pnpm typecheck` na raiz de `mls-base`. A suíte oficial é `node scripts/run-tests.mjs 102035 l2`. Se o sandbox impedir o socket do executável `tsx`, a forma equivalente é `node --import tsx --import test/register-hooks.mjs --import test/setup-l2.ts --test` com `TSX_TSCONFIG_PATH=test/tsconfig.runtime.json` e os testes desejados. Para verificar o fluxo, cubra cálculo, retorno após F5, aplicação com fases, confirmação e uma segunda rodada. Não execute agentes pagos em teste local sem autorização.

O teste de interface com task real pertence à bancada do tester; um módulo sem candidato não valida alinhamento, progresso nem persistência dos widgets.
