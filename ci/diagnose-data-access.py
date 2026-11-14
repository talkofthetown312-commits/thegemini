#!/usr/bin/env python3
"""Read-only diagnostics. No database/rule/auth mutations, tokens or records logged.
Verify the source of the actual TalkOS APK menu permission-denied screenshot.
"""
import hashlib
import json
import os
from pathlib import Path
import re
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

token = os.environ['GOOGLE_OAUTH_ACCESS_TOKEN']

def get(url):
    try:
        with urlopen(Request(url, headers={'Authorization': 'Bearer ' + token}), timeout=25) as response:
            return json.load(response)
    except HTTPError as error:
        return {'readError': error.code}

def count_collection(project, database, collection, fields):
    params = [('pageSize', '1000')] + [('mask.fieldPaths', field) for field in fields]
    base = f'https://firestore.googleapis.com/v1/projects/{project}/databases/{database}/documents/{collection}'
    count = 0
    master_ids = set()
    active = 0
    roles = {}
    while True:
        result = get(base + '?' + urlencode(params))
        if 'readError' in result:
            return result
        for record in result.get('documents', []):
            count += 1
            record_id = record['name'].rsplit('/', 1)[-1]
            if re.fullmatch(r'TOT-\d{3}', record_id):
                master_ids.add(record_id)
            values = record.get('fields', {})
            if collection == 'pos_products' and values.get('active', {}).get('booleanValue', True) and values.get('isAvailable', {}).get('booleanValue', True):
                active += 1
            if collection == 'users':
                for role in values.get('roles', {}).get('arrayValue', {}).get('values', []):
                    name = role.get('stringValue', '')
                    if name in ('OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'INVENTORY'):
                        roles[name] = roles.get(name, 0) + 1
        if not result.get('nextPageToken'):
            break
        params = [(key, value) for key, value in params if key != 'pageToken'] + [('pageToken', result['nextPageToken'])]
    summary = {'count': count}
    if collection == 'inventory_items':
        expected = {f'TOT-{i:03d}' for i in range(1, 145)}
        summary['masterIdsFound'] = len(master_ids & expected)
    if collection == 'pos_products':
        summary['activeAndAvailable'] = active
    if collection == 'users':
        summary['roleCounts'] = roles
    return summary

report = {'mode': 'READ_ONLY', 'writes': 0, 'databases': {}}
for project, database in (
    ('talkos-staging-default', '(default)'),
    ('gen-lang-client-0658820145', 'ai-studio-talkosarchitectu-438c4707-59bb-4b28-aa84-26b8ca15c574'),
):
    report['databases'][project + '/' + database] = {
        collection: count_collection(project, database, collection, fields)
        for collection, fields in (
            ('inventory_items', ['id']), ('inventory_categories', ['id']),
            ('pos_products', ['active', 'isAvailable']), ('menu_item_sizes', ['active']), ('users', ['roles'])
        )
    }
release = get('https://firebaserules.googleapis.com/v1/projects/talkos-staging-default/releases/cloud.firestore')
report['stagingRules'] = release if 'readError' in release else {'updatedAt': release.get('updateTime')}
if release.get('rulesetName'):
    ruleset = get('https://firebaserules.googleapis.com/v1/' + release['rulesetName'])
    if 'readError' in ruleset:
        report['stagingRules'].update(ruleset)
    else:
        source = '\n'.join(file.get('content', '') for file in ruleset.get('source', {}).get('files', []))
        report['stagingRules']['sha256'] = hashlib.sha256(source.encode()).hexdigest()
        # Print conditions only, never user-profile documents, tokens or credentials.
        report['stagingRules']['allowConditions'] = re.findall(r'allow\s+[^;]+;', source)
        report['stagingRules']['mentionsMenu'] = 'pos_products' in source
        report['stagingRules']['mentionsInventory'] = 'inventory_items' in source
Path('data-diagnosis.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
