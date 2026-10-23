#!/usr/bin/env python3
"""Inspect the installed APK's real native viewport in both navigation modes."""
import json
from pathlib import Path
import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET

output = Path(sys.argv[1])
package = 'com.talkofthetown.pos'

def adb(*args):
    return subprocess.check_output(['adb', *args], text=True, timeout=30).strip()

assert adb('shell', 'getprop', 'ro.kernel.qemu') == '1', 'Disposable emulator required'
overlays = adb('shell', 'cmd', 'overlay', 'list')
results = []
for mode in ('threebutton', 'gestural'):
    overlay = 'com.android.internal.systemui.navbar.' + mode
    assert overlay in overlays, f'{mode} navigation overlay missing'
    adb('shell', 'cmd', 'overlay', 'enable-exclusive', '--category', overlay)
    adb('shell', 'am', 'force-stop', package)
    adb('shell', 'am', 'start', '-W', '-n', package + '/.MainActivity')
    time.sleep(4)
    adb('shell', 'uiautomator', 'dump', '/sdcard/talkos-insets.xml')
    xml = adb('shell', 'cat', '/sdcard/talkos-insets.xml')
    (output / f'insets-{mode}.xml').write_text(xml)
    root = ET.fromstring(xml)
    assert any('View saved inventory' in node.get('text', '')
               or 'View saved inventory' in node.get('content-desc', '')
               for node in root.iter('node')), (
        f'Updated Android UI missing in {mode}; an old web cache may still be active')
    # Chromium's accessibility provider omits the native resource-id once the
    # HTML tree is exposed. The outermost app-owned WebView is still identified
    # by its class; XML preorder selects it before the virtual HTML WebView.
    webview = next((node for node in root.iter('node')
                    if node.get('class') == 'android.webkit.WebView'
                    and node.get('package') == package), None)
    assert webview is not None, f'App WebView missing in {mode}; inspect insets-{mode}.xml'
    bounds = [int(value) for value in re.findall(r'\d+', webview.get('bounds'))]
    sizes = re.findall(r'(\d+)x(\d+)', adb('shell', 'wm', 'size'))
    width, height = map(int, sizes[-1])
    left, top, right, bottom = bounds
    assert 0 <= left < right <= width, bounds
    assert 0 < top < bottom < height, f'WebView overlaps system bars in {mode}: {bounds}, screen {width}x{height}'
    results.append({'mode': mode, 'screen': [width, height], 'webview': bounds,
                    'topClearancePx': top, 'bottomClearancePx': height - bottom})
    with (output / f'navigation-{mode}.png').open('wb') as screenshot:
        subprocess.run(['adb', 'exec-out', 'screencap', '-p'], stdout=screenshot, check=True)
    print(f'PASS: {mode}: WebView {bounds}, top clearance {top}px, bottom clearance {height - bottom}px')
(output / 'system-navigation.json').write_text(json.dumps(results, indent=2) + '\n')
