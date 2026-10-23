/* Computation thread: Pyodide (CPython in WebAssembly) + the SEMplex engine in Python.
   Data arrives here from the browser tab and goes nowhere else - the network is only used to download the environment. */
const PYODIDE_VERSION = '0.29.5';
const PYODIDE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const FILES = ['__init__', 'syntax', 'sem', 'efa', 'data', 'measure', 'bridge', 'mediation', 'i18n', 'api'];

let py = null;
let callPy = null;
let excelReady = false;

function post(msg) { self.postMessage(msg); }
function status(stage, progress, text) { post({ type: 'status', stage, progress, text }); }

async function init(engineUrl, version, indexURL, indexPath) {
  const base = indexURL || PYODIDE_URL;
  status('runtime', 0.04, 'Pobieranie środowiska Python (Pyodide ' + PYODIDE_VERSION + ')');
  const { loadPyodide } = await import(/* @vite-ignore */ base + 'pyodide.mjs');
  py = await loadPyodide({ indexURL: indexPath || base });  // indexPath: Node test only
  status('packages', 0.35, 'Wczytywanie numpy, scipy i pandas');
  await py.loadPackage(['numpy', 'scipy', 'pandas'], { messageCallback: () => {}, errorCallback: () => {} });
  status('engine', 0.85, 'Wczytywanie silnika SEMplex');
  py.FS.mkdirTree('/engine/semplex');
  for (const f of FILES) {
    const r = await fetch(`${engineUrl}semplex/${f}.py?v=${encodeURIComponent(version)}`);
    if (!r.ok) throw new Error(`Nie udało się pobrać pliku silnika ${f}.py (HTTP ${r.status}).`);
    py.FS.writeFile(`/engine/semplex/${f}.py`, await r.text());
  }
  py.runPython("import sys\nif '/engine' not in sys.path: sys.path.insert(0, '/engine')\nimport semplex.api as _sx_api");
  callPy = py.globals.get('_sx_api').call;
  const versions = JSON.parse(callPy('version', '{}')).result;
  versions.pyodide = PYODIDE_VERSION;
  status('ready', 1, 'Silnik gotowy');
  post({ type: 'ready', versions });
}

async function ensureExcel() {
  if (excelReady) return;
  status('packages', 0.5, 'Wczytywanie obsługi plików Excel');
  // openpyxl is not part of the Pyodide distribution packages - install from PyPI (pure Python)
  await py.loadPackage('micropip', { messageCallback: () => {}, errorCallback: () => {} });
  await py.runPythonAsync("import micropip\nawait micropip.install('openpyxl')");
  excelReady = true;
  status('ready', 1, 'Silnik gotowy');
}

function run(fn, args) {
  const out = callPy(fn, JSON.stringify(args || {}));
  return JSON.parse(out);
}

self.onmessage = async (e) => {
  const m = e.data;
  if (m.type === 'init') {
    try { await init(m.engineUrl, m.version, m.indexURL, m.indexPath); } catch (err) { post({ type: 'fatal', message: String(err && err.message || err) }); }
    return;
  }
  if (!callPy) { post({ type: 'result', id: m.id, ok: false, kind: 'engine', message: 'Silnik jeszcze się wczytuje.' }); return; }
  try {
    if (m.type === 'file') {
      if (/\.(xlsx|xlsm|xls)$/i.test(m.name)) await ensureExcel();
      py.FS.writeFile('/tmp/upload.bin', new Uint8Array(m.bytes));
      const res = run('sniff', Object.assign({}, m.args || {}, { filename: m.name, path: '/tmp/upload.bin' }));
      post(Object.assign({ type: 'result', id: m.id }, res));
      return;
    }
    if (m.type === 'call') {
      const res = run(m.fn, m.args);
      post(Object.assign({ type: 'result', id: m.id }, res));
    }
  } catch (err) {
    post({ type: 'result', id: m.id, ok: false, kind: 'engine', message: String(err && err.message || err) });
  }
};
