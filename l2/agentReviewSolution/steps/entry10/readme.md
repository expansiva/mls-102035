# entry10

Read-only bootstrap. The invocation names the project context, module, captured base and temporary L4 folder explicitly. The step re-reads and verifies the active revision and every temporary source hash after the task is created. It emits `entry10-done` with `status: verified` and schedules the private `review20` step. A stale or incomplete candidate fails closed before the model step.
