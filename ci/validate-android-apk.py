#!/usr/bin/env python3
"""Validate the actual distributable, not just Gradle's exit status."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import zipfile


def certificate_digest(output):
    # SDK releases use both "Signer #1" and "V2 Signer" prefixes.
    digests = {
        value.replace(':', '').lower()
        for value in re.findall(r'^.*certificate SHA-256 digest: ([0-9a-fA-F:]+)\s*$', output, re.M)
    }
    if len(digests) != 1 or not re.fullmatch(r'[0-9a-f]{64}', next(iter(digests), '')):
        raise ValueError('Expected exactly one unambiguous signing certificate')
    if not re.search(r'^Number of signers: 1\s*$', output, re.M):
        raise ValueError('Expected exactly one APK signer')
    return digests.pop()


def inspect_package(output):
    line = next((line for line in output.splitlines() if line.startswith('package: ')), '')
    fields = dict(re.findall(r"(\w+)='([^']*)'", line))
    if fields.get('name') != 'com.talkofthetown.pos':
        raise ValueError('Unexpected APK package identity')
    if 'launchable-activity:' not in output:
        raise ValueError('APK has no launchable activity')
    return fields


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('apk', type=Path)
    parser.add_argument('--version', required=True, type=int)
    parser.add_argument('--sdk', required=True, type=Path)
    parser.add_argument('--report', required=True, type=Path)
    args = parser.parse_args()
    build_tools = args.sdk / 'build-tools' / '35.0.0'

    def run(tool, *options):
        result = subprocess.run([str(build_tools / tool), *map(str, options)],
                                check=True, capture_output=True, text=True)
        return result.stdout

    signature = run('apksigner', 'verify', '--verbose', '--print-certs', args.apk)
    digest = certificate_digest(signature)
    expected = Path(__file__).with_name('staging-debug-cert.sha256').read_text().strip()
    if digest != expected:
        raise ValueError(f'APK signer {digest} differs from the retained staging certificate {expected}')
    if 'Verified using v2 scheme (APK Signature Scheme v2): true' not in signature:
        raise ValueError('APK Signature Scheme v2 is required')
    badging = run('aapt', 'dump', 'badging', args.apk)
    package = inspect_package(badging)
    if int(package['versionCode']) != args.version:
        raise ValueError('APK versionCode differs from the requested build version')
    run('zipalign', '-c', '-P', '16', '-v', '4', args.apk)
    with zipfile.ZipFile(args.apk) as archive:
        if archive.testzip() is not None:
            raise ValueError('Corrupt APK ZIP entry')
        for asset in ['AndroidManifest.xml', 'classes.dex', 'assets/public/index.html', 'assets/capacitor.config.json']:
            if not archive.read(asset):
                raise ValueError(f'Missing or empty packaged asset: {asset}')
    report = {
        'apk': args.apk.name, 'package': package['name'],
        'versionCode': args.version, 'certificateSha256': digest,
        'apkSha256': hashlib.sha256(args.apk.read_bytes()).hexdigest(),
        'apksigner': 'passed (v1/v2)', 'aapt': 'passed',
        'zipalign': 'passed (16 KB native alignment)', 'zipIntegrity': 'passed',
        'bundledWebApp': 'present',
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2) + '\n')
    args.report.with_suffix('.signature.txt').write_text(signature)
    args.report.with_suffix('.badging.txt').write_text(badging)
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
