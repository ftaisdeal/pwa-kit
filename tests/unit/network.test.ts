import { beforeEach, describe, expect, it, vi } from 'vitest';
import { checkConnectivity } from '../../src/network';

describe('checkConnectivity', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="container"></div>';
    vi.stubGlobal('fetch', vi.fn());
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  });

  const status = () => document.getElementById('container');

  it('reports online when a test endpoint answers', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response());

    expect(await checkConnectivity()).toBe(true);
    expect(status()?.querySelector('span')?.className).toBe('green');
    expect(status()?.textContent).toContain('Online and connected');
  });

  it('reports limited connectivity when every endpoint fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('network'));

    expect(await checkConnectivity()).toBe(false);
    expect(status()?.querySelector('span')?.className).toBe('orange');
  });

  it('reports offline without trying the network', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

    expect(await checkConnectivity()).toBe(false);
    expect(status()?.querySelector('span')?.className).toBe('red');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does nothing when the status container is missing', async () => {
    document.body.replaceChildren();
    expect(await checkConnectivity()).toBeUndefined();
  });
});
