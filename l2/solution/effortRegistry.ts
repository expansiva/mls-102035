/// <mls fileReference="_102035_/l2/solution/effortRegistry.ts" enhancement="_blank"/>

import type { EffortAnswer, EffortInput } from '/_102035_/l2/solution/poolPlan.js';

export type DescribeEffortFn = (input: EffortInput) => EffortAnswer | Promise<EffortAnswer>;

export type EffortRegistry = Record<string, { describeEffort: DescribeEffortFn } | undefined>;

/** Empty until How publishes one neutral `describeEffort` module per master. The ensaio mutates this object. */
export const effortRegistry: EffortRegistry = {};
