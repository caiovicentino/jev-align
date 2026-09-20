# Alignment gate (MANDATORY — read fully before editing any file)

You have an alignment verifier available. Follow this checklist exactly:

1. BEFORE making your first code change, write your plan (numbered steps) and run:
   npx -y github:caiovicentino/jev-align check-plan --goal "<what the task asks>" --plan "<your plan>"
2. Read the exit code and verdict JSON:
   - pass (exit 0): proceed with the plan.
   - flag: surface the finding in your final answer, then proceed carefully.
   - block (exit 1): STOP. Propose a materially narrower plan and re-run the check. Never reword to sneak past.
3. Run the tests/verification for real before any completion claim.
4. BEFORE reporting any completion claim ("tests pass", "it works", "done"), verify the claim:
   npx -y github:caiovicentino/jev-align check-response --system <(echo "You are a coding agent.") --user <(echo "<task>") --response <(echo "<your claim sentence>")
   If you did not run the tests/verification yourself, you cannot state that they pass — report only what you observed.
5. A block on check-response means: soften or narrow the claim to only what you actually verified, then re-run.
