import assert from 'node:assert/strict';
import test from 'node:test';

import { parseIncomingAppUrl, toInAppPath } from './deeplink';

test('parses custom scheme invite links', () => {
  const result = parseIncomingAppUrl('branches://invite/abc123?foo=1#frag');
  assert.deepEqual(result, {
    pathname: '/invite/abc123',
    search: '?foo=1',
    hash: '#frag',
  });
});

test('parses hosted invite links', () => {
  const result = parseIncomingAppUrl('https://branches-azure.vercel.app/invite/xyz');
  assert.deepEqual(result, {
    pathname: '/invite/xyz',
    search: '',
    hash: '',
  });
});

test('returns null for unrelated hosts', () => {
  const result = parseIncomingAppUrl('https://example.com/invite/xyz');
  assert.equal(result, null);
});

test('builds in-app path from supported URLs', () => {
  assert.equal(
    toInAppPath('branches://invite/xyz?from=messages'),
    '/invite/xyz?from=messages'
  );
});
