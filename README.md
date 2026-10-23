**English** | [Polski](README.pl.md)

# SEMplex - survey analysis in the browser

SEMplex guides the researcher from a raw survey file through reliability, EFA, and CFA to a structural model and a ready-made Results section. Everything is computed **in the browser**: the Python engine (numpy, scipy, pandas) runs in WebAssembly via Pyodide, and no data is sent to any server. The interface is built on the `semplex-ui` library (the SEMplex design system, version 18).

The interface is available in Polish and English: a **PL / EN** switch in the top bar (also available in the Ctrl K command palette). The default language follows the browser settings, and the choice is remembered. The report has a separate language selector (Polish or English in APA 7 style).

The application is fully static, so it runs on **GitHub Pages** or any file hosting (Netlify, Cloudflare Pages, university server).

## Modules

| Module | What it does |
|---|---|
| Data and cleaning | CSV/TXT/TSV/XLSX import with encoding detection (UTF-8, Windows-1250), separator and decimal mark detection; missing-value codes; skipping personal data (email, phone number, national ID, first and last name); Likert scales recorded as words; item-reversal suggestions; careless respondents (longstring, response time, Mahalanobis distance); missing-data patterns and Little's MCAR test; scale definitions |
| Descriptives and tests | M, SD, skewness, kurtosis, mini-distributions; Pearson/Spearman correlation matrix; Mardia's test with choice of estimator; Welch's t-test with Hedges' g, ANOVA |
| Reliability and validity | McDonald's ω (from a one-factor CFA) and Cronbach's α with Feldt or bootstrap CI; "item deleted" analysis; CR, AVE, MSV, Fornell-Larcker, HTMT |
| EFA | polychoric or Pearson correlations; KMO, Bartlett's test; minres, ML, PAF; oblimin, geomin, promax, varimax, quartimax rotations; 9-criterion consensus for number of factors (including parallel analysis, MAP, Hull, BIC); loading stability via bootstrap; EFA/CFA sample split with seed and stratification; one-click CFA model from the solution |
| CFA | lavaan syntax with identifiability checking; ML and MLM (Satorra-Bentler) estimators; χ², CFI, TLI, RMSEA with 90% CI, SRMR with thresholds and sources; loadings with CI (delta method or bootstrap); Heywood cases; modification indices with an "Add" suggestion; model comparison (scaled Δχ² only with confirmed nesting, same variables and rows; ΔCFI, AIC, BIC); path diagram (SVG); Python and lavaan code |
| SEM - model editor | model canvas synchronized bidirectionally with the syntax, drag-and-drop of variables from the data, undo/redo; paths, R², defined effects (`:=`) with bootstrap |
| Mediation and moderation | PROCESS templates 4 (on latent variables or on means), 7 and 14 (moderated mediation, path a or b) and 1 (moderation with Johnson-Neyman region); template 58 in release v1 |
| Approach comparison | the same effect across 7 approaches: item means, factor scores, Croon's correction, single indicator with α correction, local SAM, ESEM approximation (target rotation), joint SEM; bootstrap intervals with the number of rejected draws; forest plot, pairwise differences (descriptive), heuristic suggestion and a paragraph for the Methods section (PL/EN) |
| Report | Results section in Polish or in APA 7 in English with tables; export to HTML, Word (.doc), print/PDF |
| Decision log | tracked changes to data and model (reversals, exclusions, scales, EFA suggestions, modifications from MI, missing-data handling mode in CFA, EFA runs with seed) with rationale and effect; researcher notes; undo with a list of modules to recompute; CSV and JSON export |

The Group comparison, Power and sample size, PLS-SEM/IPMA/NCA (v1), and Multilevel models (v2) modules show a preview screen in the interface, in line with the release specification.

Common to all screens: Simple / Advanced / Code switch, command palette (Ctrl K), light and dark theme, background tasks with progress and cancellation, saving and loading `.sxp` project files (Ctrl S), inspector that collapses into a drawer below 1280 px.

## Running locally

Tested with Node.js 20 (same as in CI). The UI tests (`tools/ui-test.mjs`) do not work in Node.js 24 due to the assignment of `globalThis.navigator` in the test environment.

