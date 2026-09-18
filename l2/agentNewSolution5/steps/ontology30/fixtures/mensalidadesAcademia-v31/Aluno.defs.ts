/// <mls fileReference="_102047_/l4/mensalidadesAcademia/ontology/Aluno.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const mensalidadesAcademiaEntityAluno = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "mensalidadesAcademia",
  "entityId": "Aluno",
  "title": "Aluno",
  "description": "Pessoa matriculada na academia, identificada no cadastro mestre da organização.",
  "displayField": "details.identification.name",
  "relationships": {
    "matriculas": {
      "relationshipId": "alunoMatriculas",
      "to": "Matricula",
      "via": "Matricula.alunoId",
      "cardinality": "1:N",
      "title": "Matrículas do aluno",
      "description": "Matrículas realizadas para este aluno; cada matrícula pertence obrigatoriamente a um aluno.",
      "mode": "fk",
      "required": "Ao registrar uma matrícula para o aluno.",
      "role": "aluno"
    }
  },
  "capabilities": {
    "read.byId": "Lê o cadastro mestre de um aluno pelo identificador para exibir seus dados na matrícula; consulta direta pelo mdmId; usada pela recepção e pela gerência.",
    "locate.byName": "Localiza alunos pelo nome para iniciar uma matrícula; pesquisa o índice de pessoas por texto do nome; usada pela recepção.",
    "locate.byDocument": "Localiza o aluno pelo documento nacional para evitar duplicidade antes da matrícula; consulta o índice de documento; usada pela recepção.",
    "register.createOrAttach": "Cria a pessoa quando ainda não existe ou associa o papel de aluno ao cadastro mestre encontrado; deduplica por documento e anexa a tag mensalidadesAcademia.Aluno; usada pela recepção ao criar a matrícula.",
    "edit.platformFields": "Atualiza os dados de identificação do aluno mantidos pela organização; grava os campos da plataforma e atualiza o índice quando necessário; usada pela recepção.",
    "edit.moduleNamespace": "Mantém exclusivamente o namespace mensalidadesAcademia do aluno quando houver dado próprio da academia; atualiza somente essa chave do documento mestre; usada pelo módulo.",
    "inactivate": "Inativa ou reativa o cadastro mestre de um aluno sem apagá-lo; altera a situação de atividade do MDM; usada pela gerência na manutenção cadastral.",
    "listLinks": "Consulta os vínculos ativos e históricos do aluno no cadastro mestre; lista relacionamentos versionados do MDM; usada pela recepção e pela gerência.",
    "statusHistory.read": "Exibe as alterações de situação do cadastro mestre do aluno; consulta o histórico de status; usada pela gerência na conferência cadastral.",
    "audit": "Consulta quem alterou o cadastro mestre do aluno e quando; lê a trilha de auditoria da plataforma; usada pela gerência."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-document-shape-validated",
    "rule-identity-never-in-namespace",
    "rule-person-privacy-consent-required-br-eu"
  ],
  "kind": "role",
  "subtype": "Person",
  "roleTag": "mensalidadesAcademia.Aluno",
  "source": "/_102034_/l4/ontology/mdm.defs.ts",
  "record": {
    "fields": {
      "id": {
        "type": "uuid",
        "required": true,
        "indexed": true,
        "derived": true,
        "description": "mdmId; stable through promotion and merge."
      },
      "version": {
        "type": "integer",
        "required": true,
        "derived": true,
        "description": "Bumped by the engine on every write; optimistic concurrency."
      },
      "details": {
        "type": "object",
        "required": true,
        "description": "Documento do cadastro mestre da pessoa no contexto da academia.",
        "fields": {
          "identification": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "subtype": {
                "type": "enum",
                "required": true,
                "indexed": true,
                "derived": true,
                "values": [
                  {
                    "value": "Person",
                    "title": "Pessoa",
                    "description": "Pessoa física cadastrada no MDM."
                  }
                ],
                "description": "Indica que este registro mestre é uma pessoa, usada pela academia como aluno.",
                "title": "Tipo de cadastro",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 0,
                "description": "Nome pelo qual o aluno é identificado pela recepção durante a matrícula.",
                "title": "Nome",
                "min": 0,
                "max": 0
              },
              "status": {
                "type": "enum",
                "required": true,
                "indexed": true,
                "derived": true,
                "values": [
                  {
                    "value": "Active",
                    "title": "Ativo",
                    "description": "Cadastro mestre ativo."
                  },
                  {
                    "value": "Inactive",
                    "title": "Inativo",
                    "description": "Cadastro mestre inativo."
                  },
                  {
                    "value": "Merged",
                    "title": "Mesclado",
                    "description": "Cadastro mestre incorporado a outro registro."
                  },
                  {
                    "value": "Blocked",
                    "title": "Bloqueado",
                    "description": "Cadastro mestre bloqueado pela organização."
                  }
                ],
                "title": "Situação do cadastro mestre",
                "description": "Situação de atividade do registro mestre do aluno na organização.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "docType": {
                "type": "enum",
                "indexed": true,
                "values": [
                  {
                    "value": "CPF",
                    "title": "CPF",
                    "description": "Cadastro de Pessoas Físicas."
                  },
                  {
                    "value": "Passport",
                    "title": "Passaporte",
                    "description": "Documento de viagem da pessoa."
                  },
                  {
                    "value": "NationalId",
                    "title": "Documento nacional",
                    "description": "Documento nacional de identificação."
                  },
                  {
                    "value": "Other",
                    "title": "Outro",
                    "description": "Outro documento de identificação aceito pela organização."
                  }
                ],
                "title": "Tipo de documento",
                "description": "Tipo do documento nacional usado para localizar ou cadastrar o aluno sem duplicidade.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "docId": {
                "type": "string",
                "indexed": true,
                "description": "Número do documento nacional apresentado para identificar o aluno.",
                "title": "Número do documento",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "countryCode": {
                "type": "string",
                "required": true,
                "indexed": true,
                "pattern": "^[A-Z]{2}$",
                "maxLength": 2,
                "default": "US",
                "description": "Código ISO do país aplicável ao documento e às regras do cadastro do aluno.",
                "title": "País",
                "min": 0,
                "max": 0
              },
              "tags": {
                "type": "string",
                "required": true,
                "collection": true,
                "derived": true,
                "description": "Etiquetas derivadas, incluindo o papel mensalidadesAcademia.Aluno que vincula a pessoa à academia.",
                "title": "Etiquetas do cadastro",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados de identificação do aluno mantidos pela organização."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Dados comuns do cadastro mestre; a academia não acrescenta campos nesta camada."
          },
          "person": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "privacyConsent": {
                "type": "object",
                "of": "PrivacyConsent",
                "description": "Consentimento de privacidade aplicável ao aluno quando exigido pela LGPD.",
                "title": "Consentimento de privacidade",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados pessoais do aluno mantidos na camada de pessoa do MDM."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Campos promovidos pela organização, somente para leitura pela academia."
          },
          "mensalidadesAcademia": {
            "type": "object",
            "owner": "module",
            "fields": {},
            "description": "Module namespace; the prompt asked for no data of this module about the record."
          }
        }
      }
    }
  }
} as const satisfies Ns5OntologyEntityV3;

export type MensalidadesAcademiaEntityAlunoType = typeof mensalidadesAcademiaEntityAluno;

export default mensalidadesAcademiaEntityAluno;
