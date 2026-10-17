import { describe, expect, it } from 'vitest';
import { createLoadQueue, readAssetBytes } from '../src/assetLoading';

function response(chunks: number[][], headers: Record<string, string> = {}) {
  return new Response(new ReadableStream<Uint8Array>({ start(controller) {
    chunks.forEach(chunk => controller.enqueue(Uint8Array.from(chunk))); controller.close();
  } }), { headers });
}
describe('bounded asset loading', () => {
  it('preserves bytes with known, absent, inaccurate and encoded content lengths', async () => {
    for (const headers of [{}, {'content-length':'5'}, {'content-length':'2'}, {'content-length':'20'},
      {'content-length':'2','content-encoding':'gzip'}, {'content-length':'999999999999'}]) {
      const progress: number[] = [];
      const bytes = await readAssetBytes(response([[1,2],[3],[4,5]], headers as Record<string,string>), new AbortController().signal, (_loaded,total) => progress.push(total));
      expect([...new Uint8Array(bytes)]).toEqual([1,2,3,4,5]);
      if ('content-encoding' in headers) expect(progress.every(total => total === 0)).toBe(true);
    }
  });
  it('bounds concurrent preparation and rejects queued work when the viewer closes', async () => {
    const abort = new AbortController(), queue = createLoadQueue(abort.signal, 2);
    const releases: (() => void)[] = [];
    let active = 0, maximum = 0, started = 0;
    const run = () => queue(async () => { started++; active++; maximum = Math.max(maximum, active);
      await new Promise<void>(resolve => releases.push(resolve)); active--; return started; });
    const a = run(), b = run(), c = run();
    const cancelled = expect(c).rejects.toMatchObject({name:'AbortError'});
    await Promise.resolve(); expect(started).toBe(2);
    abort.abort(); await cancelled;
    releases.forEach(release => release()); await Promise.all([a,b]);
    expect(maximum).toBe(2); expect(started).toBe(2);
  });
  it('cancels a stream instead of parsing a partial model', async () => {
    const abort = new AbortController();
    const pending = readAssetBytes(response([[1],[2]]), abort.signal, () => abort.abort());
    await expect(pending).rejects.toMatchObject({name:'AbortError'});
  });
});
