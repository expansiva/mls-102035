/// <mls fileReference="_102035_/l2/pizzaria/usuarioEditor.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "usuario-editor",
  "pageName": "usuarioEditor",
  "actor": "admin",
  "purpose": "Cadastrar ou alterar perfil de usuário interno.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "usuarioEditorForm",
          "purpose": "Cadastrar ou atualizar dados e perfil do usuário interno.",
          "rulesApplied": [
            "rulePerfisAcesso",
            "ruleModuloInterno",
            "ruleIdiomaPt"
          ]
        }
      ]
    }
  ],
  "status": "draft"
}
