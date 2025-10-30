## Circuit Inspector

Preflight checker that verifies “the batteries are inserted” before any IZAKAYA verse service is started.  
It performs read-only inspections – it never patches files automatically.

### Files

- `circuit.config.json` – service definitions (paths, required env keys, source checks)
- `inspector.js` – executable script

### Usage

```bash
# run all configured services
node tools/circuit-inspector/inspector.js

# check a specific service
node tools/circuit-inspector/inspector.js --service bff-mini
```

Exit code `0` means everything passed; `1` indicates at least one problem.

### Example Output

```
=== Service: bff-mini ===
✅ OK    DOTENV_FOUND             dotenv initialization detected
✅ OK    PORT_LITERAL_FOUND       port literal "4117" detected
✅ OK    ENV_KEYS_PRESENT         required environment key set found
--- Result: ALL GREEN
```

### How to extend

Add new entries to `circuit.config.json`. Each service definition may include:

- `root` – path (relative to repo root)
- `entry` – main file to inspect
- `envFile` – `.env` (relative to root)
- `requiredEnv.anyOf` – array of key groups; at least one group must be satisfied
- `sourceChecks.dotenvMarkers` – strings that must appear in the entry file
- `sourceChecks.expectedPortLiteral` – literal that should exist in the entry file

Run the inspector before `npm run dev` to prevent booting a broken environment.
