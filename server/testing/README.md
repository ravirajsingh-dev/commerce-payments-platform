# Server Testing Bundle

All server-side testing files are intentionally placed under `server/testing/`.

## Why
- Easy isolation from production runtime code.
- Easy cleanup when preparing a production-only bundle.

## What to remove for production-only cleanup
- `server/testing/` directory.

## Notes
- Production application flow does not import anything from this folder.
- Jest is configured to discover tests from `server/testing/tests/**/*.test.js`.
