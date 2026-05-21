/// <mls fileReference="_102035_/l2/pizzaria/loginInterno.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "login-interno",
  "pageName": "loginInterno",
  "actor": "staff",
  "purpose": "Autenticar usuários internos para acesso ao módulo interno.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "loginInternoAuthForm",
          "purpose": "Coletar credenciais e iniciar sessão de usuário interno.",
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
