#!/usr/bin/env bash
# tools/portrait-from-photo.sh, generate an ASCII portrait + text block for a persona.
#
# Usage:
#   ./tools/portrait-from-photo.sh <image> "<NAME>" "<firm/role>" "<signature quote>" [-g <gravity>] [-w <cols>] [-h <rows>]
#
# Required args (positional):
#   <image>            Path to source photo (jpg, png, webp, etc.)
#   <NAME>             Persona's display name, e.g. "Doug Leone"
#   <firm/role>        Subtitle, e.g. "Sequoia Capital · letter-grade verdicts"
#   <signature quote>  One-line quote, e.g. "A, F, F, A"
#
# Optional flags:
#   -g <gravity>   Crop gravity for face focus (default: center). Try: north, northwest, center.
#   -w <cols>      ASCII width (default: 46)
#   -h <rows>      ASCII height (default: 18)
#
# Output goes to stdout. Redirect to the persona's portrait file:
#
#   ./tools/portrait-from-photo.sh photo.jpg "Doug Leone" \
#       "Sequoia Capital · letter-grade verdicts" "A, F, F, A" \
#       > core/personas/doug-leone.txt
#
# Requirements: chafa, magick (ImageMagick).
#   brew install chafa imagemagick

set -euo pipefail

GRAVITY="center"
WIDTH=46
HEIGHT=18

# Parse optional flags first
ARGS=()
while [ "$#" -gt 0 ]; do
  case "$1" in
    -g) GRAVITY="$2"; shift 2 ;;
    -w) WIDTH="$2";   shift 2 ;;
    -h) HEIGHT="$2";  shift 2 ;;
    *)  ARGS+=("$1"); shift ;;
  esac
done

if [ "${#ARGS[@]}" -lt 4 ]; then
  echo "Usage: $0 <image> \"<NAME>\" \"<firm/role>\" \"<signature quote>\" [-g gravity] [-w cols] [-h rows]" >&2
  exit 1
fi

IMAGE="${ARGS[0]}"
NAME="${ARGS[1]}"
SUBTITLE="${ARGS[2]}"
QUOTE="${ARGS[3]}"

if ! command -v chafa >/dev/null 2>&1; then
  echo "chafa not found. Install: brew install chafa" >&2; exit 1
fi
if ! command -v magick >/dev/null 2>&1; then
  echo "ImageMagick not found. Install: brew install imagemagick" >&2; exit 1
fi
if [ ! -f "$IMAGE" ]; then
  echo "Image file not found: $IMAGE" >&2; exit 1
fi

TMP=$(mktemp -t arena-portrait.XXXXXX).jpg
trap "rm -f '$TMP'" EXIT

# Square-crop to face area + normalize contrast.
# Resize so the smaller side is 800px, then crop a square from the requested gravity.
magick "$IMAGE" \
  -resize 800x800^ \
  -gravity "$GRAVITY" \
  -extent 800x800 \
  -normalize \
  "$TMP"

# Render the portrait
chafa --symbols block --colors none --size "${WIDTH}x${HEIGHT}" --invert "$TMP"

# Append the text block (two-space indent matches the entrance() ui).
echo
echo "  $NAME"
echo "  $SUBTITLE"
echo "  \"$QUOTE\""
