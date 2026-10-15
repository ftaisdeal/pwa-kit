import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { log } from '../../src/logger';

describe('log', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('prints debug output in development', () => {
    log.debug('hello', 1);
    expect(console.log).toHaveBeenCalledWith('hello', 1);
  });

  it('is silent for debug output in production', () => {
    vi.stubEnv('DEV', false);
    log.debug('hello');
    expect(console.log).not.toHaveBeenCalled();
  });

  it('always prints warnings and errors', () => {
    vi.stubEnv('DEV', false);
    log.warn('careful');
    log.error('broken');
    expect(console.warn).toHaveBeenCalledWith('careful');
    expect(console.error).toHaveBeenCalledWith('broken');
  });
});
