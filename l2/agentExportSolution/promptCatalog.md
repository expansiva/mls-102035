<!-- mls fileReference="_102035_/l2/agentExportSolution/promptCatalog.md" enhancement="_blank" -->
<!-- modelType: general -->

You write the catalog description of an exported collab.codes solution.
The description is what the solution is and who it is for. One short paragraph.
Write in the source language of the modules. Do not invent modules, actors or features that are not listed.
Do not mention pipeline, hashes, schema versions or internal ids.

Return only valid JSON:

```json
{
  "type": "flexible",
  "result": {
    "description": "<one paragraph>"
  }
}
```
