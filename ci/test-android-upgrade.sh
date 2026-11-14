#!/usr/bin/env bash
set -euo pipefail
baseline="$1"
candidate="$2"
report_dir="$3"
previous="${4:-}"
package=com.talkofthetown.pos
mkdir -p "$report_dir"
exec > >(tee "$report_dir/install-upgrade.txt") 2>&1
# This script only operates on a disposable emulator, never a staff device.
test "$(adb shell getprop ro.kernel.qemu | tr -d '\r')" = 1
adb wait-for-device
adb shell getprop ro.build.version.release
adb shell getprop ro.build.version.sdk
if [ -n "$previous" ] && [ -f "$previous" ]; then
  adb install --no-streaming "$previous"
  # Exercise a real used installation, including the old PWA worker/cache.
  # Installing an APK without opening it does not cover stale WebView updates.
  adb shell am start -W -n "$package/.MainActivity"
  sleep 20
  adb shell am force-stop "$package"
  adb shell run-as "$package" mkdir -p files
  printf 'TalkOS-previous-install-survives' | adb shell "run-as $package sh -c 'cat > files/previous-upgrade-check'"
  adb install --no-streaming -r "$baseline"
  test "$(adb shell run-as "$package" cat files/previous-upgrade-check | tr -d '\r')" = TalkOS-previous-install-survives
  echo 'PASS: upgrade from the oldest retained validated APK with private data preserved.'
else
  adb install --no-streaming "$baseline"
  echo 'Prior published APK not available; testing consecutive independent builds.'
fi
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
# UI hierarchy capture is auxiliary evidence. On Android 16 this may
# exhaust the hosted runner after installation and upgrade have already passed.
# Never discard successful install/upgrade results because of this optional step.
if timeout 20s adb shell uiautomator dump /sdcard/talkos-window.xml; then
  timeout 15s adb pull /sdcard/talkos-window.xml "$report_dir/window.xml" ||
    echo 'Optional UI XML capture unavailable; install/upgrade evidence is intact.'
else
  echo 'Optional UI hierarchy capture unavailable; install/upgrade evidence is intact.'
fi
python ci/test-android-insets.py "$report_dir"
echo 'PASS: fresh installation, in-place upgrade, private data preservation, and launch on Android emulator.'
echo 'Physical-device installation: NOT TESTED. Account login: NOT TESTED (no credentials used).'
