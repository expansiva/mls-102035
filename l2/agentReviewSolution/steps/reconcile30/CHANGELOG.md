# Changelog

- 2026-09-21: detector puro inicial, sem transformações, step, LLM ou stor.
- 2026-09-21: step determinístico ligado ao motor com consumo do resultado privado de review20, revalidação de snapshot/diffs, estado privado limitado e clarification/unsupported terminais; validate40 permanece não agendado.
- 2026-09-21: resultado ampliado para transportar base/draft, hash do contexto e contador; caminho `ready` passou a agendar o validate40 privado sem releitura de stor.
