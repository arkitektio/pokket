import {describe, expect, it, jest} from '@jest/globals';
import {disposeReplaced} from '../connection';

const service = () => ({client: {}, dispose: jest.fn()});

describe('a replaced connection', () => {
  it("closes the services it no longer carries, and leaves the ones it keeps open", () => {
    const rekuest = service();
    const mikro = service();
    const lok = service();
    const before = {serviceMap: {rekuest, mikro}, selfService: lok};
    // A failed check drops mikro: the others stay, by identity.
    const patched = {serviceMap: {rekuest}, selfService: lok};
    disposeReplaced(before, patched);
    expect(mikro.dispose).toHaveBeenCalledTimes(1);
    expect(rekuest.dispose).not.toHaveBeenCalled();
    expect(lok.dispose).not.toHaveBeenCalled();

    // Rebuilt whole, or signed out: every service of it goes.
    disposeReplaced(patched, undefined);
    expect(rekuest.dispose).toHaveBeenCalledTimes(1);
    expect(lok.dispose).toHaveBeenCalledTimes(1);
  });

  it('closes the rest when one will not close', () => {
    const broken = {client: {}, dispose: jest.fn(() => {
      throw new Error('stuck');
    })};
    const other = service();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    disposeReplaced({serviceMap: {broken, other}}, {serviceMap: {}});
    expect(other.dispose).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
