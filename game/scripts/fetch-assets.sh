#!/usr/bin/env bash
# Pobiera malowane assety (wygenerowane w Higgsfield) do klienta gry.
# Uruchom na SWOIM komputerze z katalogu game/:  bash scripts/fetch-assets.sh
# Po pobraniu gra automatycznie użyje grafiki AI zamiast pixel-artu (wystarczy odświeżyć).
set -euo pipefail

DEST="$(cd "$(dirname "$0")/.." && pwd)/client/public/assets"
mkdir -p "$DEST"

CDN="https://d8j0ntlcm91z4.cloudfront.net/user_3FePjzyeygLCeb8PzJWUZtYZaoj"

declare -A ASSETS=(
  [player.png]="$CDN/hf_20260626_011130_4e6775b5-16c0-4b45-89b7-aaf842b26f10.png"
  [boss.png]="$CDN/hf_20260626_011133_5270edd6-9d3d-4c95-805f-bdb0ccded533.png"
  [floor.png]="$CDN/hf_20260626_010928_72c73f1f-f15d-4c32-9773-3f1bf7e360ee.png"
)

for name in "${!ASSETS[@]}"; do
  echo "Pobieram $name ..."
  curl -fSL --retry 3 -o "$DEST/$name" "${ASSETS[$name]}"
done

echo "Gotowe. Assety w: $DEST"
echo "Uruchom 'npm run dev' i odśwież http://localhost:5173 (Ctrl+Shift+R)."
