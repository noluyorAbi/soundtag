#!/usr/bin/env bash
# The house rule is that an em dash or en dash is never used as a substitute
# for punctuation. A rule nobody checks is a rule that drifts, so this is a
# gate. It reads source and prose, not generated output or dependencies.
#
# The two characters are built from their UTF-8 bytes rather than written out,
# so this file does not fail its own check.
set -uo pipefail
cd "$(dirname "$0")/.."

em=$'\xe2\x80\x94'
en=$'\xe2\x80\x93'

hits=$(grep -rn --binary-files=without-match -e "$em" -e "$en" \
  --include='*.ts' --include='*.tsx' --include='*.md' --include='*.mjs' \
  --include='*.json' --include='*.yml' --include='*.sh' --include='*.css' \
  . \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist \
  --exclude-dir=.git --exclude-dir=planning --exclude-dir=.vercel || true)

if [ -n "$hits" ]; then
  echo "em dash or en dash used as punctuation:"
  echo "$hits"
  echo
  echo "use a comma, a semicolon, a colon, a period or parentheses instead"
  exit 1
fi

echo "prose ok: no em dashes"
