#!/usr/bin/env bash
# Ubuntu 23.10+ blocks unprivileged user namespaces for unknown binaries, which
# stops Chromium's sandbox (and so Electron) from starting:
#   "Zygote process exited prematurely"
# This installs an AppArmor profile that allows it for this project's Electron
# binary only, the same way Ubuntu's own profiles do for Chrome and VS Code.
# Run once (and again if you move the project): sudo ./scripts/setup-apparmor.sh
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Run with sudo: sudo $0" >&2
  exit 1
fi

project="$(cd "$(dirname "$0")/.." && pwd)"
binary="$project/node_modules/electron/dist/electron"
profile=/etc/apparmor.d/cyberdeck-player-electron

if [[ ! -x "$binary" ]]; then
  echo "Electron is not installed yet. Run npm install first." >&2
  exit 1
fi

cat > "$profile" <<EOF
# Allows Chromium's sandbox for Cyberdeck Player's Electron binary.
abi <abi/4.0>,
include <tunables/global>

profile cyberdeck-player-electron "$binary" flags=(unconfined) {
  userns,

  include if exists <local/cyberdeck-player-electron>
}
EOF

apparmor_parser -r "$profile"
echo "AppArmor profile loaded for $binary"
