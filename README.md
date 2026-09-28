master solution (L4)

- `agentNewSolution5` — turns the customer prompt into the module specification (l4): journeys, entities, rules, access, workflows, integration.
- `agentPlannerL4` — opens the planning in the module pool (`mode: estimate`) and coordinates the frontend (L2) and backend (L1) planners.
- `agentReviewSolution` — reviews a change to the l4 (`tobe` → review → publish).
- `agentExportSolution` — exports/packages a solution.
- `newRelease` — the screens: the user sees and adjusts the l4, and approves the effort that runs the next agents.
- `solution/` — shared types and utilities, including the pool (`helpers/` holds what was kept from the retired NS4, e.g. `ns4Types.ts`).
- `l4/organization` — organization registry and types.
- `agentChangeSolution` — spec only, no implementation.
