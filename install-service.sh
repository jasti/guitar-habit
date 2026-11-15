#!/bin/zsh
# Installs Guitar Habit as a macOS user LaunchAgent so it starts at login and restarts if it crashes.
# Run once:  ./install-service.sh      Remove:  ./install-service.sh uninstall
set -e
LABEL=com.guitar-habit.server
DIR="$(cd "$(dirname "$0")" && pwd)"
PLIST=~/Library/LaunchAgents/$LABEL.plist
PORT="${PORT:-4321}"

if [[ "$1" == "uninstall" ]]; then
  launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
  rm -f "$PLIST"; echo "Guitar Habit service removed."; exit 0
fi

NODE="$(command -v node || true)"
if [[ -z "$NODE" ]]; then echo "node not found on PATH. Install Node.js 18 or newer first."; exit 1; fi

mkdir -p ~/Library/LaunchAgents "$DIR/data"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE</string>
    <string>$DIR/server.js</string>
  </array>
  <key>WorkingDirectory</key><string>$DIR</string>
  <key>EnvironmentVariables</key><dict><key>PORT</key><string>$PORT</string></dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$DIR/data/server.log</string>
  <key>StandardErrorPath</key><string>$DIR/data/server.log</string>
</dict>
</plist>
EOF

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
sleep 1
echo "Guitar Habit is installed and running."
echo "On your phone (same Wi-Fi): http://$(scutil --get LocalHostName).local:$PORT"
echo "Log file: $DIR/data/server.log"
