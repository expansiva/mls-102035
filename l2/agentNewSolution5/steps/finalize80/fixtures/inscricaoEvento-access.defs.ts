/// <mls fileReference="_102047_/l4/inscricaoEvento/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact } from '/_102035_/l2/solution/types.js';

export const inscricaoEventoAccess = {
  "schemaVersion": "2026-09-10-ns5-access-v2",
  "moduleName": "inscricaoEvento",
  "actors": [
    {
      "actorId": "organizador",
      "kind": "internal",
      "origin": "named",
      "title": "Organizador",
      "description": "Profissional da organização que cadastra, publica e acompanha eventos e inscrições."
    },
    {
      "actorId": "publico",
      "kind": "external",
      "origin": "named",
      "title": "Público",
      "description": "Pessoa que acessa a página pública de um evento para realizar ou cancelar sua inscrição."
    }
  ],
  "authorities": [
    {
      "authorityId": "gerenciarEventos",
      "title": "Gerenciar eventos e locais",
      "description": "Cadastrar, alterar, publicar e acompanhar os eventos da organização e os locais utilizados."
    },
    {
      "authorityId": "acompanharInscricoes",
      "title": "Acompanhar e exportar inscrições",
      "description": "Consultar inscrições, participantes e ocupação dos eventos, incluindo a exportação da lista de inscritos."
    },
    {
      "authorityId": "consultarEventoPublicado",
      "title": "Consultar evento publicado",
      "description": "Consultar a referência de evento publicada vinculada à própria inscrição."
    },
    {
      "authorityId": "gerenciarPropriaInscricao",
      "title": "Gerenciar própria inscrição",
      "description": "Realizar, consultar e cancelar a própria inscrição em evento."
    }
  ],
  "grants": [
    {
      "grantId": "organizadorGerenciaEventos",
      "actorRef": "organizador",
      "authorityRef": "gerenciarEventos",
      "entityRefs": [
        "Evento",
        "Venue"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Eventos e locais cadastrados pela organização."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Acesso completo aos dados de eventos e locais necessários para seu cadastro e publicação."
      }
    },
    {
      "grantId": "organizadorAcompanhaInscricoes",
      "actorRef": "organizador",
      "authorityRef": "acompanharInscricoes",
      "entityRefs": [
        "Evento",
        "Inscricao",
        "Participant"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Inscrições e participantes de todos os eventos da organização."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Acesso completo aos dados de inscrições, participantes e eventos para acompanhamento e exportação."
      }
    },
    {
      "grantId": "publicoConsultaEventoPublicado",
      "actorRef": "publico",
      "authorityRef": "consultarEventoPublicado",
      "entityRefs": [
        "Inscricao"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Somente a própria inscrição, incluindo a referência ao evento publicado ao qual ela está vinculada.",
        "anchorEntity": "Participant"
      },
      "disclosure": {
        "mode": "summaryOnly",
        "description": "Exibe somente a referência do evento e a situação da própria inscrição.",
        "allowedFields": [
          "Inscricao.eventId",
          "Inscricao.status"
        ],
        "deniedFields": [
          "Inscricao.id",
          "Inscricao.participantId",
          "Inscricao.registeredAt"
        ]
      }
    },
    {
      "grantId": "publicoGerenciaPropriaInscricao",
      "actorRef": "publico",
      "authorityRef": "gerenciarPropriaInscricao",
      "entityRefs": [
        "Inscricao",
        "Participant"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Somente a inscrição e o cadastro de participante vinculados à própria pessoa.",
        "anchorEntity": "Participant"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Exibe somente os dados necessários para consultar e cancelar a própria inscrição.",
        "allowedFields": [
          "Inscricao.id",
          "Inscricao.eventId",
          "Inscricao.registeredAt",
          "Inscricao.status",
          "Participant.id"
        ],
        "deniedFields": [
          "Inscricao.participantId"
        ]
      }
    }
  ]
} as const satisfies Ns5AccessArtifact;

export type InscricaoEventoAccessType = typeof inscricaoEventoAccess;

export default inscricaoEventoAccess;
