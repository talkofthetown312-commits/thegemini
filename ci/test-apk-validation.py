import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('apk', Path(__file__).with_name('validate-android-apk.py'))
apk = importlib.util.module_from_spec(spec)
spec.loader.exec_module(apk)


class ApkValidationTests(unittest.TestCase):
    def test_old_and_new_sdk_certificate_formats(self):
        for prefix in ['Signer #1', 'V2 Signer']:
            self.assertEqual(apk.certificate_digest(f'Number of signers: 1\n{prefix} certificate SHA-256 digest: {"a" * 64}\n'), 'a' * 64)

    def test_missing_or_ambiguous_certificates_fail_closed(self):
        for output in ['', 'Number of signers: 1\n', f'Number of signers: 2\nSigner #1 certificate SHA-256 digest: {"a" * 64}\n',
                       f'Number of signers: 1\nV2 Signer certificate SHA-256 digest: {"a" * 64}\nV3 Signer certificate SHA-256 digest: {"b" * 64}\n']:
            with self.assertRaises(ValueError):
                apk.certificate_digest(output)

    def test_public_key_digest_is_not_a_certificate(self):
        with self.assertRaises(ValueError):
            apk.certificate_digest(f'Number of signers: 1\nSigner #1 public key SHA-256 digest: {"a" * 64}\n')

    def test_package_and_launcher_are_required(self):
        valid = "package: name='com.talkofthetown.pos' versionCode='2003'\nlaunchable-activity: name='com.talkofthetown.pos.MainActivity'"
        self.assertEqual(apk.inspect_package(valid)['versionCode'], '2003')
        for output in [valid.replace('com.talkofthetown.pos', 'com.example.wrong'), valid.splitlines()[0]]:
            with self.assertRaises(ValueError):
                apk.inspect_package(output)


if __name__ == '__main__':
    unittest.main()
