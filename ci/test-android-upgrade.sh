#!/usr/bin/env bash
set -euo pipefail
baseline="$1"
candidate="$2"
report_dir="$3"
package=com.talkofthetown.pos
mkdir -p "$report_dir"
exec > >(tee "$report_dir/install-upgrade.txt") 2>&1
# This script only operates on a disposable emulator, never a staff device.
test "$(adb shell getprop ro.kernel.qemu | tr -d '\r')" = 1
adb wait-for-device
adb shell getprop ro.build.version.release
adb shell getprop ro.build.version.sdk
adb install --no-streaming "$baseline"
adb shell run-as "$package" mkdir -p files
printf 'TalkOS-upgrade-data-survives' | adb shell "run-as $package sh -c 'cat > files/upgrade-check'"
adb install --no-streaming -r "$candidate"
test "$(adb shell run-as "$package" cat files/upgrade-check | tr -d '\r')" = TalkOS-upgrade-data-survives
adb shell dumpsys package "$package" > "$report_dir/installed-package.txt"
adb logcat -c
adb shell am start -W -n "$package/.MainActivity" | tee "$report_dir/launch.txt"
grep -q 'Status: ok' "$report_dir/launch.txt"
# Allow the bundled WebView to initialize before checking for native crashes.
sleep 15
adb shell pidof "$package"
adb logcat -d -b crash > "$report_dir/crashes.txt"
if grep -q "Process: $package" "$report_dir/crashes.txt"; then
  cat "$report_dir/crashes.txt"
  exit 1
fi
adb exec-out screencap -p > "$report_dir/launch.png"
adb logcat -d -s Capacitor Capacitor/Console chromium > "$report_dir/webview.txt"
adb shell uiautomator dump /sdcard/talkos-window.xml
adb pull /sdcard/talkos-window.xml "$report_dir/window.xml"
echo 'PASS: fresh installation, in-place upgrade, private data preservation, and launch on Android emulator.'
echo 'Physical-device installation: NOT TESTED. Account login: NOT TESTED (no credentials used).'
