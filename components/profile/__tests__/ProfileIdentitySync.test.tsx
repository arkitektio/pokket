import {describe, expect, it, jest} from '@jest/globals';
import * as React from 'react';
import {act, create} from 'react-test-renderer';
import {ProfileIdentitySync} from '../ProfileIdentitySync';

/**
 * lok's `mycontext` names the live login: its id, its labels, and the user's
 * roles in the organization, which a blok reads as `viewer.roles`.
 */

type Label = {roles?: string[]; username?: string};

const mockSetProfileIdentity = jest.fn<(id: string, update: {label?: Label}) => Promise<void>>(() => Promise.resolve());
let mockRoles: string[] | undefined = ['admin', 'bot'];

jest.mock('@/lib/app/App', () => ({
  App: {
    useProfileActions: () => ({setProfileIdentity: mockSetProfileIdentity}),
    useActiveProfile: () => ({identity: {baseUrl: 'https://hub'}}),
    useActiveProfileId: () => 'p1',
    useIsConnected: () => true,
  },
}));
jest.mock('@/lib/lok/api/graphql', () => ({
  useMyContextQuery: () => ({
    data: {
      mycontext: {
        organization: {id: 'o1', name: 'Lab', slug: 'lab'},
        user: {id: 'u1', username: 'jo'},
        roles: mockRoles,
        scope: [],
      },
    },
  }),
  useMyBrandQuery: () => ({data: undefined}),
  useMyHubQuery: () => ({data: undefined}),
}));
jest.mock('@/lib/theme/BrandProvider', () => ({resolveBrand: () => ({hue: 0, chroma: 0})}));

const render = async () => {
  await act(async () => {
    create(<ProfileIdentitySync />);
  });
};

describe('ProfileIdentitySync', () => {
  it("keeps the user's roles in the organization on the login's label", async () => {
    mockSetProfileIdentity.mockClear();
    mockRoles = ['admin', 'bot'];
    await render();
    expect(mockSetProfileIdentity).toHaveBeenCalledWith('p1', expect.objectContaining({label: expect.objectContaining({roles: ['admin', 'bot'], username: 'jo'})}));
  });

  it('keeps "no roles" as an empty list, and a lok that says nothing as nothing', async () => {
    mockSetProfileIdentity.mockClear();
    mockRoles = [];
    await render();
    expect(mockSetProfileIdentity.mock.calls[0][1].label?.roles).toEqual([]);

    mockSetProfileIdentity.mockClear();
    mockRoles = undefined;
    await render();
    expect(mockSetProfileIdentity.mock.calls[0][1].label).not.toHaveProperty('roles');
  });
});
