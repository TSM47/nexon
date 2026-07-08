#!/usr/bin/env bash
# Pobiera pixel-artowe assety w klimacie średniowiecznym (wygenerowane w Higgsfield).
# Uruchom na SWOIM komputerze z katalogu game/:  bash scripts/fetch-assets.sh
# Po pobraniu gra automatycznie użyje tej grafiki zamiast proceduralnego pixel-artu.
set -euo pipefail

DEST="$(cd "$(dirname "$0")/.." && pwd)/client/public/assets"
mkdir -p "$DEST"

CDN="https://d8j0ntlcm91z4.cloudfront.net/user_3FePjzyeygLCeb8PzJWUZtYZaoj"

declare -A ASSETS=(
  # Bohater: człowiek-łowca w zieleni (pixel art, wycięte tło)
  [player.png]="$CDN/hf_20260708_224530_c3c3a0ff-600e-4c93-a343-bb73afe93041.png"
  # NPC: stary kupiec w słomkowym kapeluszu (pixel art, wycięte tło)
  [npc.png]="$CDN/hf_20260708_224533_d8b4b8cb-e1bb-42ac-959a-3510298c1788.png"
  # Boss: mroczny rycerz w karmazynowej zbroi (pixel art, wycięte tło)
  [boss.png]="$CDN/hf_20260708_224536_e052354b-e11f-4e44-9b19-2cdb8f6ce780.png"
  # Mapa: słoneczna średniowieczna łąka z kamiennym kręgiem (pixel art, top-down)
  [floor.png]="$CDN/hf_20260708_224426_1925d66f-8968-407a-88c1-9828a890a84b.png"
)

for name in "${!ASSETS[@]}"; do
  echo "Pobieram $name ..."
  curl -fSL --retry 3 -o "$DEST/$name" "${ASSETS[$name]}"
done

echo "Gotowe. Assety w: $DEST"
echo "Uruchom 'npm run dev' i odśwież http://localhost:5173 (Cmd+Shift+R)."
