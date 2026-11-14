#!/bin/zsh
# Installs Guitar Habit as a user LaunchAgent so it starts at login and restarts if it crashes.
# Run once:  ./install-service.sh      Remove:  ./install-service.sh uninstall
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
PLIST=~/Library/LaunchAgents/com.vj.guitar-habit.plist
if [[ "$1" == "uninstall" ]]; then
  launchctl bootout "gui/$(id -u)/com.vj.guitar-habit" 2>/dev/null || true
  rm -f "$PLIST"; echo "Guitar Habit service removed."; exit 0
fi
mkdir -p ~/Library/LaunchAgents "$DIR/data"
cp "$DIR/com.vj.guitar-habit.plist" "$PLIST"
launchctl bootout "gui/$(id -u)/com.vj.guitar-habit" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
sleep 1
echo "Guitar Habit is installed and running."
echo "On your phone (same Wi-Fi): http://$(scutil --get LocalHostName).local:4321"
echo "Log file: $DIR/data/server.log"
