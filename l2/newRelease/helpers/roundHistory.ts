/// <mls fileReference="_102035_/l2/newRelease/helpers/roundHistory.ts" enhancement="_blank" />

import { readJson } from '/_102035_/l2/solution/fs.js';
import { listCompletedL4Implementations, type L4ImplementationRecord } from '/_102035_/l2/solution/candidate/moduleImplementation.js';

export interface ConfirmedRound {
  record: L4ImplementationRecord;
  confirmedAt: string;
  confirmedBy: string;
}

export async function listConfirmedRounds(project: number, moduleName: string): Promise<ConfirmedRound[]> {
  const records = await listCompletedL4Implementations(project, moduleName);
  const rounds = await Promise.all(records.map(async record => {
    const marker = await readJson<{ changeId: string; revisionId: string; confirmedAt: string; confirmedBy: string }>({
      project, level: 4, folder: `${moduleName}/pipeline/changes/${record.changeId}`,
      shortName: 'confirmation', extension: '.json',
    });
    return marker?.changeId === record.changeId && marker.revisionId === record.revisionId && marker.confirmedAt
      ? { record, confirmedAt: marker.confirmedAt, confirmedBy: marker.confirmedBy || '' } : null;
  }));
  return rounds.filter((round): round is ConfirmedRound => round !== null)
    .sort((a, b) => b.confirmedAt.localeCompare(a.confirmedAt));
}
