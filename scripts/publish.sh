#!/usr/bin/env bash
# Publish three-phone to npm using the token in .env/keys.txt.
# The token is written to a throwaway npmrc for this one command only, so it
# never lands in ~/.npmrc and is never committed.
set -euo pipefail
cd "$(dirname "$0")/.."

TOKEN_FILE=".env/keys.txt"
if [ ! -f "$TOKEN_FILE" ]; then
  echo "✗ Missing $TOKEN_FILE — create it with: NPM_TOKEN=<your npm token>"
  exit 1
fi

# Load NPM_TOKEN from the file (ignores # comments and blank lines).
set -a
# shellcheck disable=SC1090
. "$TOKEN_FILE"
set +a

if [ -z "${NPM_TOKEN:-}" ]; then
  echo "✗ NPM_TOKEN is empty in $TOKEN_FILE — paste your npm token after NPM_TOKEN="
  exit 1
fi

TMP_NPMRC="$(mktemp)"
trap 'rm -f "$TMP_NPMRC"' EXIT
printf '//registry.npmjs.org/:_authToken=%s\n' "$NPM_TOKEN" > "$TMP_NPMRC"

echo "→ Publishing $(node -p "require('./package.json').name")@$(node -p "require('./package.json').version") to npm…"
# prepublishOnly rebuilds dist/; publishConfig sets access=public + the registry.
npm publish --userconfig "$TMP_NPMRC" "$@"
echo "✓ Published. Verify: npm view three-phone version"
