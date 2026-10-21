/* Klient silnika: kolejka wywołań do wątku Pyodide i zadania długie liczone porcjami. */
export const ENGINE_VERSION = '1.3.0';

export class EngineError extends Error {
  constructor(res) {
    super(res.message || 'Błąd silnika');
    this.kind = res.kind || 'engine';
    this.trace = res.trace || '';
  }
}

export function createEngine(onStatus) {
  // Wątek leży w public/engine/, więc ta sama ścieżka działa w trybie deweloperskim i po zbudowaniu.
  const worker = new Worker(new URL('engine/worker.js?v=' + ENGINE_VERSION, document.baseURI), { type: 'module' });
  const pending = new Map();
  let seq = 0;
  let readyResolve, readyReject;
  const ready = new Promise((res, rej) => { readyResolve = res; readyReject = rej; });

  worker.onmessage = (e) => {
    const m = e.data;
    if (m.type === 'status') { onStatus && onStatus({ status: m.stage === 'ready' ? 'ready' : 'loading', stage: m.stage, progress: m.progress, text: m.text }); return; }
    if (m.type === 'ready') { onStatus && onStatus({ status: 'ready', progress: 1, versions: m.versions, text: 'Silnik gotowy' }); readyResolve(m.versions); return; }
    if (m.type === 'fatal') { onStatus && onStatus({ status: 'error', error: m.message, text: m.message }); readyReject(new Error(m.message)); return; }
    if (m.type === 'result') {
      const p = pending.get(m.id);
      if (!p) return;
      pending.delete(m.id);
      if (m.ok) p.resolve(m.result); else p.reject(new EngineError(m));
    }
  };
  worker.onerror = (e) => { onStatus && onStatus({ status: 'error', error: e.message || 'Wątek obliczeń zakończył się błędem.' }); };

  const engineUrl = new URL('engine/', document.baseURI).href;
  worker.postMessage({ type: 'init', engineUrl, version: ENGINE_VERSION });

  function send(msg, transfer) {
    const id = ++seq;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      worker.postMessage(Object.assign({ id }, msg), transfer || []);
    });
  }

  async function call(fn, args) { await ready; return send({ type: 'call', fn, args: args || {} }); }

  async function uploadFile(name, bytes, args) {
    await ready;
    const buf = bytes instanceof ArrayBuffer ? bytes : bytes.buffer;
    const copy = buf.slice(0);
    return send({ type: 'file', name, bytes: copy, args: args || {} }, [copy]);
  }

  /* Zadanie długie: start → porcje → wynik. onProgress(done, total, preview); signal.cancelled przerywa. */
  async function runJob(kind, params, { onProgress, signal, chunk, previewEvery, resultArgs } = {}) {
    const start = await call('job_start', { kind, params });
    const id = start.id;
    let step = { done: 0, total: start.total, finished: start.total === 0 };
    let n = 0;
    try {
      while (!step.finished) {
        if (signal && signal.cancelled) { await call('job_drop', { id }); return { cancelled: true, preview: start.preview }; }
        step = await call('job_step', { id, chunk: chunk || 10 });
        n += 1;
        let preview;
        if (previewEvery && n % previewEvery === 0) preview = await call('job_result', { id });
        onProgress && onProgress(step.done, step.total, preview, step.elapsed);
      }
      const result = resultArgs
        ? await Promise.all(resultArgs.map((a) => call('job_result', Object.assign({ id }, a))))
        : await call('job_result', { id });
      return { cancelled: false, result, preview: start.preview };
    } finally {
      call('job_drop', { id }).catch(() => {});
    }
  }

  return { ready, call, uploadFile, runJob, terminate: () => worker.terminate() };
}
