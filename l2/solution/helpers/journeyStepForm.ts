/// <mls fileReference="_102035_/l2/solution/helpers/journeyStepForm.ts" enhancement="_blank"/>

/**
 * How a journey step says what it writes. One text for the candidate gate message and for the New Release journeys edit.
 * A step has no other field for a second write: an invented one is read by no gate and no generator.
 */
export const NS5_STEP_WRITES_FORM =
  'An act step names the entity it writes in `entity` and every extra entity it also writes in `affects`, a list of entity ids (for example `"affects": ["ConductChange"]`). There is no other field for it.';
