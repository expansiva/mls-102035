/// <mls fileReference="_102035_/l2/pizzaria/login.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "login",
  "pageName": "login",
  "actor": "staff",
  "purpose": "Permitir acesso ao módulo para perfis autorizados.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "loginAccessForm",
          "purpose": "Coletar credenciais e iniciar sessão.",
          "rulesApplied": [
            "rule_access_roles",
            "rule_language_ptbr",
            "rule_tone"
          ]
        }
      ]
    }
  ],
  "status": "draft",
  "visualStyle": "Claro e amigável."
}
