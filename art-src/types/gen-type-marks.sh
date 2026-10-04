#!/usr/bin/env bash
# Generates the item type marks with the Codex CLI's image generation, into
# generated/. Run tools/make-type-marks.mjs afterwards to trace them.
#
# A near-copy of gluniverse-vtt's apps/web/art-src/daggerheart/gen-icon.sh, and
# deliberately so: the style paragraph below is that file's, word for word. It
# was written from the domain sigils the cards already wear, which is why a
# class sigil reads as the same family as a domain plate — and why these do.
# If upstream's paragraph changes, change this one with it.
#
# Usage: ./gen-type-marks.sh loot
#        ./gen-type-marks.sh --all -n 3
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
out="$here/generated"
subjects="$here/subjects.tsv"

style='Style, identical for every emblem in this set: a minimalist fantasy game sigil in the manner of a bold tribal brand mark. One single flat shape in pure white on a fully transparent background: no gradients, no shading, no outline, no glow, no texture, no bevel, no 3D, no second colour. A heavy, confident silhouette built from a few large sweeping strokes that taper to sharp calligraphic points, hooks and spikes. Every interior detail is cut out as thin negative-space slits and gaps through the white, never drawn as lines on top. Few large shapes, clearly readable at 24 pixels. Crisp vector-like edges. Square image, emblem centred with generous padding, no text, no letters, no frame, no circle or badge behind it.'

subject_of() { awk -F'\t' -v n="$1" '!/^#/ && $1 == n { print $2; exit }' "$subjects"; }
all_names()  { awk -F'\t' '!/^#/ && NF { print $1 }' "$subjects"; }

one() {
  local label="$1" subject="$2"
  mkdir -p "$out"
  echo "==> $label"
  codex exec --skip-git-repo-check --sandbox workspace-write -C "$out" \
    "Use your image generation tool to create one image: $subject. $style Save the PNG in the current directory as $label.png, then reply with its path only."
}

variants=1
names=()
while [ $# -gt 0 ]; do
  case "$1" in
    -n) variants="$2"; shift 2 ;;
    --all) while read -r n; do names+=("$n"); done < <(all_names); shift ;;
    *) names+=("$1"); shift ;;
  esac
done
[ ${#names[@]} -gt 0 ] || { echo "usage: gen-type-marks.sh <name>... | --all [-n N]" >&2; exit 2; }

for name in "${names[@]}"; do
  subject="$(subject_of "$name")"
  [ -n "$subject" ] || { echo "no subject for '$name' in subjects.tsv" >&2; exit 2; }
  if [ "$variants" -eq 1 ]; then one "$name" "$subject"
  else for i in $(seq 1 "$variants"); do one "$name-v$i" "$subject"; done; fi
done
