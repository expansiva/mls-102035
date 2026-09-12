/// <mls fileReference="_102047_/l4/hiringPipeline/rules.defs.ts" enhancement="_blank"/>

import type { Ns5RulesArtifact } from '/_102035_/l2/solution/types.js';

export const hiringPipelineRules = {
  "schemaVersion": "2026-09-10-ns5-rules-v1",
  "moduleName": "hiringPipeline",
  "rules": [
    {
      "ruleId": "newApplicationStartsInScreening",
      "description": "A newly recorded application starts in the screening stage."
    },
    {
      "ruleId": "interviewRequiresScreening",
      "description": "An application may move to interview only from screening."
    },
    {
      "ruleId": "offerRequiresInterview",
      "description": "An application may move to offer only from interview."
    },
    {
      "ruleId": "hireRequiresOffer",
      "description": "An application may be marked hired only from offer."
    },
    {
      "ruleId": "hireRequiresRemainingHeadcount",
      "description": "An application may be marked hired only when its job position has remaining headcount."
    },
    {
      "ruleId": "rejectionRequiresActiveApplication",
      "description": "An application may be rejected only while it is in screening, interview, or offer."
    },
    {
      "ruleId": "rejectionReasonRequired",
      "description": "A rejected application must have a rejection reason."
    },
    {
      "ruleId": "applicationsRequireOpenPosition",
      "description": "An application may be recorded only for an open job position."
    },
    {
      "ruleId": "filledHeadcountCountsHiredApplications",
      "description": "A job position's filled headcount equals the number of its applications marked hired."
    },
    {
      "ruleId": "remainingHeadcountCalculation",
      "description": "A job position's remaining headcount equals its required headcount minus its filled headcount."
    },
    {
      "ruleId": "positionClosesWhenHeadcountFilled",
      "description": "A job position closes automatically when its filled headcount reaches its required headcount."
    }
  ]
} as const satisfies Ns5RulesArtifact;

export type HiringPipelineRulesType = typeof hiringPipelineRules;

export default hiringPipelineRules;