```bash
npm install
npm run build          # → dist/ folder
npx serve dist         # or: python -m http.server 8080 -d dist
```

Open the indicated address (e.g. http://localhost:3000). The `dist/index.html` file opened directly from disk (`file://`) will not work, because browsers block computation threads in that case - any file server is needed.

Development mode with hot reload: `npm run dev` (Vite).

## Publishing to GitHub Pages

1. Create a repository on GitHub and push the contents of this folder (`main` branch).
2. In the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Every `push` to `main` triggers `.github/workflows/deploy.yml`: engine tests (pytest), build, interface test, and publish. The application will be available at `https://<username>.github.io/<repository>/`.

The application uses relative paths, so it works in a repository subfolder without additional configuration.

### Alternative hosting

Netlify, Cloudflare Pages, Vercel: build command `npm run build`, publish folder `dist`. University server: copy the contents of `dist/` to the WWW directory. The server performs no computations.

## Architecture

```
browser
├── React 18 + semplex-ui interface        src/ (screens in src/screens/)
│     └── engine client                    src/engine/client.js - call queue, tasks computed in chunks
└── computation thread (Web Worker)        public/engine/worker.js
      └── Pyodide 0.29.5 (CPython 3.13 in WebAssembly, from cdn.jsdelivr.net)
            └── SEMplex engine (Python)    public/engine/semplex/
                  syntax.py    lavaan syntax parser (=~, ~, ~~, :=, labels, fixed values)
                  sem.py       RAM model, ML with analytic gradient, MLM (Satorra-Bentler), fit, MI, bootstrap
                  efa.py       polychoric correlations, extraction, GPA rotations, criteria for number of factors
                  data.py      import, types, missing values, personal data, careless respondents, MCAR, EM
                  measure.py   descriptives, Mardia's test, group tests, ω, α, CR, AVE, HTMT
                  bridge.py    comparison of 7 approaches
                  mediation.py PROCESS templates 4, 7, 14, and 1
                  api.py       JSON commands invoked from the interface
```

The engine is a regular Python package - the same code can be run outside the browser (`sys.path.insert(0, "public/engine")`, then `from semplex.sem import fit_model`); this is how code export works in the application.

The build (`tools/build.mjs`) uses esbuild-wasm in a single Node process, with no system-dependent binaries, so the result is identical locally and in GitHub Actions.

## Tests

| Command | What it checks |
|---|---|
| `npm run test:engine` | Satorra-Bentler χ² difference test and collinearity diagnostics; agreement with lavaan on the Holzinger-Swineford (CFA: χ² = 85.306, df = 24, CFI = 0.931, RMSEA = 0.092 [0.071; 0.114], SRMR = 0.065, loadings and SE) and Political Democracy (SEM with residual covariances: χ² = 38.125, df = 35, paths and SE) datasets; syntax parser; EFA; the API path on sample data |
| `npm run test:ui` (and `SX_LANG=en`) | the built application in happy-dom, in the Polish or English version: importing the sample, all modules and main buttons, mediation templates, PL/EN report, decision and its reversal - on recorded engine responses (`tests/fixtures/engine.json`) |
| `npm run test:wasm <pyodide_folder>` | the actual `worker.js` with Pyodide in Node: WebAssembly results compared against CPython (requires a local copy of Pyodide 0.29.5 with numpy, scipy, pandas wheels) |

WebAssembly timings (Node 20, Pyodide 0.29.5 from local files, sample data N = 512): engine startup approx. 25 s (in the browser there is also the initial download of approx. 25 MB, subsequent runs use the cache), CFA 0.1 s, EFA with consensus 2.3 s, CFA bootstrap approx. 0.06 s per sample, approach comparison approx. 0.2 s per bootstrap sample.

## Validation

The `validation/` folder reproduces the validation results described in the SEMplex paper.

| Script | What it does |
|---|---|
| `Rscript validation/lavaan_reference.R` | downloads the ECSI data (`satisfaction`, N = 250 bank customers, 27 indicators; cSEM 0.7.1 package from CRAN, GPL-3 - data are not stored in the repository) and computes reference values in lavaan 0.7-2, semTools 0.5-9, and psych 2.6.9 |
| `Rscript validation/lavaan_definitions.R` | reference values for the definitions used in SEMplex (ω from a one-factor CFA, Fornell-Larcker AVE, HTMT in the original version, parallel analysis on components) and the Satorra-Bentler (2001) χ² difference test |
| `python validation/semplex_vs_lavaan.py` | compares 1988 quantities (fit, estimates, standard errors, standardized SEs and 95% CI bounds, MI, R², EFA loadings, reliability, comparative approaches); exits with an error if any reference parameter lacks a counterpart, a value is not finite, or the difference (absolute, for p-values) exceeds 10⁻⁴ → `validation/results/agreement.csv` |
| `python validation/monte_carlo.py 500` | simulation study of a human-resource-management model (autonomy → engagement → burnout → turnover intention; Likert items 1-7; N = 150, 300, 600; 500 replications) → `validation/results/monte_carlo_summary.csv` |
| `python validation/ecsi_case_study.py` (and `--zero-missing`) | reproduces all the numbers from the ECSI case study in the paper (with the data file's SHA-256 checksum and environment versions in the output) plus a sensitivity analysis with an added val2 ~~ val3 covariance; the `--zero-missing` variant is a sensitivity analysis in which a response of 0 is treated as missing (the meaning of 0 is not documented in either cSEM or plspm) |

Result: the largest normalized difference, computed as |SEMplex - reference| / max(1, |reference|), is 3.3·10⁻⁵; in the simulation, the bias of standardized SEM path coefficients does not exceed 6.0% (N = 150), and the coverage of 95% Wald intervals falls within the range 91.8-96.2%.

*English:* `validation/` reproduces the agreement study against lavaan, semTools and psych on the ECSI customer-satisfaction data and the Monte Carlo recovery study reported in the SEMplex software paper.

## Sample Data

`public/samples/lojalnosc_2026.csv` - synthetic "Customer Loyalty 2026" dataset (N = 524, 18 Likert items, SAT, LOY, TRU, VAL scales, reverse-coded item Q6, cross-loading item Q16, 12 careless respondents, an email column to demonstrate personal data protection). Generator: `python tools/make_sample.py` (seed 2026).

## Limitations of this release

Relative to the specification (`specyfikacja-semplex.md`), the following have been deliberately deferred:

- **Estimators:** ML and MLM (Satorra-Bentler) are available. MLR and WLSMV for ordinal data are not yet implemented; for Likert items, MLM is recommended.
- **Missing data:** complete cases (listwise) by default. In CFA there is also an "EM (covariance)" mode: a covariance matrix from the EM algorithm with ML estimation using N covering all partially observed cases. This is not FIML; standard errors and tests in this mode have not been validated, so treat them with caution.
- **Mean structure and constraints:** the model has no intercepts (`~ 1`); equality and inequality constraints (`==`, `<`, `>`) are skipped with a warning.
- **ESEM** in the approach comparison is a target rotation of the EFA solution with the effect from the Φ matrix (without full ESEM error estimation); intervals are provided by bootstrap.
- **SPSS, Stata, SAS files** - v1 release; save your data as CSV or XLSX instead.
- **First run** requires internet access: the browser downloads Pyodide and packages (about 25 MB) from cdn.jsdelivr.net, then uses the cache. XLSX support installs openpyxl from PyPI on first use with an Excel file.

## Privacy

The file is read by the browser, and the engine computes in a thread of the same tab. The network is used only to download the Python environment. Columns containing personal data are skipped by default during import. The `.sxp` project file does not contain columns skipped during import by default, but it does contain the remaining responses - store it as you would the data itself.

## License and Author

MIT (implementation from scratch, no lavaan code). Sebastian Matysik, University of Szczecin, Institute of Management, Doctoral School · ORCID [0009-0002-7264-0501](https://orcid.org/0009-0002-7264-0501).

React and React DOM - MIT, © Meta Platforms, Inc. Pyodide - MPL 2.0.
