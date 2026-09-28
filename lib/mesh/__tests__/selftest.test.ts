import { expect, test, jest } from '@jest/globals';
jest.mock('@/modules/pokket-mesh', () => ({ meshNative: () => null, parseMeshStatus: () => null }));
import { parseQuery, parseSelfTestParams } from '@/lib/mesh/selftest';
test('parses the self-test parameters a build carries', () => {
  expect(parseSelfTestParams(parseQuery('control=http%3A%2F%2F127.0.0.1%3A47001&key=tskey-auth-pokket-test&host=svc&port=8080&progress=http%3A%2F%2F127.0.0.1%3A47002%2Fprogress')))
    .toEqual({ control: 'http://127.0.0.1:47001', key: 'tskey-auth-pokket-test', host: 'svc', port: 8080, progress: 'http://127.0.0.1:47002/progress' });
});
