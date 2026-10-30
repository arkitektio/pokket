import {describe, expect, it, jest} from '@jest/globals';
import * as React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import type {StoredProfile} from '@/lib/arkitekt/fakts/profileStorageSchema';
import type {BlokViewer} from '@arkitektio/bsx/runtime';
import {useBlokViewer} from '../useBlokViewer';

let mockProfile: StoredProfile | null = null;
jest.mock('@/lib/arkitekt/hooks', () => ({useActiveProfile: () => mockProfile}));

const login = (label: StoredProfile['label'], organizationId: string | null = 'org-1'): StoredProfile =>
  ({
    id: 'p',
    identity: {baseUrl: 'https://hub', userId: 'u-1', organizationId},
    label,
    status: 'ok',
    lastUsedAt: 0,
  }) as StoredProfile;

const render = (): {current: () => BlokViewer | null; rerender: () => void} => {
  let seen: BlokViewer | null = null;
  const Probe = () => {
    seen = useBlokViewer();
    return null;
  };
  let renderer: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(<Probe />);
  });
  return {
    current: () => seen,
    rerender: () => act(() => renderer.update(<Probe />)),
  };
};

describe('useBlokViewer', () => {
  it('is the login, with the roles lok gave it in the organization', () => {
    mockProfile = login({username: 'jo', roles: ['admin', 'bot']});
    expect(render().current()).toEqual({user: {id: 'u-1', username: 'jo'}, org: {id: 'org-1'}, roles: ['admin', 'bot']});
  });

  it('has no roles on a login that kept none, and no organization without one', () => {
    mockProfile = login({username: 'jo'}, null);
    expect(render().current()).toEqual({user: {id: 'u-1', username: 'jo'}, org: null, roles: []});
  });

  it('keeps its identity while the stored roles say the same thing', () => {
    mockProfile = login({roles: ['admin']});
    const viewer = render();
    const first = viewer.current();
    mockProfile = login({roles: ['admin']});
    viewer.rerender();
    expect(viewer.current()).toBe(first);
  });

  it('is nobody before lok has named the user', () => {
    mockProfile = {...login({}), identity: {baseUrl: 'https://hub', userId: null, organizationId: null}};
    expect(render().current()).toBeNull();
  });
});
