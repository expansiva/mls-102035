/// <mls fileReference="_102035_/l2/pizzaria/loginInterno.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "login-interno",
  "pageName": "loginInterno",
  "actor": "staff",
  "purpose": "Acesso interno ao sistema para perfis operacionais.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "loginInternoAcessoForm",
          "purpose": "Permitir autenticação de perfis operacionais.",
          "rulesApplied": [
            "rule-access-profiles"
          ]
        }
      ]
    }
  ],
  "status": "draft",
  "visualStyle": "Leve e amigável. Tema claro"
}
