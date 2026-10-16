import { describe, expect, it } from '@jest/globals';
import { blokView, blokViewContexts } from '../views';

describe('blok views', () => {
  it('keeps logos out of the default view', () => {
    const view = blokView(undefined);
    expect(view.key).toBe('interfaces');
    expect(blokViewContexts(view)).toEqual(['HTML', 'SCENE']);
  });

  it('asks for logos alone under logos, and for every context under all', () => {
    expect(blokViewContexts(blokView('logos'))).toEqual(['LOGO', 'ACTION_LOGO']);
    expect(blokViewContexts(blokView('all'))).toBeUndefined();
  });

  it('reads an unknown view as the default', () => {
    expect(blokView('nonsense').key).toBe('interfaces');
  });
});
