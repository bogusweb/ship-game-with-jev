#!/usr/bin/env bash
# Deploy sinkjev na mydevil s9 z Maca.
# Buduje lokalnie, rsync artefaktów, restart Passenger.
# Hasło SSH wpisujesz raz (ControlMaster). Nie commituj sekretów.
#
# Użycie — katalog z package.json (korzeń aplikacji):
#   chmod +x deploy-sinkjev.sh
#   ./deploy-sinkjev.sh              # build + rsync + restart
#   ./deploy-sinkjev.sh --install    # wymuś npm ci --omit=dev na obu vhostach
#   ./deploy-sinkjev.sh --skip-build # rsync istniejącego .next (bez npm ci/build na Macu)
#   ./deploy-sinkjev.sh --fix-config # tylko next.config.ts + skasuj compiled.js + restart
#
# Na s9 NIE ma next build. npm ci --omit=dev tylko gdy brak node_modules/next
# albo zmienił się package-lock.json (albo podasz --install).
set -euo pipefail

HOST="${SINKJEV_SSH:-Bogusweb@s9.mydevil.net}"
API_REL="domains/api.sinkjev.com/public_nodejs"
UI_REL="domains/sinkjev.com/public_nodejs"
DIST="${TMPDIR:-/tmp}/sinkjev-dist"
CTRL="${TMPDIR:-/tmp}/sinkjev-ssh-%C"
INSTALL=0
SKIP_BUILD=0
FIX_CONFIG=0

for arg in "$@"; do
  case "$arg" in
    --install) INSTALL=1 ;;
    --skip-build) SKIP_BUILD=1 ;;
    --fix-config) FIX_CONFIG=1; SKIP_BUILD=1 ;;
    -h|--help)
      sed -n '2,16p' "$0"
      exit 0
      ;;
    *)
      echo "Nieznany argument: $arg (jest --install, --skip-build, --fix-config)" >&2
      exit 1
      ;;
  esac
done

if [[ ! -f package.json ]] || [[ ! -f package-lock.json ]]; then
  echo "Uruchom z katalogu aplikacji (brak package.json / package-lock.json)." >&2
  exit 1
fi
if [[ ! -f next.config.ts ]] && [[ ! -f next.config.js ]] && [[ ! -f next.config.mjs ]]; then
  echo "Brak next.config.ts/js/mjs — to nie wygląda na korzeń Next.js." >&2
  exit 1
fi

ROOT="$(pwd)"
SSH_OPTS=(
  -o ControlMaster=auto
  -o ControlPath="$CTRL"
  -o ControlPersist=15m
  -o StrictHostKeyChecking=accept-new
  -o ServerAliveInterval=30
)
SSH=(ssh "${SSH_OPTS[@]}")
RSYNC_RSH="ssh -o ControlMaster=auto -o ControlPath=$CTRL -o ControlPersist=15m -o StrictHostKeyChecking=accept-new"

cleanup() {
  ssh "${SSH_OPTS[@]}" -O exit "$HOST" >/dev/null 2>&1 || true
}
trap cleanup EXIT

write_app_js() {
  cat > "$ROOT/app.js" << 'EOF'
"use strict";

const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    handle(req, res, parse(req.url, true));
  }).listen(process.env.PORT || 3000);
});
EOF
}

remote() {
  "${SSH[@]}" "$HOST" "bash -lc $(printf '%q' "$1")"
}

remote_lock_hash() {
  remote "if [ -f ~/$1/package-lock.json ]; then sha256 -q ~/$1/package-lock.json; else echo MISSING; fi"
}

need_install() {
  local rel="$1"
  local remote_hash="$2"
  if [[ "$INSTALL" -eq 1 ]]; then
    return 0
  fi
  if [[ "$remote_hash" != "$LOCAL_LOCK_HASH" ]]; then
    return 0
  fi
  if ! remote "test -d ~/$rel/node_modules/next"; then
    return 0
  fi
  return 1
}

