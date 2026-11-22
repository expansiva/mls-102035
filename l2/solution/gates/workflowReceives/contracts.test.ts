/// <mls fileReference="_102035_/l2/solution/gates/workflowReceives/contracts.test.ts" enhancement="_blank"/>
import assert from 'node:assert/strict';
import test from 'node:test';
import { checkWorkflowReceives } from '/_102035_/l2/solution/gates/workflowReceives/contracts.js';

const serve = ['cm.agentDraftReady', 'cm.record'];
const row = (over: Partial<{ processId: string; functionId: string; receives: string; processHasWait: boolean; processTriggerEvent: string }>) =>
  ({ processId: 'creation', functionId: 'receiveDraftOutcome', processHasWait: true, ...over });

test('a function that receives an existing serve operation in a process with a wait passes', () => {
  assert.deepEqual(checkWorkflowReceives([row({ receives: 'cm.agentDraftReady' })], serve), []);
});

test('a function without receives is not charged', () => {
  assert.deepEqual(checkWorkflowReceives([row({})], serve), []);
});

test('receives that names no serve operation is an error naming the known ones', () => {
  const issues = checkWorkflowReceives([row({ receives: 'cm.listAgents' })], serve);
  assert.equal(issues.length, 1);
  assert.match(issues[0].message, /not a serve operation.*cm\.agentDraftReady/);
});

test('two functions that receive the same operation are an error on the second', () => {
  const issues = checkWorkflowReceives([row({ receives: 'cm.record' }), row({ functionId: 'other', receives: 'cm.record' })], serve);
  assert.equal(issues.length, 1);
  assert.match(issues[0].path, /functions\.other\.receives$/);
});

test('a process with no wait task cannot receive an arrival', () => {
  const issues = checkWorkflowReceives([row({ receives: 'cm.record', processHasWait: false })], serve);
  assert.equal(issues.length, 1);
  assert.match(issues[0].message, /no wait task/);
});

test('a process with no wait task can receive the arrival that is its own trigger.event', () => {
  assert.deepEqual(checkWorkflowReceives([row({ receives: 'cm.record', processHasWait: false, processTriggerEvent: 'cm.record' })], serve), []);
});

test('a trigger.event of another operation does not stand for the wait', () => {
  const issues = checkWorkflowReceives([row({ receives: 'cm.record', processHasWait: false, processTriggerEvent: 'cm.agentDraftReady' })], serve);
  assert.equal(issues.length, 1);
  assert.match(issues[0].message, /trigger\.event/);
});
