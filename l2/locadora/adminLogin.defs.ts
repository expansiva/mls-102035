/// <mls fileReference="_102035_/l2/locadora/adminLogin.defs.ts"  enhancement="_blank"/>

export const definition = {
  "screenId": "admin-login",
  "pageName": "adminLogin",
  "actor": "admin",
  "purpose": "Permitir acesso administrativo ao sistema interno.",
  "sections": [
    {
      "sectionName": "main",
      "mode": "stack",
      "organisms": [
        {
          "organismName": "adminLoginAccessForm",
          "purpose": "Coletar credenciais e permitir acesso administrativo.",
          "rulesApplied": [
            "rule_publico_interno",
            "rule_papel_admin_unico",
            "rule_idioma_pt_br",
            "rule_tom_profissional_conciso"
          ]
        }
      ]
    }
  ],
  "status": "draft",
  "visualStyle": "Corporate & professional"
}
