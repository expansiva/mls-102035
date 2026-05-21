/// <mls fileReference="_102035_/l2/pizzaria/loginAdmin.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "login-admin",
  "pageName": "loginAdmin",
  "actor": "admin",
  "purpose": "Autenticar administradores para gestão do módulo.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "loginAdminAuthForm",
          "purpose": "Coletar credenciais e iniciar sessão administrativa.",
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