# Next 16 kompiluje next.config.ts → next.config.compiled.js i importuje
# ścieżki BEZ rozszerzenia. Wgranie lib/brand/*.ts NIE wystarczy (ERR_MODULE_NOT_FOUND).
# Favicony materializuje prebuild na Macu. Na s9 jedzie config BEZ tego importu.
pack_next_config() {
  local dest="$1"
  if [[ -f "$ROOT/next.config.ts" ]]; then
    awk '
      $0 ~ /from ["\047]\.\/lib\/brand\// { next }
      /^[[:space:]]*materializePackIcons\(\);[[:space:]]*$/ { next }
      { print }
    ' "$ROOT/next.config.ts" > "$dest"
    if grep -E 'from ["'"'"'].*lib/brand' "$dest" >/dev/null 2>&1; then
      echo "next.config.ts nadal importuje lib/brand po sanitacji — otwórz plik." >&2
      exit 1
    fi
  elif [[ -f "$ROOT/next.config.js" ]]; then
    cp "$ROOT/next.config.js" "$dest"
  elif [[ -f "$ROOT/next.config.mjs" ]]; then
    cp "$ROOT/next.config.mjs" "$dest"
  fi
}

wipe_compiled_cmds() {
  local rel="$1"
  printf 'rm -f ~/%s/next.config.compiled.js ~/%s/next.config.compiled.mjs ~/%s/.next/next.config.compiled.js; ' "$rel" "$rel" "$rel"
}

command -v rsync >/dev/null || { echo "Brak rsync w PATH." >&2; exit 1; }
command -v npm >/dev/null || { echo "Brak npm w PATH." >&2; exit 1; }

if grep -E 'from ["'"'"'].*lib/brand' "$ROOT"/next.config.* >/dev/null 2>&1; then
  echo "UWAGA: lokalny next.config importuje lib/brand. Na s9 wgram oczyszczoną kopię"
  echo "       (Passenger ładuje next.config.compiled.js i nie umie rozwiązać .ts)."
  echo "       Lokalnego pliku nie ruszam. Favicony: prebuild → tsx scripts/materialize-pack-icons.ts"
fi

LOCAL_LOCK_HASH="$(shasum -a 256 "$ROOT/package-lock.json" | awk '{print $1}')"

echo "==> SSH $HOST"
echo "    Wpisz hasło SSH (raz). Reszta (rsync, restart) jedzie na tym samym połączeniu."
"${SSH[@]}" -o BatchMode=no "$HOST" 'echo SSH_OK'

echo "==> env s9"
remote 'node -v; test -n "$SHIP_GAME_TYPESAFE_API_KEY" && echo KEY_OK || echo KEY_MISSING'
if ! remote 'test -n "$SHIP_GAME_TYPESAFE_API_KEY"'; then
  echo "KEY_MISSING — na s9: source ~/.bash_profile i sprawdź export. Stop." >&2
  exit 1
fi

curl_check() {
  echo "==> curl (max 25s na hit)"
  remote 'sleep 8; curl -sS --max-time 25 --retry 3 --retry-delay 8 --retry-all-errors -o /tmp/sinkjev-api.json -w "api_session %{http_code}\n" -H "Origin: https://api.sinkjev.com" https://api.sinkjev.com/api/jev/session; head -c 200 /tmp/sinkjev-api.json; echo; curl -sS --max-time 25 --retry 3 --retry-delay 8 --retry-all-errors -o /tmp/sinkjev-ui.json -w "ui_session %{http_code}\n" -H "Origin: https://sinkjev.com" https://sinkjev.com/api/jev/session; head -c 200 /tmp/sinkjev-ui.json; echo; curl -sS --max-time 25 --retry 2 --retry-delay 8 --retry-all-errors -o /dev/null -w "ui_home %{http_code}\n" https://sinkjev.com/'
}

if [[ "$FIX_CONFIG" -eq 1 ]]; then
  echo "==> --fix-config: next.config.ts + kasuję next.config.compiled.js (bez build)"
  TMPCFG="$(mktemp "${TMPDIR:-/tmp}/sinkjev-next.config.XXXXXX")"
  pack_next_config "$TMPCFG"
  echo "    pierwsze linie wgranego configu:"
  sed -n '1,8p' "$TMPCFG" | sed 's/^/    /'
  echo "==> rsync next.config.ts → $API_REL"
  rsync -avz -e "$RSYNC_RSH" "$TMPCFG" "$HOST:$API_REL/next.config.ts"
  echo "==> rsync next.config.ts → $UI_REL"
  rsync -avz -e "$RSYNC_RSH" "$TMPCFG" "$HOST:$UI_REL/next.config.ts"
  rm -f "$TMPCFG"
  echo "==> kasuję compiled.js + restart Passenger"
  remote "$(wipe_compiled_cmds "$API_REL")$(wipe_compiled_cmds "$UI_REL")devil www restart api.sinkjev.com; devil www restart sinkjev.com;"
  curl_check
  echo
  echo "Gotowe. 502 → poczekaj ~20 s (cold start) i odśwież https://sinkjev.com"
  echo "Logi: ssh $HOST 'tail -n 40 ~/domains/sinkjev.com/logs/error.log'"
  exit 0
fi

API_LOCK_HASH="$(remote_lock_hash "$API_REL")"
UI_LOCK_HASH="$(remote_lock_hash "$UI_REL")"
echo "    lock local=${LOCAL_LOCK_HASH:0:12}… api=${API_LOCK_HASH:0:12}… ui=${UI_LOCK_HASH:0:12}…"

if [[ ! -f app.js ]]; then
  echo "==> zapisuję app.js (Passenger)"
  write_app_js
fi

if [[ "$SKIP_BUILD" -eq 0 ]]; then
  echo "==> npm ci (Mac)"
  npm ci
  echo "==> npm run build (Mac) — na s9 tego nie ma"
  npm run build
fi

if [[ ! -f .next/BUILD_ID ]]; then
  echo "Brak .next/BUILD_ID — build nie wyszedł." >&2
  exit 1
fi

echo "==> dist $DIST"
rm -rf "$DIST"
mkdir -p "$DIST"
cp "$ROOT/package.json" "$ROOT/package-lock.json" "$ROOT/app.js" "$DIST/"
if [[ -f "$ROOT/next.config.ts" ]]; then
  pack_next_config "$DIST/next.config.ts"
elif [[ -f "$ROOT/next.config.js" ]]; then
  cp "$ROOT/next.config.js" "$DIST/"
elif [[ -f "$ROOT/next.config.mjs" ]]; then
  cp "$ROOT/next.config.mjs" "$DIST/"
fi
if [[ -d "$ROOT/public" ]]; then
  cp -R "$ROOT/public" "$DIST/public"
else
  mkdir -p "$DIST/public"
fi
rsync -a --delete --exclude cache "$ROOT/.next/" "$DIST/.next/"
rm -f "$DIST/public/index.html"
rm -f "$DIST/next.config.compiled.js" "$DIST/.next/next.config.compiled.js"

rsync_one() {
  local dest="$1"
  echo "==> rsync → $dest"
  rsync -avz --delete --exclude node_modules --exclude tmp -e "$RSYNC_RSH" "$DIST"/ "$HOST:$dest/"
}

rsync_one "$API_REL"
rsync_one "$UI_REL"

REMOTE_CMDS=""
for pair in "$API_REL|$API_LOCK_HASH" "$UI_REL|$UI_LOCK_HASH"; do
  rel="${pair%%|*}"
  hash="${pair#*|}"
  REMOTE_CMDS+="mkdir -p ~/$rel/tmp; rm -f ~/$rel/public/index.html; "
  REMOTE_CMDS+="$(wipe_compiled_cmds "$rel")"
  if need_install "$rel" "$hash"; then
    echo "==> na s9: npm ci --omit=dev w $rel"
    REMOTE_CMDS+="cd ~/$rel && npm ci --omit=dev; "
  else
    echo "==> $rel: lockfile i node_modules/next OK — pomijam npm"
  fi
done
REMOTE_CMDS+="devil www restart api.sinkjev.com; devil www restart sinkjev.com;"

echo "==> restart Passenger"
remote "$REMOTE_CMDS"

curl_check

echo
echo "Gotowe. 502 → poczekaj ~20 s (cold start) i odśwież https://sinkjev.com"
echo "Logi: ssh $HOST 'tail -n 40 ~/domains/sinkjev.com/logs/error.log'"
