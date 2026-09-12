/// <mls fileReference="_102047_/l4/hiringPipeline/ontology/JobPosition.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const hiringPipelineEntityJobPosition = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "hiringPipeline",
  "entityId": "JobPosition",
  "title": "Job Position",
  "description": "An open hiring position with its requirements and capacity for hires.",
  "kind": "core",
  "party": "none",
  "displayField": "title",
  "fields": [
    {
      "fieldId": "id",
      "title": "Job Position ID",
      "type": "uuid",
      "required": true,
      "description": "Unique identifier for the job position."
    },
    {
      "fieldId": "title",
      "title": "Title",
      "type": "string",
      "required": true,
      "description": "Title of the job position."
    },
    {
      "fieldId": "department",
      "title": "Department",
      "type": "string",
      "required": true,
      "description": "Department seeking to fill the position."
    },
    {
      "fieldId": "description",
      "title": "Description",
      "type": "text",
      "required": true,
      "description": "Description of the position and its hiring requirements."
    },
    {
      "fieldId": "headcount",
      "title": "Required Headcount",
      "type": "integer",
      "required": true,
      "description": "Number of candidates required for this position."
    }
  ],
  "details": {
    "filledHeadcount": {
      "type": "integer",
      "description": "Number of applications that have reached the hired stage for this position."
    },
    "remainingHeadcount": {
      "type": "integer",
      "description": "Number of additional hires needed to fulfill the required headcount."
    },
    "isHeadcountFilled": {
      "type": "boolean",
      "description": "Indicates whether the position's required headcount has been fulfilled."
    }
  },
  "lifecycleStates": [],
  "transitions": [],
  "storage": {
    "target": "moduleDatabase",
    "scope": "module",
    "idField": "id"
  },
  "mutability": "appendOnly"
} as const satisfies Ns5OntologyEntityArtifact;

export type HiringPipelineEntityJobPositionType = typeof hiringPipelineEntityJobPosition;

export default hiringPipelineEntityJobPosition;
