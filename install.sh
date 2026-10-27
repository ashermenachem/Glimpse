#!/usr/bin/env bash
# Glimpse GPA installer. Created by Asher Menachem. MIT licensed.
set -Eeuo pipefail

REPO='https://github.com/ashermenachem/Glimpse'
ARCHIVE="$REPO/archive/refs/heads/main.tar.gz"
INSTALL_BASE="${GLIMPSE_INSTALL_ROOT:-$HOME/Downloads/Glimpse GPA}"
INSTALL_DIR="$INSTALL_BASE/extension"
MARKER="$INSTALL_BASE/.installed-by-glimpse"
TEMP_DIR=''
STAGE=''
BACKUP=''
FINISHED=0

if [[ -t 1 && -z "${NO_COLOR:-}" ]]; then
  blue=$'\033[38;2;75;135;255m'; soft=$'\033[38;2;140;154;174m'; bold=$'\033[1m'; reset=$'\033[0m'
else
  blue=''; soft=''; bold=''; reset=''
fi
say() { printf '%s\n' "$*"; }
fail() { printf '\n%s  ×%s  %s\n\n' "$blue" "$reset" "$*" >&2; exit 1; }
cleanup() {
  # Restore the previous installation if an update was interrupted mid-swap.
  if [[ "$FINISHED" != 1 && -n "$BACKUP" && -d "$BACKUP" && ! -e "$INSTALL_DIR" ]]; then mv "$BACKUP" "$INSTALL_DIR" || true; fi
  if [[ -n "$STAGE" && -d "$STAGE" ]]; then rm -rf -- "$STAGE"; fi
  if [[ -n "$TEMP_DIR" && -d "$TEMP_DIR" ]]; then rm -rf -- "$TEMP_DIR"; fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

say ''
if [[ -t 1 && -z "${NO_COLOR:-}" && -z "${GLIMPSE_REDUCED_MOTION:-}" ]]; then
  # A short blue gradient reveal, followed by a live spinner during the download.
  printf '       %s◌  %s' "$blue" "$bold"
  colors=(81 99 117 135 153 171 189)
  letters=(G L I M P S E)
  for i in 0 1 2 3 4 5 6; do
    printf '\033[38;5;%sm%s ' "${colors[$i]}" "${letters[$i]}"
    sleep 0.055
  done
  printf '%s\n' "$reset"
else
  say "${blue}       ◌  ${bold}G L I M P S E${reset}"
fi
say "${soft}          Your GPA, at a glance.${reset}"
say "${soft}          Created by Asher Menachem${reset}"
say ''

[[ "$(uname -s)" == Darwin || "${GLIMPSE_TEST_MODE:-}" == 1 ]] || fail 'This one-line setup currently supports macOS. See the README for manual installation.'
for cmd in curl tar mktemp; do command -v "$cmd" >/dev/null 2>&1 || fail "Missing required tool: $cmd"; done
[[ ! -e "$INSTALL_BASE" || -f "$MARKER" ]] || fail "A folder already exists at $INSTALL_BASE and was not created by Glimpse. No files were changed."
TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/glimpse-gpa.XXXXXXXX")" || fail 'Could not create a temporary folder.'

printf '  %s○%s  Getting Glimpse' "$blue" "$reset"
curl --fail --silent --show-error --location --connect-timeout 15 --max-time 120 "$ARCHIVE" --output "$TEMP_DIR/glimpse.tar.gz" &
download_pid=$!
if [[ -t 1 && -z "${NO_COLOR:-}" && -z "${GLIMPSE_REDUCED_MOTION:-}" ]]; then
  frames=('◐' '◓' '◑' '◒'); frame=0
  while kill -0 "$download_pid" 2>/dev/null; do
    printf '\r  %s%s%s  Getting Glimpse' "$blue" "${frames[$frame]}" "$reset"
    frame=$(( (frame + 1) % 4 )); sleep 0.12
  done
fi
if ! wait "$download_pid"; then printf '\n'; fail 'Download failed. Check your connection and try again.'; fi
printf '\r  %s✓%s  Downloaded Glimpse       \n' "$blue" "$reset"
tar -xzf "$TEMP_DIR/glimpse.tar.gz" -C "$TEMP_DIR" || fail 'Could not unpack the download.'
SOURCE="$TEMP_DIR/Glimpse-main/extension"
[[ -f "$SOURCE/manifest.json" && -f "$SOURCE/widget.js" && -f "$SOURCE/background.js" ]] || fail 'The download is missing extension files.'
mkdir -p "$INSTALL_BASE" || fail 'Could not create the install folder.'
STAGE="$INSTALL_BASE/.extension-new-$$"
BACKUP="$INSTALL_BASE/.extension-backup-$$"
[[ ! -e "$STAGE" && ! -e "$BACKUP" ]] || fail 'A temporary install folder already exists. Please try again.'
cp -R "$SOURCE" "$STAGE" || fail 'Could not prepare the extension files.'
if [[ -e "$INSTALL_DIR" ]]; then mv "$INSTALL_DIR" "$BACKUP" || fail 'Could not prepare the existing installation for update.'; fi
mv "$STAGE" "$INSTALL_DIR" || fail 'Could not finish copying the extension.'
STAGE=''
printf 'Glimpse GPA, created by Asher Menachem\n' > "$MARKER"
FINISHED=1
if [[ -d "$BACKUP" ]]; then rm -rf -- "$BACKUP"; fi
BACKUP=''
say "  ${blue}✓${reset}  Files are ready"
say ''
say "  ${bold}One last thing in Chrome${reset}"
say '  1  Turn on Developer mode in the top-right corner.'
say '  2  Click Load unpacked.'
say '  3  Select the extension folder in the Finder window, then click Open.'
say ''
say "  ${soft}Folder: $INSTALL_DIR${reset}"
say "  ${soft}Then open MyMilken → Progress once to load your GPA.${reset}"
say ''
if [[ "${GLIMPSE_TEST_MODE:-}" != 1 ]]; then
  if command -v open >/dev/null 2>&1; then
    open "$INSTALL_BASE" || true
    if ! open -a 'Google Chrome' 'chrome://extensions/' 2>/dev/null; then
      say '  Open Google Chrome and go to chrome://extensions/'
    fi
  else
    say '  Open Google Chrome and go to chrome://extensions/'
  fi
fi
say "  ${soft}Free & open source · $REPO${reset}"
say ''
