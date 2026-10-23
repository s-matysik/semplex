/* Engine client: call queue for the Pyodide thread and long tasks computed in chunks. */
import { getLang } from '../i18n/index.js';

/* Computation thread messages are in Polish; we translate them here (the thread doesn't know the interface language). */
function statusText(s) {
  const m = /^(.*)\(Pyodide ([^)]+)\)$/.exec(s || '');
  return m ? t(m[1] + '(Pyodide {0})', { 0: m[2] }) : t(s);
}
import { t } from '../i18n/index.js';
export const ENGINE_VERSION = '1.3.0';

export class EngineError extends Error {
  constructor(res) {
    super(res.message || t("Błąd silnika"));
    this.kind = res.kind || 'engine';
    this.trace = res.trace || '';
  }
}

export function createEngine(onStatus) {
  // The thread lives in public/engine/, so the same path works in dev mode and after building.
  const worker = new Worker(new URL('engine/worker.js?v=' + ENGINE_VERSION, document.baseURI), { type: 'module' });
  const pending = new Map();
  let seq = 0;
  let readyResolve, readyReject;
  const ready = new Promise((res, rej) => { readyResolve = res; readyReject = rej; });

  worker.onmessage = (e) => {
    const m = e.data;
    if (m.type === 'status') { onStatus && onStatus({ status: m.stage === 'ready' ? 'ready' : 'loading', stage: m.stage, progress: m.progress, text: statusText(m.text) }); return; }
    if (m.type === 'ready') { onStatus && onStatus({ status: 'ready', progress: 1, versions: m.versions, text: t("Silnik gotowy") }); readyResolve(m.versions); return; }
    if (m.type === 'fatal') { onStatus && onStatus({ status: 'error', error: m.message, text: m.message }); readyReject(new Error(m.message)); return; }
    if (m.type === 'result') {
      const p = pending.get(m.id);
      if (!p) return;
      pending.delete(m.id);
      if (m.ok) p.resolve(m.result); else p.reject(new EngineError(m));
    }
  };
  worker.onerror = (e) => { onStatus && onStatus({ status: 'error', error: e.message || t("Wątek obliczeń zakończył się błędem.") }); };

  const engineUrl = new URL('engine/', document.baseURI).href;
  worker.postMessage({ type: 'init', engineUrl, version: ENGINE_VERSION });

  function send(msg, transfer) {
    const id = ++seq;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      worker.postMessage(Object.assign({ id }, msg), transfer || []);
    });
  }

  async function call(fn, args) { await ready; return send({ type: 'call', fn, args: Object.assign({ _lang: getLang() }, args || {}) }); }

  async function uploadFile(name, bytes, args) {
    await ready;
    const buf = bytes instanceof ArrayBuffer ? bytes : bytes.buffer;
    const copy = buf.slice(0);
    return send({ type: 'file', name, bytes: copy, args: Object.assign({ _lang: getLang() }, args || {}) }, [copy]);
  }

  /* Long task: start → chunks → result. onProgress(done, total, preview); signal.cancelled aborts. */
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
