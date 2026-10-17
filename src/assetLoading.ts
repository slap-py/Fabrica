/** Bound preparation work without retaining additional decoded scenes in a global cache. */
export function createLoadQueue(signal: AbortSignal, concurrency = 2) {
  let active = 0;
  const pending: (() => void)[] = [];
  const pump = () => { while (active < concurrency && pending.length) pending.shift()!(); };
  return <T>(run: () => Promise<T>): Promise<T> => new Promise<T>((resolve, reject) => {
    const start = () => {
      signal.removeEventListener('abort', cancel);
      if (signal.aborted) { reject(signal.reason); return; }
      active++;
      Promise.resolve().then(() => { signal.throwIfAborted(); return run(); }).then(resolve, reject).finally(() => { active--; pump(); });
    };
    const cancel = () => { const index = pending.indexOf(start); if (index >= 0) pending.splice(index, 1); reject(signal.reason); };
    if (signal.aborted) { reject(signal.reason); return; }
    signal.addEventListener('abort', cancel, { once: true });
    pending.push(start); pump();
  });
}

/** Content-Length is encoded length when HTTP compression is used. Never use it
 * as the decoded buffer size or as a determinate progress total in that case. */
export async function readAssetBytes(response: Response, signal: AbortSignal,
  progress?: (loaded: number, total: number) => void): Promise<ArrayBuffer> {
  const length = Number(response.headers.get('content-length') || 0);
  const total = !response.headers.get('content-encoding') && Number.isSafeInteger(length) && length > 0 ? length : 0;
  const reader = response.body?.getReader();
  if (!reader) {
    const buffer = await response.arrayBuffer(); signal.throwIfAborted(); progress?.(buffer.byteLength, total); return buffer;
  }
  // Current assets fit this bound. Unknown or unexpectedly larger responses use
  // chunks, so an untrusted or stale header never triggers a large allocation.
  let buffer = total > 0 && total <= 32 * 1024 * 1024 ? new Uint8Array(total) : undefined;
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  try {
    for (;;) {
      signal.throwIfAborted();
      const { value, done } = await reader.read();
      if (done) break;
      if (buffer && loaded + value.length <= buffer.length) buffer.set(value, loaded);
      else {
        if (buffer) { chunks.push(buffer.subarray(0, loaded)); buffer = undefined; }
        chunks.push(value);
      }
      loaded += value.length; progress?.(loaded, total && loaded <= total ? total : 0);
    }
    signal.throwIfAborted();
    if (buffer) return loaded === buffer.length ? buffer.buffer : buffer.buffer.slice(0, loaded);
    if (chunks.length === 1) {
      const only = chunks[0]; return only.buffer.slice(only.byteOffset, only.byteOffset + only.byteLength) as ArrayBuffer;
    }
    const joined = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.length; }
    return joined.buffer;
  } finally {
    chunks.length = 0;
    if (signal.aborted) await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
