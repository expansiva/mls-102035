/// <mls fileReference="_102035_/l2/project.ts" enhancement="_blank" />

export const projectConfig = {
  modules: [
    { name: "pizzaria", path: "pizzaria", auth: "admin" }
  ],

  layouts: {
    1: { name: 'standard', skill: '_102020_/l2/agents/newModule/skills/genPageRender.ts' },
  },

  designSystems: {
    1: { name: 'default', skill: '/_102029_/l2/skills/ds/default.js' },
  }
}