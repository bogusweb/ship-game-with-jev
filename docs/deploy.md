# Deploy: sinkjev.com + api.sinkjev.com

**Model:** build everything on the operator machine (Mac, Linux, or CI). The server receives **only** production artifacts. Do **not** run `next build` on s9.

Hosting: mydevil **s9** (FreeBSD, NGiNX + Phusion Passenger), account `Bogusweb` — **not** Netlify.

| Host | Path on s9 |
| --- | --- |
| `https://api.sinkjev.com` | `/usr/home/Bogusweb/domains/api.sinkjev.com/public_nodejs` |
| `https://sinkjev.com` | `/usr/home/Bogusweb/domains/sinkjev.com/public_nodejs` |

Both vhosts get the **same** artifact set (the game calls same-origin `/api`). Passenger entry point: `app.js` in the root of `public_nodejs`.

Keep `SHIP_GAME_TYPESAFE_API_KEY` in `~/.bash_profile` on s9 — never commit or hardcode it.

---

## One command (recommended)

Script at the repo root: **`deploy-sinkjev.sh`**.

```bash
chmod +x deploy-sinkjev.sh
./deploy-sinkjev.sh
```

You enter the SSH password once (`Bogusweb@s9.mydevil.net`). Rsync to both vhosts and Passenger restart share one SSH connection (ControlMaster).

| Command | What it does |
| --- | --- |
| `./deploy-sinkjev.sh` | On operator: `npm ci` + `next build` → pack dist → rsync both vhosts → restart. On s9: `npm ci --omit=dev` only when `node_modules/next` is missing or `package-lock.json` changed. |
| `./deploy-sinkjev.sh --install` | Same, but always runs `npm ci --omit=dev` on both vhosts (after accidental Mac `node_modules` upload or SWC crash). |
| `./deploy-sinkjev.sh --skip-build` | Reuse local `.next` — rsync + restart only. |
| `./deploy-sinkjev.sh --fix-config` | No build. Uploads sanitized `next.config.ts`, deletes `next.config.compiled.js` on both vhosts, restart. Fixes 500 `ERR_MODULE_NOT_FOUND …/lib/brand/materialize-pack-icons`. |

Override host: `SINKJEV_SSH=Bogusweb@s9.mydevil.net ./deploy-sinkjev.sh`.

The script never runs `next build` or a full `npm ci` on s9. It stops on `KEY_MISSING` (env from `~/.bash_profile` only). Ends with curl checks for session and home.

502 right after restart → wait ~20s (cold start) → open `https://sinkjev.com`.

---

## What goes to the server (and what does not)

### On the operator machine (before rsync)

```text
npm ci
npm run build          # → .next/ (JS; cache/ is excluded)
```

The dist package contains **only**:

```text
app.js                 # Passenger entry (script writes it if missing)
.next/                 # without cache/
public/
package.json
package-lock.json      # needed for FreeBSD native install exception
next.config.ts         # script strips lib/brand import — TS sources do not run on s9
```

**Do not rsync:** Mac/Ubuntu `node_modules`, `app/`, `lib/`, `components/`, TypeScript sources, `next.config.compiled.js` from the operator machine.

### On s9 (after rsync)

| Allowed | Forbidden |
| --- | --- |
| `npm ci --omit=dev` on **FreeBSD** (lockfile changed or missing `node_modules/next`) | `npm run build`, `next build` |
| `devil www restart` both vhosts | rsync `node_modules` from another OS (SWC darwin/linux ≠ FreeBSD) |
| env from `~/.bash_profile` | secrets in repo or deploy-time `.env` |

`npm ci --omit=dev` on s9 is a **runtime install**, not a build — the script decides when it is needed.

Rsync `--delete` must use `--exclude node_modules` and `--exclude tmp` (the script does). Otherwise you wipe FreeBSD modules and `tmp/jev-budget.json`.

---

## Warning: next.config and materialize-pack-icons

Do **not** upload a `next.config.ts` that imports `lib/brand/materialize-pack-icons`. Next compiles config to `next.config.compiled.js` and resolves modules **without** `.ts` → Passenger 500, even if you upload `lib/brand/*.ts`.

- Favicons are materialized **locally** via `prebuild` (`tsx scripts/materialize-pack-icons.ts`).
- `deploy-sinkjev.sh` **strips** the import and `materializePackIcons()` call when packing dist.
- It **deletes** `next.config.compiled.js` on s9 before restart.
- It does **not** modify your local repo `next.config.ts`.
- Do **not** rsync `next.config.compiled.js` from Mac.

Quick fix: `./deploy-sinkjev.sh --fix-config`.

---

## Manual deploy (if the script fails)

Run from the app root (where `package.json` lives). For normal releases use `./deploy-sinkjev.sh`.

1. **Operator — build:** `npm ci && npm run build` (verify `.next/BUILD_ID` exists).
2. **Operator — dist:** copy `app.js`, `package.json`, `package-lock.json`, sanitized `next.config.ts`, `public/`, `.next/` (no `cache/`, no `node_modules`).
3. **Operator — rsync** dist to both `public_nodejs` paths with `--exclude node_modules --exclude tmp`.
4. **s9 — env check:** `test -n "$SHIP_GAME_TYPESAFE_API_KEY"` (from `~/.bash_profile`).
5. **s9 — optional:** `npm ci --omit=dev` in each vhost if lockfile changed — **not** `next build`.
6. **s9 — restart:** `devil www restart api.sinkjev.com` and `devil www restart sinkjev.com`.
7. **Verify:** `curl` session endpoints → HTTP 200, `{"ok":true}`.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `KEY_MISSING` | `source ~/.bash_profile` on s9 |
| `Cannot find module …swc-darwin` | Mac `node_modules` on server — `./deploy-sinkjev.sh --install` |
| 502 / Passenger 500 `materialize-pack-icons` | `./deploy-sinkjev.sh --fix-config` |
| `--delete` wiped `node_modules` | missing `--exclude node_modules` — rerun with `--install` |

TypeSafe API: `https://api.typesafe.ai/v1/systemone` — not `api.sinkjev.com`.
