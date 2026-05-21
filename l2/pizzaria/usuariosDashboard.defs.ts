/// <mls fileReference="_102035_/l2/pizzaria/usuariosDashboard.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "usuarios-dashboard",
  "pageName": "usuariosDashboard",
  "actor": "admin",
  "purpose": "Listar e administrar usuários internos e perfis.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "usuariosDashboardList",
          "purpose": "Listar usuários internos e seus perfis para administração.",
          "rulesApplied": [
            "rulePerfisAcesso",
            "ruleModuloInterno",
            "ruleIdiomaPt",
            "ruleTomProfissionalConcisao"
          ]
        }
      ]
    }
  ],
  "status": "draft"
}
