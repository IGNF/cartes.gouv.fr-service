import { describe, it, expect, beforeEach } from 'vitest';
import { setMixin, getMixins, applyMixins } from '../ExtendMixin';

// Réinitialisation du tableau de mixins entre chaque test via un mixin vide
// (le tableau est un module-level state, on le purge en réimportant via vi.resetModules)
import { vi } from 'vitest';

describe('setMixin / getMixins', () => {
  beforeEach(async () => {
    vi.resetModules();
  });

  it('getMixins retourne un tableau vide au départ', async () => {
    const { getMixins } = await import('../ExtendMixin?t=' + Date.now());
    expect(getMixins()).toEqual([]);
  });

  it('setMixin ajoute un mixin à la liste', async () => {
    const { setMixin, getMixins } = await import('../ExtendMixin?t=' + Date.now());
    const mixin = { hello: () => 'world' };
    setMixin(mixin);
    expect(getMixins()).toHaveLength(1);
    expect(getMixins()[0]).toBe(mixin);
  });

  it('setMixin accumule plusieurs mixins', async () => {
    const { setMixin, getMixins } = await import('../ExtendMixin?t=' + Date.now());
    setMixin({ a: 1 });
    setMixin({ b: 2 });
    expect(getMixins()).toHaveLength(2);
  });
});

describe('applyMixins', () => {
  it('applique une méthode sur le service en la liant', () => {
    const service = {};
    const mixin = { greet() { return 'bonjour'; } };
    setMixin(mixin);
    applyMixins(service);
    expect(typeof service.greet).toBe('function');
    expect(service.greet()).toBe('bonjour');
  });

  it('copie un tableau (pas de référence partagée)', () => {
    const service = {};
    const original = [1, 2, 3];
    setMixin({ items: original });
    applyMixins(service);
    expect(service.items).toEqual([1, 2, 3]);
    expect(service.items).not.toBe(original);
  });

  it('copie un objet (pas de référence partagée)', () => {
    const service = {};
    const original = { x: 10 };
    setMixin({ config: original });
    applyMixins(service);
    expect(service.config).toEqual({ x: 10 });
    expect(service.config).not.toBe(original);
  });

  it('affecte une valeur primitive directement', () => {
    const service = {};
    setMixin({ version: 42 });
    applyMixins(service);
    expect(service.version).toBe(42);
  });
});
