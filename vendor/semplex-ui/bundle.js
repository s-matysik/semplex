/* @ds-bundle: {"format":4,"namespace":"SEMplex","components":[{"name":"Logo"},{"name":"Icon"},{"name":"Button"},{"name":"Segmented"},{"name":"Field"},{"name":"Input"},{"name":"Select"},{"name":"Switch"},{"name":"Slider"},{"name":"ChoiceGroup"},{"name":"Badge"},{"name":"ReleaseTag"},{"name":"Verdict"},{"name":"Kbd"},{"name":"TopBar"},{"name":"Toast"},{"name":"Dialog"},{"name":"Menu"},{"name":"ContextMenu"},{"name":"Checkbox"},{"name":"RadioGroup"},{"name":"Textarea"},{"name":"EmptyState"},{"name":"Skeleton"},{"name":"Diagnosis"},{"name":"ThresholdPlot"},{"name":"ValidityMatrix"},{"name":"InvarianceLadder"},{"name":"DecisionTimeline"},{"name":"Drawer"},{"name":"PowerCurve"},{"name":"ConditionalEffectPlot"},{"name":"CorrMatrix"},{"name":"Inspector"},{"name":"IPMAMap"},{"name":"NCAPlot"},{"name":"VarianceSplit"},{"name":"CaterpillarPlot"},{"name":"SlopesPlot"},{"name":"TagInput"},{"name":"JobTray"},{"name":"Sidebar"},{"name":"PipelineStepper"},{"name":"StepList"},{"name":"Tabs"},{"name":"CommandPalette"},{"name":"Panel"},{"name":"FitIndex"},{"name":"StatTile"},{"name":"Interpretation"},{"name":"Term"},{"name":"Progress"},{"name":"RunList"},{"name":"ResultTable"},{"name":"DataGrid"},{"name":"MissingMap"},{"name":"LoadingHeatmap"},{"name":"ScreePlot"},{"name":"FactorConsensus"},{"name":"SampleSplit"},{"name":"Distribution"},{"name":"ScatterPlot"},{"name":"ForestPlot"},{"name":"WaterfallChart"},{"name":"PathDiagram"},{"name":"VariableChip"},{"name":"Dropzone"},{"name":"CodeExport"},{"name":"DecisionLog"},{"name":"Toolbar"},{"name":"ModelCanvas"},{"name":"SyntaxEditor"}]} */
(function () {
  'use strict';
  var React = window.React;
  var h = React.createElement;
  var useState = React.useState, useMemo = React.useMemo, useRef = React.useRef, useEffect = React.useEffect;
  var uid = 0;
  function useUid(prefix) {
    var r = useRef(null);
    if (r.current === null) { uid += 1; r.current = (prefix || 'sx') + uid; }
    return r.current;
  }
  function cx() {
    var out = [];
    for (var i = 0; i < arguments.length; i++) { if (arguments[i]) out.push(arguments[i]); }
    return out.join(' ');
  }
  function omit(obj, keys) {
    var o = {};
    for (var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k) && keys.indexOf(k) < 0) o[k] = obj[k]; }
    return o;
  }

  /* ---------- i18n: Polish source text -> current language (set by the app in window.__sxI18n) ---------- */
  function __sxT(s) {
    var g = (typeof window !== 'undefined' && window.__sxI18n) || null;
    if (!g || g.lang !== 'en' || !g.dict) return s;
    var v = g.dict[s];
    return v === undefined ? s : v;
  }
  function DEC() {
    var g = (typeof window !== 'undefined' && window.__sxI18n) || null;
    return g && g.lang === 'en' ? '.' : ',';
  }

  /* ---------- number formatting (Polish decimal comma by default) ---------- */
  function fmt(v, digits, opts) {
    opts = opts || {};
    if (v === null || v === undefined || v === '' || isNaN(v)) return '-';
    var d = digits === undefined ? 3 : digits;
    var dec = opts.decimal || DEC();
    var s = Math.abs(v).toFixed(d);
    if (opts.leadingZero === false && Math.abs(v) < 1) s = s.replace(/^0/, '');
    s = s.replace('.', dec);
    return (v < 0 ? '−' : '') + s;
  }
  function fmtP(p, opts) {
    if (p === null || p === undefined) return '-';
    if (p < 0.001) return '< ' + fmt(0.001, 3, opts);
    return fmt(p, 3, opts);
  }
  function stars(p) {
    if (p === null || p === undefined) return '';
    return p < 0.001 ? '***' : p < 0.01 ? '**' : p < 0.05 ? '*' : '';
  }

  /* ---------- icons: 24px grid, stroke 1.75, round caps (drawn for SEMplex) ---------- */
  var I = {
    data: [['ellipse', { cx: 12, cy: 5.5, rx: 7.5, ry: 2.75 }], ['path', { d: 'M4.5 5.5v13c0 1.52 3.36 2.75 7.5 2.75s7.5-1.23 7.5-2.75v-13' }], ['path', { d: 'M4.5 12c0 1.52 3.36 2.75 7.5 2.75s7.5-1.23 7.5-2.75' }]],
    stats: [['path', { d: 'M4 20h16' }], ['path', { d: 'M7 16.5V12' }], ['path', { d: 'M12 16.5V6' }], ['path', { d: 'M17 16.5V9' }]],
    reliability: [['circle', { cx: 12, cy: 12, r: 8.5 }], ['circle', { cx: 12, cy: 12, r: 4.5 }], ['circle', { cx: 12, cy: 12, r: 1, fill: 'currentColor' }]],
    efa: [['rect', { x: 3.5, y: 3.5, width: 7, height: 7, rx: 1.5 }], ['rect', { x: 13.5, y: 3.5, width: 7, height: 7, rx: 1.5, fill: 'currentColor' }], ['rect', { x: 3.5, y: 13.5, width: 7, height: 7, rx: 1.5, fill: 'currentColor' }], ['rect', { x: 13.5, y: 13.5, width: 7, height: 7, rx: 1.5 }]],
    cfa: [['ellipse', { cx: 12, cy: 6, rx: 7, ry: 3.5 }], ['rect', { x: 2.5, y: 16, width: 4.5, height: 4.5, rx: 1 }], ['rect', { x: 9.75, y: 16, width: 4.5, height: 4.5, rx: 1 }], ['rect', { x: 17, y: 16, width: 4.5, height: 4.5, rx: 1 }], ['path', { d: 'M8.3 9 5 16M12 9.5V16M15.7 9 19 16' }]],
    sem: [['ellipse', { cx: 6, cy: 12, rx: 4, ry: 3 }], ['ellipse', { cx: 18, cy: 12, rx: 4, ry: 3 }], ['path', { d: 'M10 12h3.5M12 10l2 2-2 2' }]],
    bridge: [['path', { d: 'M3 18h18' }], ['path', { d: 'M3.5 18c0-5.5 3.8-9.5 8.5-9.5s8.5 4 8.5 9.5' }], ['path', { d: 'M8 18v-7.2M12 18V8.5M16 18v-7.2' }]],
    mediation: [['circle', { cx: 5, cy: 18, r: 2.5 }], ['circle', { cx: 19, cy: 18, r: 2.5 }], ['circle', { cx: 12, cy: 6, r: 2.5 }], ['path', { d: 'M6.3 15.8 10.7 8.2M13.3 8.2l4.4 7.6M7.5 18h9' }]],
    groups: [['circle', { cx: 9, cy: 12, r: 6 }], ['circle', { cx: 15, cy: 12, r: 6 }]],
    pls: [['path', { d: 'M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9z' }], ['path', { d: 'M12 8v8M8.5 10l7 4' }]],
    power: [['path', { d: 'M4 18a8 8 0 1 1 16 0' }], ['path', { d: 'M12 18l4-5' }]],
    layers: [['path', { d: 'M12 3 3 8l9 5 9-5z' }], ['path', { d: 'M3 13l9 5 9-5' }]],
    report: [['path', { d: 'M14 3H6.5v18h11V6.5z' }], ['path', { d: 'M14 3v3.5h3.5M9.5 12h5M9.5 16h5' }]],
    code: [['path', { d: 'M8 7l-5 5 5 5M16 7l5 5-5 5' }]],
    search: [['circle', { cx: 11, cy: 11, r: 6.5 }], ['path', { d: 'M20 20l-4.2-4.2' }]],
    play: [['path', { d: 'M7 4.8v14.4L19 12z' }]],
    check: [['path', { d: 'M5 12.5l4.5 4.5L19 7.5' }]],
    good: [['circle', { cx: 12, cy: 12, r: 9 }], ['path', { d: 'M8 12.5l3 3 5-6' }]],
    ok: [['path', { d: 'M12 3.5 2.5 20h19z' }], ['path', { d: 'M12 10v4.5M12 17.4v.1' }]],
    poor: [['path', { d: 'M8 3h8l5 5v8l-5 5H8l-5-5V8z' }], ['path', { d: 'M9.5 9.5l5 5M14.5 9.5l-5 5' }]],
    info: [['circle', { cx: 12, cy: 12, r: 9 }], ['path', { d: 'M12 11v5.5M12 7.6v.1' }]],
    upload: [['path', { d: 'M12 15V4M7.5 8.5 12 4l4.5 4.5M4 15v4.5h16V15' }]],
    download: [['path', { d: 'M12 4v11M7.5 10.5 12 15l4.5-4.5M4 19.5h16' }]],
    copy: [['rect', { x: 8.5, y: 8.5, width: 11.5, height: 11.5, rx: 2 }], ['path', { d: 'M15.5 8.5V5.5a1.5 1.5 0 0 0-1.5-1.5H5.5A1.5 1.5 0 0 0 4 5.5V14a1.5 1.5 0 0 0 1.5 1.5h3' }]],
    'chevron-right': [['path', { d: 'M9.5 6l6 6-6 6' }]],
    'chevron-down': [['path', { d: 'M6 9.5l6 6 6-6' }]],
    'arrow-right': [['path', { d: 'M5 12h14M13 6l6 6-6 6' }]],
    plus: [['path', { d: 'M12 5v14M5 12h14' }]],
    x: [['path', { d: 'M6 6l12 12M18 6 6 18' }]],
    minus: [['path', { d: 'M6 12h12' }]],
    more: [['circle', { cx: 5.5, cy: 12, r: 1.25, fill: 'currentColor' }], ['circle', { cx: 12, cy: 12, r: 1.25, fill: 'currentColor' }], ['circle', { cx: 18.5, cy: 12, r: 1.25, fill: 'currentColor' }]],
    file: [['path', { d: 'M14 3H6.5v18h11V6.5z' }], ['path', { d: 'M14 3v3.5h3.5' }]],
    refresh: [['path', { d: 'M19.5 12a7.5 7.5 0 1 1-2.2-5.3' }], ['path', { d: 'M19.5 4.5v4h-4' }]],
    pencil: [['path', { d: 'M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 3L8 18.5z' }], ['path', { d: 'M13.5 7l3 3' }]],
    print: [['path', { d: 'M7 9V3.5h10V9' }], ['rect', { x: 3.5, y: 9, width: 17, height: 8, rx: 1.5 }], ['path', { d: 'M7 14h10v6.5H7z' }]],
    settings: [['path', { d: 'M4 7h9.5M18.5 7H20M4 17h3.5M12.5 17H20' }], ['circle', { cx: 16, cy: 7, r: 2.5 }], ['circle', { cx: 10, cy: 17, r: 2.5 }]],
    lock: [['rect', { x: 5, y: 11, width: 14, height: 10, rx: 2 }], ['path', { d: 'M8 11V8a4 4 0 0 1 8 0v3' }]],
    history: [['path', { d: 'M3.5 12a8.5 8.5 0 1 0 2.6-6.1' }], ['path', { d: 'M3.5 4v4h4M12 8v4.5l3 2' }]],
    book: [['path', { d: 'M5 6.5A2.5 2.5 0 0 1 7.5 4H19v13H7.5A2.5 2.5 0 0 0 5 19.5z' }], ['path', { d: 'M5 19.5A2.5 2.5 0 0 0 7.5 22H19v-5' }]],
    globe: [['circle', { cx: 12, cy: 12, r: 9 }], ['path', { d: 'M3 12h18M12 3c2.8 3.2 2.8 14.8 0 18M12 3c-2.8 3.2-2.8 14.8 0 18' }]],
    sun: [['circle', { cx: 12, cy: 12, r: 4 }], ['path', { d: 'M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4' }]],
    moon: [['path', { d: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z' }]],
    split: [['path', { d: 'M12 3v18' }], ['rect', { x: 3.5, y: 6, width: 5, height: 12, rx: 1.5 }], ['rect', { x: 15.5, y: 6, width: 5, height: 12, rx: 1.5 }]],
    trash: [['path', { d: 'M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13' }]],
    link: [['path', { d: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1' }], ['path', { d: 'M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1' }]],
    pointer: [['path', { d: 'M5.5 3.5 18 10.6l-5.5 1.6 3.3 6-2.4 1.3-3.3-6-4.6 3.6z' }]],
    latent: [['ellipse', { cx: 12, cy: 12, rx: 9, ry: 5.5 }]],
    observed: [['rect', { x: 4, y: 6.5, width: 16, height: 11, rx: 2 }]],
    path: [['path', { d: 'M5 19 18.5 5.5M11 5h8v8' }]],
    cov: [['path', { d: 'M5 17c1.5-8 12.5-8 14 0' }], ['path', { d: 'M3.2 14.6 5 17.2l2.6-1.4M20.8 14.6 19 17.2l-2.6-1.4' }]],
    interaction: [['path', { d: 'M12 3.5 20.5 12 12 20.5 3.5 12z' }], ['path', { d: 'M9.5 9.5l5 5M14.5 9.5l-5 5' }]],
    undo: [['path', { d: 'M9 14 4 9l5-5' }], ['path', { d: 'M4 9h10.5a5.5 5.5 0 0 1 0 11H11' }]],
    redo: [['path', { d: 'M15 14l5-5-5-5' }], ['path', { d: 'M20 9H9.5a5.5 5.5 0 0 0 0 11H13' }]],
    layout: [['rect', { x: 3, y: 4, width: 6, height: 5, rx: 1.2 }], ['rect', { x: 15, y: 4, width: 6, height: 5, rx: 1.2 }], ['rect', { x: 9, y: 15, width: 6, height: 5, rx: 1.2 }], ['path', { d: 'M6 9v2.5h12V9M12 11.5V15' }]],
    'zoom-in': [['circle', { cx: 11, cy: 11, r: 6.5 }], ['path', { d: 'M20 20l-4.2-4.2M11 8.5v5M8.5 11h5' }]],
    'zoom-out': [['circle', { cx: 11, cy: 11, r: 6.5 }], ['path', { d: 'M20 20l-4.2-4.2M8.5 11h5' }]],
    fit: [['path', { d: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5' }]],
    eye: [['path', { d: 'M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z' }], ['circle', { cx: 12, cy: 12, r: 3 }]],
    pin: [['path', { d: 'M9 3.5h6l-1 6 3.5 3.5v1.5h-11V13L10 9.5z' }], ['path', { d: 'M12 14.5V21' }]],
    help: [['circle', { cx: 12, cy: 12, r: 9 }], ['path', { d: 'M9.6 9.3a2.5 2.5 0 0 1 4.9.7c0 1.7-2.5 2.2-2.5 3.8M12 17.2v.1' }]],
    keyboard: [['rect', { x: 2.5, y: 6, width: 19, height: 12, rx: 2 }], ['path', { d: 'M6 10h.1M9.3 10h.1M12.6 10h.1M15.9 10h.1M18 10h.1M8 14.5h8' }]],
    folder: [['path', { d: 'M3.5 6.5A1.5 1.5 0 0 1 5 5h4.5l2 2.5H19a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18z' }]],
    archive: [['rect', { x: 3, y: 4.5, width: 18, height: 4.5, rx: 1 }], ['path', { d: 'M5 9v10.5h14V9M10 13h4' }]],
    bug: [['rect', { x: 7, y: 7.5, width: 10, height: 12.5, rx: 5 }], ['path', { d: 'M12 11v9M7 13H3.5M20.5 13H17M7.5 17.5l-3 2M16.5 17.5l3 2M7.8 9.5 5 7M16.2 9.5 19 7M9.5 7.8a2.5 2.5 0 0 1 5 0' }]],
    external: [['path', { d: 'M13.5 4.5H19.5v6M19.5 4.5l-8 8' }], ['path', { d: 'M17.5 14v5.5h-13v-13H10' }]],
    template: [['rect', { x: 3.5, y: 3.5, width: 17, height: 17, rx: 2.5 }], ['path', { d: 'M3.5 9h17M9 9v11.5' }]],
    shuffle: [['path', { d: 'M4 7h3.5c4 0 5 10 9 10H20M4 17h3.5c1.5 0 2.5-1.3 3.3-3M13.2 10c.8-1.7 1.8-3 3.3-3H20M17.5 4.5 20 7l-2.5 2.5M17.5 14.5 20 17l-2.5 2.5' }]]
  };
  function Icon(props) {
    var size = props.size || 16;
    var def = I[props.name];
    if (!def) return null;
    var kids = def.map(function (d, i) { return h(d[0], Object.assign({ key: i }, d[1])); });
    if (props.title) kids.unshift(h('title', { key: 't' }, props.title));
    return h('svg', {
      className: cx('sx-icon', props.className), width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
      stroke: 'currentColor', strokeWidth: props.strokeWidth || 1.75, strokeLinecap: 'round', strokeLinejoin: 'round',
      'aria-hidden': props.title ? undefined : true, role: props.title ? 'img' : undefined, style: props.style
    }, kids);
  }
  Icon.names = Object.keys(I);

  /* ---------- Logo ---------- */
  function Logo(props) {
    var size = props.size || 28;
    var showName = props.name !== false;
    var mark = h('svg', { className: 'sx-logo-mark', width: size, height: size, viewBox: '0 0 32 32', 'aria-hidden': true },
      h('rect', { className: 'sx-logo-tile', x: 0, y: 0, width: 32, height: 32, rx: 8 }),
      h('ellipse', { className: 'sx-logo-fill', cx: 16, cy: 9.5, rx: 9.5, ry: 5 }),
      h('path', { className: 'sx-logo-ink', d: 'M9 14 7 20M16 14.5v5.5M23 14l2 6', fill: 'none', strokeWidth: 1.75, strokeLinecap: 'round' }),
      h('rect', { className: 'sx-logo-ink', x: 4, y: 20, width: 6, height: 6, rx: 1.5, fill: 'none', strokeWidth: 1.75 }),
      h('rect', { className: 'sx-logo-ink', x: 13, y: 20, width: 6, height: 6, rx: 1.5, fill: 'none', strokeWidth: 1.75 }),
      h('rect', { className: 'sx-logo-ink', x: 22, y: 20, width: 6, height: 6, rx: 1.5, fill: 'none', strokeWidth: 1.75 }));
    return h('span', { className: cx('sx-logo', props.className), role: 'img', 'aria-label': 'SEMplex', style: { fontSize: Math.round(size * 0.64) + 'px' } },
      mark, showName ? h('span', { className: 'sx-logo-name', 'aria-hidden': true }, h('b', null, 'SEM'), 'plex') : null);
  }

  /* ---------- Actions ---------- */
  function Button(props) {
    var variant = props.variant || 'secondary', size = props.size || 'md';
    var rest = omit(props, ['variant', 'size', 'icon', 'iconRight', 'loading', 'className', 'children', 'block']);
    var iconOnly = props.icon && (props.children === undefined || props.children === null);
    var isz = size === 'lg' ? 18 : 16;
    return h('button', Object.assign({ type: 'button' }, rest, {
      className: cx('sx-btn', 'sx-btn-' + variant, 'sx-btn-' + size, iconOnly && 'sx-btn-icon', props.block && 'sx-btn-block', props.loading && 'is-loading', props.className),
      'aria-busy': props.loading ? true : undefined,
      disabled: props.disabled || props.loading
    }),
      props.loading ? h('span', { className: 'sx-spinner', 'aria-hidden': true }) : (props.icon ? h(Icon, { name: props.icon, size: isz }) : null),
      iconOnly ? null : h('span', { className: 'sx-btn-label' }, props.children),
      props.iconRight ? h(Icon, { name: props.iconRight, size: isz }) : null);
  }

  function Segmented(props) {
    var opts = props.options || [];
    var st = useState(props.defaultValue !== undefined ? props.defaultValue : (opts[0] && opts[0].value));
    var value = props.value !== undefined ? props.value : st[0];
    function pick(v) { if (props.value === undefined) st[1](v); if (props.onChange) props.onChange(v); }
    return h('div', { className: cx('sx-seg', props.size === 'sm' && 'sx-seg-sm', props.className), role: 'radiogroup', 'aria-label': props.label },
      opts.map(function (o) {
        var on = o.value === value;
        return h('button', { key: o.value, type: 'button', role: 'radio', 'aria-checked': on, className: cx('sx-seg-item', on && 'is-on'), onClick: function () { pick(o.value); }, title: o.title },
          o.icon ? h(Icon, { name: o.icon, size: 15 }) : null, o.label ? h('span', null, o.label) : null);
      }));
  }

  /* ---------- Forms ---------- */
  function Field(props) {
    var id = useUid('fld');
    var child = props.children;
    var forId = props.htmlFor || (child && child.props && child.props.id) || id;
    /* only native-like controls take a <label for>; groups (Segmented, ChoiceGroup, RadioGroup…) are named by aria-label */
    var labelable = !!props.htmlFor || (child && React.isValidElement(child) && (child.type === Input || child.type === Select || child.type === Textarea || child.type === 'input' || child.type === 'select' || child.type === 'textarea'));
    if (child && React.isValidElement(child) && labelable && !child.props.id) child = React.cloneElement(child, { id: forId, 'aria-invalid': props.error ? true : undefined, 'aria-describedby': (props.hint || props.error) ? forId + '-d' : undefined });
    else if (child && React.isValidElement(child) && !labelable && child.props.label === undefined && typeof props.label === 'string') child = React.cloneElement(child, { label: props.label });
    return h('div', { className: cx('sx-field', props.error && 'has-error', props.className) },
      props.label ? h(labelable ? 'label' : 'span', { className: 'sx-field-label', htmlFor: labelable ? forId : undefined, id: labelable ? undefined : forId + '-l' }, props.label, props.required ? h('span', { className: 'sx-req', 'aria-hidden': true }, ' *') : null, props.aside ? h('span', { className: 'sx-field-aside' }, props.aside) : null) : null,
      child,
      props.error ? h('div', { className: 'sx-field-msg is-error', id: forId + '-d' }, h(Icon, { name: 'poor', size: 14 }), props.error)
        : props.hint ? h('div', { className: 'sx-field-msg', id: forId + '-d' }, props.hint) : null);
  }
  function Input(props) {
    var rest = omit(props, ['mono', 'icon', 'className', 'suffix']);
    var input = h('input', Object.assign({}, rest, { className: cx('sx-input', props.mono && 'is-mono', props.icon && 'has-icon', props.suffix && 'has-suffix', props.className) }));
    if (!props.icon && !props.suffix) return input;
    return h('span', { className: 'sx-input-wrap' }, props.icon ? h(Icon, { name: props.icon, size: 16, className: 'sx-input-icon' }) : null, input, props.suffix ? h('span', { className: 'sx-input-suffix' }, props.suffix) : null);
  }
  function Select(props) {
    var rest = omit(props, ['options', 'className']);
    return h('span', { className: 'sx-select-wrap' },
      h('select', Object.assign({}, rest, { className: cx('sx-input', 'sx-select', props.className) }),
        (props.options || []).map(function (o) { var v = typeof o === 'string' ? o : o.value; return h('option', { key: v, value: v }, typeof o === 'string' ? o : o.label); })),
      h(Icon, { name: 'chevron-down', size: 16, className: 'sx-select-caret' }));
  }
  function Switch(props) {
    var st = useState(!!props.defaultChecked);
    var on = props.checked !== undefined ? props.checked : st[0];
    function toggle() { if (props.checked === undefined) st[1](!on); if (props.onChange) props.onChange(!on); }
    return h('label', { className: cx('sx-switch', props.disabled && 'is-disabled', props.className) },
      h('button', { type: 'button', role: 'switch', 'aria-checked': on, className: cx('sx-switch-track', on && 'is-on'), onClick: toggle, disabled: props.disabled }, h('span', { className: 'sx-switch-thumb' })),
      props.label ? h('span', { className: 'sx-switch-text' }, h('span', { className: 'sx-switch-label' }, props.label), props.hint ? h('span', { className: 'sx-switch-hint' }, props.hint) : null) : null);
  }

  /* ---------- Status ---------- */
  function Badge(props) {
    var tone = props.tone || 'neutral';
    return h('span', { className: cx('sx-badge', 'sx-badge-' + tone, props.className) }, props.icon ? h(Icon, { name: props.icon, size: 13 }) : null, props.children);
  }
  var RELEASE = { MVP: 'mvp', v1: 'v1', v2: 'v2', nowe: 'new' };
  function ReleaseTag(props) {
    var r = props.release || 'MVP';
    return h('span', { className: cx('sx-rel', 'sx-rel-' + (RELEASE[r] || 'mvp'), props.className), title: r === 'nowe' ? __sxT('Funkcja, której nie ma w znanych narzędziach') : __sxT('Wydanie ') + r }, r);
  }
  function VERDICT() { return { good: __sxT('dobre'), ok: __sxT('akceptowalne'), poor: __sxT('słabe') }; }
  function Verdict(props) {
    var lv = props.level || 'good';
    return h('span', { className: cx('sx-verdict', 'sx-verdict-' + lv, props.className) }, h(Icon, { name: lv, size: 14 }), props.children || VERDICT()[lv]);
  }
  function Kbd(props) { return h('kbd', { className: 'sx-kbd' }, props.children); }

  /* ---------- Navigation ---------- */
  function Sidebar(props) {
    var st = useState(props.defaultActive || props.active);
    var active = props.active !== undefined ? props.active : st[0];
    function pick(id) { if (props.active === undefined) st[1](id); if (props.onSelect) props.onSelect(id); }
    if (props.compact) {
      return h('nav', { className: cx('sx-sidebar', 'is-compact', props.className), 'aria-label': props.label || __sxT('Moduły') },
        props.header ? h('div', { className: 'sx-sidebar-head' }, props.header) : null,
        h('div', { className: 'sx-sidebar-body' }, (props.sections || []).map(function (sec, si) {
          return h('ul', { key: si, className: 'sx-rail-sec', 'aria-label': sec.label }, sec.items.map(function (it) {
            var on = it.id === active;
            return h('li', { key: it.id }, h('button', { type: 'button', className: cx('sx-rail-item', on && 'is-on'), 'aria-current': on ? 'page' : undefined, 'aria-label': it.label, onClick: function () { pick(it.id); } },
              h(Icon, { name: it.icon || 'arrow-right', size: 20 }),
              it.status ? h('span', { className: 'sx-rail-dot sx-dot-' + it.status, 'aria-hidden': true }) : null,
              h('span', { className: 'sx-rail-tip', role: 'presentation' }, it.label, it.release ? h(ReleaseTag, { release: it.release }) : null)));
          }));
        })),
        props.footer ? h('div', { className: 'sx-sidebar-foot' }, props.footer) : null);
    }
    return h('nav', { className: cx('sx-sidebar', props.className), 'aria-label': props.label || __sxT('Moduły') },
      props.header ? h('div', { className: 'sx-sidebar-head' }, props.header) : null,
      h('div', { className: 'sx-sidebar-body' }, (props.sections || []).map(function (sec, si) {
        return h('div', { key: si, className: 'sx-side-sec' },
          sec.label ? h('div', { className: 'sx-side-label' }, sec.label) : null,
          h('ul', null, sec.items.map(function (it) {
            var on = it.id === active;
            return h('li', { key: it.id }, h('button', { type: 'button', className: cx('sx-side-item', on && 'is-on', it.disabled && 'is-dim'), 'aria-current': on ? 'page' : undefined, onClick: function () { pick(it.id); } },
              it.icon ? h(Icon, { name: it.icon, size: 18 }) : null,
              h('span', { className: 'sx-side-text' }, it.label),
              it.status ? h(Icon, { name: it.status, size: 15, className: 'sx-side-status sx-tone-' + it.status, title: VERDICT()[it.status] || it.status }) : null,
              it.count !== undefined ? h('span', { className: 'sx-side-count' }, it.count) : null,
              it.release ? h(ReleaseTag, { release: it.release }) : null));
          })));
      })),
      props.footer ? h('div', { className: 'sx-sidebar-foot' }, props.footer) : null);
  }

  function PipelineStepper(props) {
    var steps = props.steps || [];
    return h('ol', { className: cx('sx-pipe', props.compact && 'is-compact', props.className), 'aria-label': props.label || __sxT('Ścieżka analizy') },
      steps.map(function (s, i) {
        var st = s.status || 'todo';
        var mark = st === 'done' ? h(Icon, { name: 'check', size: 14, strokeWidth: 2.5 }) : st === 'warn' ? h(Icon, { name: 'ok', size: 14, strokeWidth: 2.25 }) : h('span', null, i + 1);
        return h('li', { key: s.id || i, className: cx('sx-pipe-step', 'is-' + st), 'aria-current': st === 'current' ? 'step' : undefined },
          h('button', { type: 'button', className: 'sx-pipe-btn', onClick: props.onSelect ? function () { props.onSelect(s.id); } : undefined, disabled: st === 'todo' && !props.allowAhead },
            h('span', { className: 'sx-pipe-dot' }, mark),
            h('span', { className: 'sx-pipe-text' }, h('span', { className: 'sx-pipe-label' }, s.label), s.meta ? h('span', { className: 'sx-pipe-meta' }, s.meta) : null)),
          i < steps.length - 1 ? h('span', { className: 'sx-pipe-line', 'aria-hidden': true }) : null);
      }));
  }

  function Tabs(props) {
    var tabs = props.tabs || [];
    var st = useState(props.defaultValue || (tabs[0] && tabs[0].id));
    var value = props.value !== undefined ? props.value : st[0];
    function pick(v) { if (props.value === undefined) st[1](v); if (props.onChange) props.onChange(v); }
    return h('div', { className: cx('sx-tabs', props.className), role: 'tablist' },
      tabs.map(function (t) {
        var on = t.id === value;
        return h('button', { key: t.id, type: 'button', role: 'tab', 'aria-selected': on, className: cx('sx-tab', on && 'is-on'), onClick: function () { pick(t.id); } },
          t.icon ? h(Icon, { name: t.icon, size: 16 }) : null, t.label,
          t.count !== undefined ? h('span', { className: 'sx-tab-count' }, t.count) : null,
          t.status ? h(Icon, { name: t.status, size: 14, className: 'sx-tone-' + t.status }) : null);
      }));
  }

  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l'); }
  function highlight(text, q) {
    if (!q) return text;
    var n = norm(text), nq = norm(q), i = n.indexOf(nq);
    if (i < 0) return text;
    return [text.slice(0, i), h('mark', { key: 'm' }, text.slice(i, i + q.length)), text.slice(i + q.length)];
  }
  function CommandPalette(props) {
    var st = useState(props.defaultQuery || '');
    var q = st[0];
    var sel = useState(0);
    var items = props.items || [];
    var scopes = props.scopes || [];
    var scope = null, qq = q;
    scopes.forEach(function (s) { if (!scope && q.indexOf(s.prefix) === 0) { scope = s; qq = q.slice(s.prefix.length); } });
    var lim = props.limit || 8;
    var results = useMemo(function () {
      var pool = scope ? items.filter(function (it) { return it.module === scope.module; }) : items;
      var nq = norm(qq).trim();
      if (!nq) {
        if (!scope && props.recent && props.recent.length) {
          var rec = props.recent.map(function (id) { return items.filter(function (it) { return it.id === id; })[0]; }).filter(Boolean)
            .map(function (it) { return Object.assign({}, it, { module: props.recentLabel || __sxT('Ostatnio używane') }); });
          return rec.concat(pool.filter(function (it) { return props.recent.indexOf(it.id) < 0; })).slice(0, lim);
        }
        return pool.slice(0, lim);
      }
      return pool.filter(function (it) { return norm(it.title + ' ' + (it.keywords || '') + ' ' + (it.module || '') + ' ' + (it.description || '')).indexOf(nq) >= 0; }).slice(0, lim);
    }, [q, items]);
    var active = Math.min(sel[0], Math.max(0, results.length - 1));
    function onKey(e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); sel[1](Math.min(active + 1, results.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel[1](Math.max(active - 1, 0)); }
      else if (e.key === 'Enter' && results[active] && props.onPick) props.onPick(results[active]);
      else if (e.key === 'Escape' && props.onClose) props.onClose();
      else if (e.key === 'Backspace' && scope && !qq) { e.preventDefault(); st[1](''); }
    }
    var lid = useUid('cmd');
    var groups = [], byMod = {};
    results.forEach(function (r, idx) { var m = r.module || __sxT('Wyniki'); if (!byMod[m]) { byMod[m] = []; groups.push(m); } byMod[m].push({ r: r, idx: idx }); });
    var box = h('div', { className: 'sx-cmd', role: 'dialog', 'aria-label': props.label || __sxT('Szukaj metody') },
      h('div', { className: 'sx-cmd-search' }, h(Icon, { name: 'search', size: 18 }),
        scope ? h('span', { className: 'sx-cmd-scope' }, scope.label) : null,
        h('input', { className: 'sx-cmd-input', value: scope ? qq : q, autoFocus: props.autoFocus, placeholder: scope ? (scope.placeholder || __sxT('Szukaj: ') + scope.label) : (props.placeholder || __sxT('Szukaj metody, testu albo wskaźnika - np. omega, HTMT, inwariancja')),
          onChange: function (e) { st[1]((scope ? scope.prefix : '') + e.target.value); sel[1](0); }, onKeyDown: onKey, 'aria-label': __sxT('Szukaj'), role: 'combobox', 'aria-expanded': true, 'aria-controls': lid, 'aria-activedescendant': results[active] ? lid + '-' + active : undefined }),
        h(Kbd, null, 'esc')),
      h('div', { className: 'sx-cmd-list', role: 'listbox', id: lid, 'aria-label': __sxT('Wyniki') },
        results.length === 0 ? h('div', { className: 'sx-cmd-empty' }, __sxT('Brak wyników dla „') + qq + __sxT('”. Spróbuj nazwy angielskiej albo skrótu.')) :
          groups.map(function (g) {
            return h('div', { key: g, className: 'sx-cmd-group', role: 'group', 'aria-label': g }, h('div', { className: 'sx-cmd-glabel', 'aria-hidden': true }, g),
              byMod[g].map(function (o) {
                var r = o.r, on = o.idx === active;
                return h('div', { key: (r.id || r.title) + g, id: lid + '-' + o.idx, role: 'option', 'aria-selected': on, className: cx('sx-cmd-item', on && 'is-on'), onMouseEnter: function () { sel[1](o.idx); }, onClick: function () { if (props.onPick) props.onPick(r); } },
                  h('span', { className: 'sx-cmd-ico' }, h(Icon, { name: r.icon || 'arrow-right', size: 16 })),
                  h('span', { className: 'sx-cmd-text' }, h('span', { className: 'sx-cmd-title' }, highlight(r.title, qq.trim())), r.description ? h('span', { className: 'sx-cmd-desc' }, r.description) : null),
                  r.release ? h(ReleaseTag, { release: r.release }) : null,
                  r.shortcut ? h('span', { className: 'sx-cmd-keys' }, r.shortcut.split(' ').map(function (k, i) { return h(Kbd, { key: i }, k); })) : null,
                  on && !r.shortcut ? h(Kbd, null, '↵') : null);
              }));
          })),
      h('div', { className: 'sx-cmd-foot' }, h('span', null, h(Kbd, null, '↑'), h(Kbd, null, '↓'), ' wybierz'), h('span', null, h(Kbd, null, '↵'), __sxT(' otwórz')),
        scopes.map(function (s) { return h('span', { key: s.prefix, className: 'sx-cmd-hintscope' }, h(Kbd, null, s.prefix), ' ' + s.label.toLowerCase()); }),
        h('span', { className: 'sx-cmd-count' }, props.countLabel || ((props.total || items.length) + __sxT(' metod w SEMplex')))));
    if (props.overlay) return h('div', { className: cx('sx-scrim', props.contained && 'is-contained'), onClick: function (e) { if (e.target === e.currentTarget && props.onClose) props.onClose(); } }, box);
    return box;
  }

  /* ---------- Containers & interpretation ---------- */
  function Panel(props) {
    var hasHead = props.title || props.actions || props.eyebrow;
    return h('section', { className: cx('sx-panel', props.flush && 'is-flush', props.className), style: props.style },
      hasHead ? h('header', { className: 'sx-panel-head' },
        h('div', { className: 'sx-panel-titles' },
          props.eyebrow ? h('div', { className: 'sx-panel-eyebrow' }, props.eyebrow) : null,
          props.title ? h('h3', { className: 'sx-panel-title' }, props.icon ? h(Icon, { name: props.icon, size: 18 }) : null, props.title) : null,
          props.subtitle ? h('p', { className: 'sx-panel-sub' }, props.subtitle) : null),
        props.actions ? h('div', { className: 'sx-panel-actions' }, props.actions) : null) : null,
      h('div', { className: 'sx-panel-body' }, props.children));
  }

  function Term(props) {
    var st = useState(false);
    var id = useUid('term');
    return h('span', { className: 'sx-term', onMouseEnter: function () { st[1](true); }, onMouseLeave: function () { st[1](false); } },
      h('button', { type: 'button', className: 'sx-term-btn', 'aria-describedby': id, onFocus: function () { st[1](true); }, onBlur: function () { st[1](false); } }, props.children || props.term),
      h('span', { id: id, role: 'tooltip', className: cx('sx-term-pop', (st[0] || props.open) && 'is-open', props.placement === 'top' && 'is-top') },
        h('span', { className: 'sx-term-name' }, props.term),
        props.definition ? h('span', { className: 'sx-term-def' }, props.definition) : null,
        props.threshold ? h('span', { className: 'sx-term-row' }, h('b', null, __sxT('Próg ')), props.threshold) : null,
        props.source ? h('span', { className: 'sx-term-src' }, h(Icon, { name: 'book', size: 13 }), props.source) : null));
  }

  function FitIndex(props) {
    var v = props.value, sc = props.scale, th = props.threshold;
    var fo = { decimal: props.decimal || DEC(), leadingZero: props.leadingZero };
    var bar = null;
    if (sc && typeof v === 'number') {
      var pct = function (x) { return Math.max(0, Math.min(100, (x - sc[0]) / (sc[1] - sc[0]) * 100)); };
      bar = h('div', { className: 'sx-fit-bar', 'aria-hidden': true },
        h('span', { className: 'sx-fit-track' }),
        typeof props.cut === 'number' ? h('span', { className: 'sx-fit-cut', style: { left: pct(props.cut) + '%' } }) : null,
        props.ci ? h('span', { className: 'sx-fit-ci', style: { left: pct(props.ci[0]) + '%', width: (pct(props.ci[1]) - pct(props.ci[0])) + '%' } }) : null,
        h('span', { className: cx('sx-fit-dot', 'sx-tone-' + (props.verdict || 'good')), style: { left: pct(v) + '%' } }));
    }
    var label = props.term ? h(Term, { term: props.label, definition: props.term, threshold: th, source: props.source }) : props.label;
    return h('div', { className: cx('sx-fit', props.className) },
      h('div', { className: 'sx-fit-top' }, h('span', { className: 'sx-fit-label' }, label), props.verdict ? h(Verdict, { level: props.verdict }) : null),
      h('div', { className: 'sx-fit-value' }, typeof v === 'number' ? fmt(v, props.digits === undefined ? 3 : props.digits, fo) : v,
        props.ci ? h('span', { className: 'sx-fit-ci-txt' }, (props.ciLabel || '90% CI') + ' [' + fmt(props.ci[0], props.digits === undefined ? 3 : props.digits, fo) + (fo.decimal === '.' ? ', ' : '; ') + fmt(props.ci[1], props.digits === undefined ? 3 : props.digits, fo) + ']') : null),
      bar,
      th || props.source ? h('div', { className: 'sx-fit-th' }, th ? h('span', null, __sxT('Próg '), th) : null, props.source ? h('span', { className: 'sx-fit-src' }, props.source) : null) : null);
  }

  var TONE_ICON = { info: 'info', good: 'good', warn: 'ok', ok: 'ok', poor: 'poor', brand: 'cfa' };
  function Interpretation(props) {
    var tone = props.tone || 'info';
    return h('div', { className: cx('sx-interp', 'sx-interp-' + tone, props.className), role: tone === 'poor' ? 'alert' : 'note' },
      h('span', { className: 'sx-interp-ico' }, h(Icon, { name: props.icon || TONE_ICON[tone] || 'info', size: 18 })),
      h('div', { className: 'sx-interp-main' },
        props.title ? h('div', { className: 'sx-interp-title' }, props.title) : null,
        h('div', { className: 'sx-interp-body' }, props.children),
        (props.source || props.actions) ? h('div', { className: 'sx-interp-foot' },
          props.source ? h('span', { className: 'sx-interp-src' }, h(Icon, { name: 'book', size: 13 }), props.source) : null,
          props.actions ? h('span', { className: 'sx-interp-actions' }, props.actions) : null) : null));
  }

  function Progress(props) {
    var max = props.max || 100, v = Math.max(0, Math.min(max, props.value || 0));
    var pct = props.indeterminate ? null : v / max * 100;
    return h('div', { className: cx('sx-progress', props.className) },
      (props.label || props.valueText !== false) ? h('div', { className: 'sx-progress-top' },
        h('span', { className: 'sx-progress-label' }, props.label),
        h('span', { className: 'sx-progress-val' }, props.valueText || (pct === null ? '' : Math.round(pct) + '%'))) : null,
      h('div', { className: cx('sx-progress-track', props.indeterminate && 'is-indet'), role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': max, 'aria-valuenow': props.indeterminate ? undefined : v, 'aria-label': props.label },
        h('span', { className: 'sx-progress-fill', style: pct === null ? null : { width: pct + '%' } })),
      props.detail ? h('div', { className: 'sx-progress-detail' }, props.detail) : null);
  }

  /* ---------- Results ---------- */
  function cell(col, row, opts) {
    var v = row[col.key];
    if (col.render) return col.render(v, row);
    switch (col.type) {
      case 'num': return fmt(v, col.digits === undefined ? 3 : col.digits, opts);
      case 'p': return fmtP(v, opts);
      case 'est': return h(React.Fragment, null, fmt(v, col.digits === undefined ? 2 : col.digits, opts), h('span', { className: 'sx-stars' }, stars(row[col.pKey || 'p'])));
      case 'ci': return v ? '[' + fmt(v[0], col.digits === undefined ? 2 : col.digits, opts) + '; ' + fmt(v[1], col.digits === undefined ? 2 : col.digits, opts) + ']' : '-';
      case 'var': return h('code', { className: 'sx-var' }, v);
      case 'verdict': return v ? h(Verdict, { level: v }) : null;
      default: return v;
    }
  }
  function ResultTable(props) {
    var cols = props.columns || [], rows = props.rows || [];
    var opts = { decimal: props.decimal || DEC(), leadingZero: props.leadingZero };
    return h('figure', { className: cx('sx-rtable', props.dense && 'is-dense', props.className) },
      props.caption ? h('figcaption', { className: 'sx-rtable-cap' }, props.number ? h('span', { className: 'sx-rtable-num' }, props.number) : null, props.caption) : null,
      h('div', { className: 'sx-rtable-scroll' }, h('table', null,
        h('thead', null, h('tr', null, cols.map(function (c) { return h('th', { key: c.key, className: 'is-' + (c.align || (c.type && c.type !== 'text' && c.type !== 'var' && c.type !== 'verdict' ? 'num' : 'text')), title: c.title }, c.label); }))),
        h('tbody', null, rows.map(function (r, i) {
          if (r.group) return h('tr', { key: 'g' + i, className: 'sx-rtable-group' }, h('th', { colSpan: cols.length, scope: 'rowgroup' }, r.group));
          return h('tr', { key: i, className: cx(r.flag && 'is-flag-' + r.flag, r.muted && 'is-muted', r.selected && 'is-selected', r.hovered && 'is-hovered', props.onRowClick && 'is-clickable'), onClick: props.onRowClick ? function () { props.onRowClick(r, i); } : undefined, onMouseEnter: props.onRowHover ? function () { props.onRowHover(r, i); } : undefined, onMouseLeave: props.onRowHover ? function () { props.onRowHover(null, null); } : undefined }, cols.map(function (c) {
            var isNum = c.type && c.type !== 'text' && c.type !== 'var' && c.type !== 'verdict';
            var weak = c.weakBelow !== undefined && typeof r[c.key] === 'number' && Math.abs(r[c.key]) < c.weakBelow;
            return h('td', { key: c.key, className: cx('is-' + (c.align || (isNum ? 'num' : 'text')), weak && 'is-weak') }, cell(c, r, opts));
          }));
        })))),
      props.note ? h('div', { className: 'sx-rtable-note' }, h('i', null, 'Uwaga. '), props.note) : null);
  }

  function LoadingHeatmap(props) {
    var items = props.items || [], factors = props.factors || [], L = props.loadings || [];
    var cut = props.cutoff === undefined ? 0.4 : props.cutoff;
    var opts = { decimal: props.decimal || DEC(), leadingZero: props.leadingZero };
    var removed = props.removed || [], stab = props.stability, lowStab = props.stabilityCutoff || 0.75;
    var labels = props.labels || {};
    var click = props.onRowClick;
    return h('div', { className: cx('sx-heat', click && 'is-interactive', props.className) },
      h('table', null,
        h('thead', null, h('tr', null, h('th', { className: 'sx-heat-corner' }, props.corner || __sxT('Pozycja')), factors.map(function (f) { return h('th', { key: f }, f); }),
          props.communality ? h('th', { className: 'sx-heat-h2' }, 'h²') : null,
          stab ? h('th', { className: 'sx-heat-stab', title: __sxT('Odsetek prób bootstrap, w których pozycja trafia do tego samego czynnika') }, __sxT('Stabilność')) : null)),
        h('tbody', null, items.map(function (it, i) {
          var row = L[i] || [];
          var maxAbs = 0, cross = 0;
          row.forEach(function (v) { if (Math.abs(v) > maxAbs) maxAbs = Math.abs(v); });
          row.forEach(function (v) { if (Math.abs(v) >= cut) cross++; });
          var sorted = row.map(Math.abs).sort(function (a, b) { return b - a; });
          var isCross = cross > 1 || (props.crossRule && sorted[1] >= props.crossRule.min && sorted[0] - sorted[1] < props.crossRule.gap);
          var off = removed.indexOf(it) >= 0;
          var lab = labels[it] || (Array.isArray(labels) ? labels[i] : undefined);
          return h('tr', { key: it, className: cx(props.selected === it && 'is-sel', off && 'is-removed'), tabIndex: click ? 0 : undefined, title: lab,
            'aria-selected': click ? props.selected === it : undefined,
            onClick: click ? function () { click(it, i); } : undefined,
            onContextMenu: props.onRowContextMenu ? function (e) { e.preventDefault(); props.onRowContextMenu(it, i, e); } : undefined,
            onKeyDown: click ? function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); click(it, i); } } : undefined },
            h('th', { scope: 'row' }, h('span', { className: 'sx-heat-rowh' }, h('code', { className: 'sx-var' }, it), isCross ? h(Icon, { name: 'ok', size: 13, className: 'sx-tone-ok', title: __sxT('ładunek krzyżowy') }) : null, maxAbs < cut ? h(Icon, { name: 'poor', size: 13, className: 'sx-tone-poor', title: __sxT('brak ładunku ≥ ') + fmt(cut, 2) }) : null)),
            row.map(function (v, j) {
              var a = Math.min(1, Math.abs(v));
              var mix = Math.round(a * 40);
              var bg = 'color-mix(in oklab, var(' + (v < 0 ? '--heat-neg' : '--heat-pos') + ') ' + mix + '%, var(--surface))';
              return h('td', { key: j, className: cx(Math.abs(v) >= cut ? 'is-strong' : 'is-weak'), style: { background: bg } }, fmt(v, 2, opts));
            }),
            props.communality ? h('td', { className: 'sx-heat-h2' }, fmt(props.communality[i], 2, opts)) : null,
            stab ? h('td', { className: cx('sx-heat-stab', stab[i] < lowStab && 'is-low') }, h('span', { className: 'sx-heat-sbar', 'aria-hidden': true }, h('i', { style: { width: Math.round(stab[i] * 100) + '%' } })), h('span', { className: 'sx-heat-sval' }, Math.round(stab[i] * 100) + '%')) : null);
        })),
        props.explained ? h('tfoot', null, h('tr', null, h('th', { scope: 'row' }, props.explainedLabel || '% wariancji'), props.explained.map(function (v, j) { return h('td', { key: j }, fmt(v, 1, opts)); }),
          props.communality ? h('td', { className: 'sx-heat-h2' }) : null, stab ? h('td', null) : null)) : null),
      props.legend !== false ? h('div', { className: 'sx-heat-legend' },
        h('span', { className: 'sx-heat-sw is-neg' }), h('span', null, 'ujemne'),
        h('span', { className: 'sx-heat-sw is-pos' }), h('span', null, 'dodatnie'),
        removed.length ? h('span', { className: 'sx-heat-legend-rm' }, __sxT('Wiersze przekreślone: pominięte w CFA')) : null,
        h('span', { className: 'sx-heat-legend-note' }, 'Pogrubione: |λ| ≥ ' + fmt(cut, 2, opts) + __sxT('. Symbol trójkąta: ładunek krzyżowy, ośmiokąta: brak ładunku.') + (stab ? __sxT(' Stabilność: odsetek prób bootstrap, w których pozycja trafia do tego samego czynnika.') : ''))) : null);
  }

  function FactorConsensus(props) {
    var crit = props.criteria || [];
    var max = props.max || Math.max.apply(null, crit.map(function (c) { return c.k; }).concat([6]));
    var ks = []; for (var q = 1; q <= max; q++) ks.push(q);
    var votes = ks.map(function (k) { return crit.filter(function (c) { return c.k === k; }).length; });
    var recVotes = ks.map(function (k) { return crit.filter(function (c) { return c.k === k && c.recommended; }).length; });
    var top = props.consensus;
    if (top === undefined) { top = 1; ks.forEach(function (k, i) { var b = top - 1; if (votes[i] > votes[b] || (votes[i] === votes[b] && recVotes[i] > recVotes[b])) top = k; }); }
    var st = useState(top);
    var value = props.value !== undefined ? props.value : st[0];
    function pick(k) { if (props.value === undefined) st[1](k); if (props.onChange) props.onChange(k); }
    var hc = useState(null), hr = useState(null);
    var hk = hc[0] !== null ? hc[0] : props.hovered || null;
    function hoverK(k) { hc[1](k); if (props.onHover) props.onHover(k); }
    var vmax = Math.max.apply(null, votes.concat([1]));
    var nRec = crit.filter(function (c) { return c.recommended; }).length;
    var row = hr[0] !== null ? crit[hr[0]] : null;
    var read = row ? h('span', null, h('b', null, row.name + ': ' + row.k + plFactors(row.k)), row.note ? ' - ' + row.note : '')
      : hk ? h('span', null, h('b', null, hk + plFactors(hk) + ': '), votes[hk - 1] + ' z ' + crit.length + __sxT(' kryteriów') + (recVotes[hk - 1] ? __sxT(', w tym ') + recVotes[hk - 1] + ' z ' + nRec + ' zalecanych' : ''))
      : h('span', null, h('b', null, 'Konsensus: ' + top + plFactors(top)), ' - ' + votes[top - 1] + ' z ' + crit.length + __sxT(' kryteriów') + (nRec ? __sxT(', w tym ') + recVotes[top - 1] + ' z ' + nRec + ' zalecanych' : ''));
    return h('div', { className: cx('sx-cons', props.className) },
      h('table', { className: 'sx-cons-table' },
        h('caption', { className: 'sx-cons-cap' }, props.caption || __sxT('Liczba czynników wskazana przez każde kryterium')),
        h('thead', null, h('tr', null,
          h('th', { className: 'sx-cons-ch', scope: 'col' }, 'Kryterium'),
          ks.map(function (k) {
            return h('th', { key: k, scope: 'col', className: cx('sx-cons-col', k === value && 'is-sel', k === hk && 'is-hcol') },
              h('button', { type: 'button', className: cx('sx-cons-kbtn', k === value && 'is-on'), 'aria-pressed': k === value, 'aria-label': k + plFactors(k), onClick: function () { pick(k); }, onMouseEnter: function () { hoverK(k); }, onMouseLeave: function () { hoverK(null); }, onFocus: function () { hoverK(k); }, onBlur: function () { hoverK(null); } }, k));
          }),
          h('th', { className: 'sx-cons-res', scope: 'col' }, __sxT('Wynik')))),
        h('tbody', null, crit.map(function (c, ri) {
          return h('tr', { key: c.id || ri, className: cx(!c.recommended && c.aux && 'is-aux', hr[0] === ri && 'is-hover'), onMouseEnter: function () { hr[1](ri); }, onMouseLeave: function () { hr[1](null); } },
            h('th', { scope: 'row', className: 'sx-cons-name' },
              h('span', { className: 'sx-cons-nm' }, c.name),
              c.source || c.recommended ? h('span', { className: 'sx-cons-src' }, c.source, c.recommended ? h('span', { className: 'sx-cons-rec' }, 'zalecane') : null) : null),
            ks.map(function (k) {
              var hit = c.k === k;
              return h('td', { key: k, className: cx('sx-cons-cell', k === value && 'is-sel', k === hk && 'is-hcol'), onClick: function () { pick(k); }, onMouseEnter: function () { hoverK(k); }, onMouseLeave: function () { hoverK(null); } },
                h('span', { className: 'sx-cons-track', 'aria-hidden': true }),
                hit ? h('span', { className: cx('sx-cons-dot', c.recommended ? 'is-rec' : c.aux ? 'is-aux' : 'is-std', k === value && 'is-on'), title: c.name + ': ' + k + plFactors(k) }) : null);
            }),
            h('td', { className: 'sx-cons-res' }, c.k));
        })),
        h('tfoot', null, h('tr', null,
          h('th', { scope: 'row', className: 'sx-cons-name' }, h('span', { className: 'sx-cons-nm' }, __sxT('Głosy'))),
          ks.map(function (k, i) {
            return h('td', { key: k, className: cx('sx-cons-vcell', k === value && 'is-sel', k === hk && 'is-hcol') },
              h('button', { type: 'button', className: cx('sx-cons-vote', k === top && 'is-top', k === value && 'is-on'), onClick: function () { pick(k); }, onMouseEnter: function () { hoverK(k); }, onMouseLeave: function () { hoverK(null); }, 'aria-label': k + plFactors(k) + ': ' + votes[i] + __sxT(' głosów') },
                h('span', { className: 'sx-cons-n' }, votes[i] || ''),
                h('span', { className: 'sx-cons-bar', style: { height: votes[i] ? Math.max(4, votes[i] / vmax * 44) : 0 } })));
          }),
          h('td', { className: 'sx-cons-res' })))),
      h('div', { className: 'sx-cons-foot' },
        h('span', { className: 'sx-lg sx-lg-cons-rec' }, __sxT('zalecane w symulacjach')),
        h('span', { className: 'sx-lg sx-lg-cons-std' }, 'standardowe'),
        h('span', { className: 'sx-lg sx-lg-cons-aux' }, 'pomocnicze'),
        h('span', { className: 'sx-lg sx-lg-cons-top' }, 'konsensus'),
        h('span', { className: 'sx-cons-read', role: 'status' }, read)));
  }

  function SampleSplit(props) {
    var parts = props.parts || [];
    var n = props.n || parts.reduce(function (a, p) { return a + p.n; }, 0);
    return h('div', { className: cx('sx-ssplit', props.className) },
      h('div', { className: 'sx-ssplit-bar', role: 'img', 'aria-label': parts.map(function (p) { return p.label + ' ' + p.n; }).join(', ') },
        parts.map(function (p, i) {
          return h('div', { key: i, className: cx('sx-ssplit-seg', 'sx-ssplit-' + (p.tone || 'neutral'), p.active && 'is-active', p.dim && 'is-dim'), style: { flexGrow: p.n, flexBasis: 0 } },
            p.icon ? h(Icon, { name: p.icon, size: 15 }) : null,
            h('span', { className: 'sx-ssplit-lbl' }, p.label),
            h('b', null, fmt(p.n, 0)));
        })),
      h('div', { className: 'sx-ssplit-meta' },
        h('span', null, 'N = ' + fmt(n, 0)),
        props.method ? h('span', null, props.method) : null,
        props.seed !== undefined ? h('span', { className: 'sx-badge sx-badge-neutral' }, 'ziarno ' + props.seed) : null),
      parts.some(function (p) { return p.note; }) ? h('ul', { className: 'sx-ssplit-notes' }, parts.map(function (p, i) {
        return p.note ? h('li', { key: i }, h('span', { className: 'sx-ssplit-key sx-ssplit-' + (p.tone || 'neutral') }), h('span', null, h('b', null, p.label), ' - ' + p.note)) : null;
      })) : null);
  }

  /* ---------- Charts (SVG, token colors) ---------- */
  function plFactors(k) { return k === 1 ? ' czynnik' : (k % 10 >= 2 && k % 10 <= 4 && (k % 100 < 12 || k % 100 > 14)) ? ' czynniki' : __sxT(' czynników'); }
  function ScreePlot(props) {
    var eig = props.eigenvalues || [], par = props.parallel || [];
    var W = props.width || 520, H = props.height || 280, m = { l: 40, r: 16, t: 16, b: 40 };
    var n = eig.length, ymax = Math.ceil(Math.max.apply(null, eig.concat(par, [1])) * 1.05);
    var x = function (i) { return m.l + (n <= 1 ? 0 : i / (n - 1)) * (W - m.l - m.r); };
    var y = function (v) { return H - m.b - v / ymax * (H - m.t - m.b); };
    var k = props.suggested;
    if (k === undefined) { k = 0; for (var i = 0; i < n; i++) { if (par[i] !== undefined && eig[i] > par[i]) k = i + 1; else break; } }
    var sel = props.selected || k;
    var hs = useState(null);
    var hv = hs[0] !== null ? hs[0] : (props.hovered ? props.hovered - 1 : null);
    var svg = React.useRef(null);
    var interactive = !!props.onSelect || props.tooltip !== false;
    function setHover(i) { hs[1](i); if (props.onHover) props.onHover(i === null ? null : i + 1); }
    function move(e) {
      var r = svg.current.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width * W;
      var i = Math.round((px - m.l) / (W - m.l - m.r) * (n - 1));
      setHover(Math.max(0, Math.min(n - 1, i)));
    }
    function key(e) {
      var cur = hv === null ? sel - 1 : hv;
      if (e.key === 'ArrowRight') { e.preventDefault(); setHover(Math.min(n - 1, cur + 1)); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setHover(Math.max(0, cur - 1)); }
      else if ((e.key === 'Enter' || e.key === ' ') && props.onSelect && hv !== null) { e.preventDefault(); props.onSelect(hv + 1); }
    }
    var line = function (arr) { return arr.map(function (v, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); }).join(' '); };
    var ticks = []; var step = ymax <= 6 ? 1 : ymax <= 12 ? 2 : Math.ceil(ymax / 5); ymax = Math.ceil(ymax / step) * step; for (var t = 0; t <= ymax + 1e-9; t += step) ticks.push(t);
    var dec = props.decimal || DEC();
    var opts = { decimal: dec };
    var tip = null;
    if (hv !== null && props.tooltip !== false && eig[hv] !== undefined) {
      var above = par[hv] !== undefined ? eig[hv] > par[hv] : null;
      tip = h('div', { className: 'sx-tip', role: 'status', style: { left: Math.min(x(hv) / W * 100 + 2, 64) + '%', top: Math.max(0, y(eig[hv]) / H * 100 - 30) + '%' } },
        h('div', { className: 'sx-tip-v' }, __sxT('Czynnik ') + (hv + 1) + ': ' + fmt(eig[hv], 2, opts)),
        h('div', { className: 'sx-tip-l' }, par[hv] !== undefined ? __sxT('próg analizy równoległej ') + fmt(par[hv], 2, opts) : __sxT('wartość własna')),
        above !== null ? h('div', { className: 'sx-tip-n' }, above ? __sxT('powyżej progu - czynnik zachowany') : __sxT('poniżej progu')) : null,
        props.onSelect ? h('div', { className: 'sx-tip-n' }, __sxT('Kliknij, aby wybrać ') + (hv + 1) + plFactors(hv + 1)) : null);
    }
    return h('figure', { className: cx('sx-chart', 'sx-scree', props.onSelect && 'is-interactive', props.className), style: { position: 'relative' } },
      h('svg', { ref: svg, viewBox: '0 0 ' + W + ' ' + H, style: { maxWidth: props.fluid ? undefined : W }, role: 'img', tabIndex: interactive ? 0 : undefined,
        'aria-label': 'Wykres osypiska z analizą równoległą; sugerowana liczba czynników: ' + k + (sel !== k ? ', wybrana: ' + sel : ''),
        onMouseMove: interactive ? move : undefined, onMouseLeave: interactive ? function () { setHover(null); } : undefined, onKeyDown: interactive ? key : undefined, onBlur: interactive ? function () { setHover(null); } : undefined,
        onClick: props.onSelect ? function () { if (hv !== null) props.onSelect(hv + 1); } : undefined },
        ticks.map(function (t, i) { return h('g', { key: 't' + i }, h('line', { className: 'sx-grid', x1: m.l, x2: W - m.r, y1: y(t), y2: y(t) }), h('text', { className: 'sx-tick', x: m.l - 8, y: y(t) + 4, textAnchor: 'end' }, String(+t.toFixed(1)).replace('.', dec))); }),
        eig.map(function (_, i) { return h('text', { key: 'x' + i, className: cx('sx-tick', i === hv && 'is-hover'), x: x(i), y: H - m.b + 18, textAnchor: 'middle' }, i + 1); }),
        h('text', { className: 'sx-axis-label', x: (m.l + W - m.r) / 2, y: H - 4, textAnchor: 'middle' }, __sxT('Numer czynnika')),
        props.kaiser !== false ? h('g', null, h('line', { className: 'sx-kaiser', x1: m.l, x2: W - m.r, y1: y(1), y2: y(1) }), h('text', { className: 'sx-tick', x: W - m.r, y: y(1) - 6, textAnchor: 'end' }, 'Kaiser = 1')) : null,
        sel > 0 ? h('rect', { className: 'sx-scree-zone', x: m.l - 10, y: m.t, width: x(sel - 1) - m.l + 20, height: H - m.t - m.b, rx: 6 }) : null,
        hv !== null ? h('line', { className: 'sx-scree-guide', x1: x(hv), x2: x(hv), y1: m.t, y2: H - m.b }) : null,
        par.length ? h('path', { className: 'sx-line sx-line-par', d: line(par) }) : null,
        h('path', { className: 'sx-line sx-line-eig', d: line(eig) }),
        par.map(function (v, i) { return h('rect', { key: 'p' + i, className: 'sx-pt-par', x: x(i) - 3, y: y(v) - 3, width: 6, height: 6, rx: 1 }); }),
        sel !== k && sel > 0 && eig[sel - 1] !== undefined ? h('circle', { className: 'sx-scree-sel', cx: x(sel - 1), cy: y(eig[sel - 1]), r: 9 }) : null,
        eig.map(function (v, i) { return h('circle', { key: 'e' + i, className: cx('sx-pt-eig', i === k - 1 && 'is-pick', i === hv && 'is-hover'), cx: x(i), cy: y(v), r: i === k - 1 ? 6 : i === hv ? 5 : 3.5 }); })),
      tip,
      h('figcaption', { className: 'sx-legend' },
        h('span', { className: 'sx-lg sx-lg-eig' }, __sxT('Wartości własne danych')),
        par.length ? h('span', { className: 'sx-lg sx-lg-par' }, __sxT('Analiza równoległa (95. percentyl)')) : null,
        k > 0 ? h('span', { className: 'sx-lg sx-lg-pick' }, (props.suggestedLabel || __sxT('Sugerowane')) + ': ' + k + plFactors(k)) : null,
        sel !== k ? h('span', { className: 'sx-lg sx-lg-sel' }, 'Wybrane: ' + sel + plFactors(sel)) : null));
  }

  function niceStep(raw) {
    var p = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  }
  function ChartTip(props) {
    if (!props.tip) return null;
    return h('div', { className: 'sx-tip', role: 'status', style: { left: props.tip.x, top: props.tip.y } },
      h('div', { className: 'sx-tip-v' }, props.tip.value),
      props.tip.label ? h('div', { className: 'sx-tip-l' }, props.tip.label) : null,
      props.tip.note ? h('div', { className: 'sx-tip-n' }, props.tip.note) : null);
  }
  function ForestPlot(props) {
    var rows = props.rows || [];
    var hasSub = rows.some(function (r) { return r.sub; });
    var W = props.width || 640, rowH = props.rowHeight || (hasSub ? 44 : 34);
    var m = { l: props.labelWidth || 210, r: props.valueWidth === undefined ? 150 : props.valueWidth, t: 12, b: 34 };
    var H = m.t + rows.length * rowH + m.b;
    var lo = props.min, hi = props.max;
    if (lo === undefined || hi === undefined) {
      var all = []; rows.forEach(function (r) { all.push(r.lo, r.hi); });
      lo = lo === undefined ? Math.min(0, Math.floor(Math.min.apply(null, all) * 10) / 10) : lo;
      hi = hi === undefined ? Math.ceil(Math.max.apply(null, all) * 10) / 10 : hi;
    }
    var x = function (v) { return m.l + (v - lo) / (hi - lo) * (W - m.l - m.r); };
    var ticks = []; var st = props.tickStep || niceStep((hi - lo) / 5); for (var t = lo; t <= hi + 1e-9; t += st) ticks.push(Math.round(t * 1000) / 1000);
    var opts = { decimal: props.decimal || DEC() };
    var hs = useState(null), hover = hs[0], setHover = hs[1];
    var fig = useRef(null);
    var interactive = !!(props.onSelect || props.tooltip !== false);
    function enter(i, ev) {
      setHover(i); if (props.onHover) props.onHover(i);
    }
    function leave() { setHover(null); if (props.onHover) props.onHover(null); }
    var tip = null;
    var hv = props.hovered !== undefined && props.hovered !== null ? props.hovered : hover;
    if (props.tooltip !== false && hover !== null && rows[hover] && fig.current) {
      var r0 = rows[hover], sw = fig.current.getBoundingClientRect().width / W;
      var dlt = Math.round((r0.est - props.reference) / props.reference * 100);
      var refTxt = props.reference !== undefined ? (dlt > 0 ? '+' : dlt < 0 ? '\u2212' : '') + Math.abs(dlt) + __sxT('% względem ') + (props.referenceShort || __sxT('pełnego SEM')) : null;
      tip = { x: Math.min(x(r0.hi) * sw + 12, (W - m.r) * sw - 180), y: (m.t + hover * rowH) * sw, value: fmt(r0.est, 2, opts) + ' [' + fmt(r0.lo, 2, opts) + '; ' + fmt(r0.hi, 2, opts) + ']', label: r0.label, note: refTxt };
    }
    return h('figure', { ref: fig, className: cx('sx-chart sx-forest', interactive && 'is-interactive', props.className), style: { position: 'relative' } },
      h('svg', { viewBox: '0 0 ' + W + ' ' + H, style: { maxWidth: props.fluid ? undefined : W }, role: 'img', 'aria-label': props.label || __sxT('Wykres leśny: ten sam efekt w różnych podejściach') },
        rows.map(function (r, i) {
          var cy = m.t + i * rowH;
          return h('rect', { key: 'b' + i, className: cx('sx-forest-band', i % 2 === 0 && 'is-even', props.selected === i && 'is-sel', hv === i && 'is-hover'), x: 0, y: cy, width: W, height: rowH, rx: 6 });
        }),
        props.band ? h('rect', { className: 'sx-forest-refband', x: x(props.band[0]), y: m.t, width: x(props.band[1]) - x(props.band[0]), height: rows.length * rowH }) : null,
        ticks.map(function (t, i) { return h('g', { key: i }, h('line', { className: 'sx-grid', x1: x(t), x2: x(t), y1: m.t, y2: H - m.b }), h('text', { className: 'sx-tick', x: x(t), y: H - m.b + 18, textAnchor: 'middle' }, fmt(t, Math.abs(st * 10 - Math.round(st * 10)) > 1e-9 ? 2 : 1, opts))); }),
        lo < 0 && hi > 0 ? h('line', { className: 'sx-zero', x1: x(0), x2: x(0), y1: m.t, y2: H - m.b }) : null,
        props.reference !== undefined ? h('line', { className: 'sx-ref', x1: x(props.reference), x2: x(props.reference), y1: m.t - 4, y2: H - m.b }) : null,
        rows.map(function (r, i) {
          var cy = m.t + i * rowH + rowH / 2, ly = r.sub ? cy - 3 : cy + 4;
          return h('g', {
            key: i, className: cx('sx-forest-row', r.highlight && 'is-hl', props.selected === i && 'is-sel', hv === i && 'is-hover', r.muted && 'is-muted'),
            tabIndex: props.onSelect ? 0 : undefined, role: props.onSelect ? 'button' : undefined, 'aria-pressed': props.onSelect ? props.selected === i : undefined,
            'aria-label': props.onSelect ? r.label + ': ' + fmt(r.est, 2, opts) + ' [' + fmt(r.lo, 2, opts) + '; ' + fmt(r.hi, 2, opts) + ']' : undefined,
            onMouseEnter: function (ev) { enter(i, ev); }, onMouseLeave: leave, onFocus: function (ev) { enter(i, ev); }, onBlur: leave,
            onClick: props.onSelect ? function () { props.onSelect(i); } : undefined,
            onKeyDown: props.onSelect ? function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); props.onSelect(i); } } : undefined
          },
            h('rect', { className: 'sx-forest-hit', x: 0, y: cy - rowH / 2, width: W, height: rowH }),
            h('text', { className: 'sx-forest-label', x: 12, y: ly }, r.label),
            r.sub ? h('text', { className: 'sx-forest-sub', x: 12, y: cy + 13 }, r.sub) : null,
            h('line', { className: 'sx-forest-ci', x1: x(r.lo), x2: x(r.hi), y1: cy, y2: cy }),
            h('line', { className: 'sx-forest-ci', x1: x(r.lo), x2: x(r.lo), y1: cy - 5, y2: cy + 5 }),
            h('line', { className: 'sx-forest-ci', x1: x(r.hi), x2: x(r.hi), y1: cy - 5, y2: cy + 5 }),
            h('rect', { className: 'sx-forest-pt', x: x(r.est) - 6, y: cy - 6, width: 12, height: 12, rx: 2.5 }),
            m.r ? h('text', { className: 'sx-forest-val', x: W - 12, y: cy + 4, textAnchor: 'end' }, fmt(r.est, 2, opts) + ' [' + fmt(r.lo, 2, opts) + '; ' + fmt(r.hi, 2, opts) + ']') : null);
        }),
        h('text', { className: 'sx-axis-label', x: (m.l + W - m.r) / 2, y: H - 4, textAnchor: 'middle' }, props.axisLabel || __sxT('β (standaryzowany) z 95% CI'))),
      h(ChartTip, { tip: tip }),
      props.legend !== false && (props.reference !== undefined || props.band) ? h('figcaption', { className: 'sx-legend' },
        props.reference !== undefined ? h('span', { className: 'sx-lg sx-lg-ref' }, props.referenceLabel || __sxT('Pełny SEM (punkt odniesienia)')) : null,
        props.band ? h('span', { className: 'sx-lg sx-lg-band' }, props.bandLabel || __sxT('95% CI pełnego SEM')) : null,
        rows.some(function (r) { return r.highlight; }) ? h('span', { className: 'sx-lg sx-lg-hl' }, props.highlightLabel || __sxT('Rekomendowane do raportu')) : null,
        h('span', { className: 'sx-lg sx-lg-pt' }, props.otherLabel || __sxT('Pozostałe podejścia'))) : null);
  }

  /* ---------- WaterfallChart: decomposition of a difference ---------- */
  function WaterfallChart(props) {
    var steps = props.steps || [];
    var W = props.width || 560, H = props.height || 280, m = { l: 44, r: 16, t: 28, b: 54 };
    var opts = { decimal: props.decimal || DEC() };
    var run = 0, end = 0, bars = [];
    steps.forEach(function (s, i) {
      var kind = s.kind || 'step', a, b;
      if (kind === 'start') { a = 0; b = s.value; run = s.value; }
      else if (kind === 'end') { a = 0; b = s.value === undefined ? run : s.value; end = b; }
      else if (kind === 'aside') { a = end || run; b = a + s.value; }
      else { a = run; b = run + s.value; run = b; }
      bars.push({ s: s, i: i, kind: kind, a: a, b: b });
    });
    var vals = []; bars.forEach(function (b) { vals.push(b.a, b.b); });
    var lo = props.min !== undefined ? props.min : Math.min(0, Math.min.apply(null, vals));
    var hi = props.max !== undefined ? props.max : Math.ceil(Math.max.apply(null, vals) * 10 + 0.5) / 10;
    var y = function (v) { return H - m.b - (v - lo) / (hi - lo) * (H - m.t - m.b); };
    var slot = (W - m.l - m.r) / Math.max(1, bars.length), bw = Math.min(props.barWidth || 28, slot * 0.6);
    var cxs = function (i) { return m.l + slot * i + slot / 2; };
    var ticks = []; var st = props.tickStep || 0.1; for (var t = lo; t <= hi + 1e-9; t += st) ticks.push(Math.round(t * 1000) / 1000);
    var hs = useState(null), hover = hs[0], setHover = hs[1];
    var fig = useRef(null), id = useUid('wf');
    var tip = null;
    if (hover !== null && fig.current) {
      var bb = bars[hover], sw = fig.current.getBoundingClientRect().width / W;
      var d = bb.b - bb.a;
      tip = { x: Math.min(cxs(hover) * sw + bw * sw / 2 + 8, W * sw - 190), y: Math.min(y(Math.max(bb.a, bb.b)), y(Math.min(bb.a, bb.b))) * sw - 8,
        value: bb.kind === 'start' || bb.kind === 'end' ? fmt(bb.b, 2, opts) : (d >= 0 ? '+' : '') + fmt(d, 2, opts), label: String(bb.s.label).replace(/\n/g, ' '), note: bb.s.note };
    }
    return h('figure', { ref: fig, className: cx('sx-chart sx-wf', props.className), style: { position: 'relative' } },
      h('svg', { viewBox: '0 0 ' + W + ' ' + H, style: { maxWidth: props.fluid ? undefined : W }, role: 'img', 'aria-label': props.label || __sxT('Dekompozycja różnicy między podejściami') },
        h('defs', null, h('pattern', { id: id + 'h', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, h('rect', { width: 6, height: 6, className: 'sx-wf-hatch-bg' }), h('line', { x1: 0, y1: 0, x2: 0, y2: 6, className: 'sx-wf-hatch' }))),
        ticks.map(function (t, i) { return h('g', { key: 't' + i }, h('line', { className: 'sx-grid', x1: m.l, x2: W - m.r, y1: y(t), y2: y(t) }), h('text', { className: 'sx-tick', x: m.l - 8, y: y(t) + 4, textAnchor: 'end' }, fmt(t, Math.abs(st * 10 - Math.round(st * 10)) > 1e-9 ? 2 : 1, opts))); }),
        props.axisLabel !== false ? h('text', { className: 'sx-axis-label', x: m.l - 8, y: m.t - 14, textAnchor: 'end' }, props.axisLabel || 'β') : null,
        lo < 0 ? h('line', { className: 'sx-zero', x1: m.l, x2: W - m.r, y1: y(0), y2: y(0) }) : null,
        bars.map(function (b, i) {
          if (i === bars.length - 1 || b.kind === 'aside') return null;
          var nx = bars[i + 1]; if (nx.kind === 'aside') return null;
          var lv = b.b;
          return h('line', { key: 'c' + i, className: 'sx-wf-conn', x1: cxs(i) + bw / 2, x2: cxs(i + 1) - bw / 2, y1: y(lv), y2: y(lv) });
        }),
        bars.map(function (b, i) {
          var top = y(Math.max(b.a, b.b)), bot = y(Math.min(b.a, b.b)), hgt = Math.max(2, bot - top);
          var neg = b.b < b.a;
          var cls = b.kind === 'start' ? 'is-start' : b.kind === 'end' ? 'is-end' : b.kind === 'aside' ? 'is-aside' : neg ? 'is-neg' : 'is-pos';
          var d = b.b - b.a;
          var lbl = b.kind === 'start' || b.kind === 'end' ? fmt(b.b, 2, opts) : (d >= 0 ? '+' : '') + fmt(d, 2, opts);
          var lines = String(b.s.label).split('\n');
          return h('g', { key: i, className: cx('sx-wf-bar', cls, hover === i && 'is-hover'), tabIndex: 0, onMouseEnter: function () { setHover(i); }, onMouseLeave: function () { setHover(null); }, onFocus: function () { setHover(i); }, onBlur: function () { setHover(null); } },
            h('rect', { className: 'sx-wf-hit', x: cxs(i) - slot / 2, y: m.t - 20, width: slot, height: H - m.t - m.b + 20 }),
            h('rect', { className: 'sx-wf-rect', x: cxs(i) - bw / 2, y: top, width: bw, height: hgt, rx: 4, fill: b.kind === 'aside' ? 'url(#' + id + 'h)' : undefined }),
            h('text', { className: 'sx-wf-val', x: cxs(i), y: (neg ? bot + 15 : top - 7), textAnchor: 'middle' }, lbl),
            lines.map(function (ln, k) { return h('text', { key: k, className: 'sx-wf-cat', x: cxs(i), y: H - m.b + 18 + k * 14, textAnchor: 'middle' }, ln); }));
        })),
      h(ChartTip, { tip: tip }),
      props.legend !== false ? h('figcaption', { className: 'sx-legend' },
        h('span', { className: 'sx-lg sx-lg-sq sx-lg-wf-start' }, props.startLabel || __sxT('Punkt wyjścia')),
        h('span', { className: 'sx-lg sx-lg-sq sx-lg-wf-pos' }, 'Wzrost'),
        bars.some(function (b) { return b.kind === 'step' && b.b < b.a; }) ? h('span', { className: 'sx-lg sx-lg-sq sx-lg-wf-neg' }, 'Spadek') : null,
        h('span', { className: 'sx-lg sx-lg-sq sx-lg-wf-end' }, props.endLabel || __sxT('Wynik końcowy')),
        bars.some(function (b) { return b.kind === 'aside'; }) ? h('span', { className: 'sx-lg sx-lg-sq sx-lg-wf-aside' }, props.asideLabel || __sxT('Efekt poboczny')) : null) : null);
  }

  /* ---------- Slider ---------- */
  function Slider(props) {
    var min = props.min === undefined ? 0 : props.min, max = props.max === undefined ? 100 : props.max, step = props.step || 1;
    var st = useState(props.defaultValue !== undefined ? props.defaultValue : min);
    var v = props.value !== undefined ? props.value : st[0];
    var id = useUid('sl');
    var pct = (v - min) / (max - min) * 100;
    var show = props.format ? props.format(v) : String(v);
    return h('div', { className: cx('sx-slider', props.className) },
      props.label ? h('div', { className: 'sx-slider-top' }, h('label', { htmlFor: id, className: 'sx-slider-label' }, props.label), h('output', { htmlFor: id, className: 'sx-slider-val' }, show)) : null,
      h('div', { className: 'sx-slider-track-wrap' },
        h('input', { id: id, type: 'range', className: 'sx-slider-input', min: min, max: max, step: step, value: v, style: { '--sx-pct': pct + '%' }, 'aria-valuetext': show, disabled: props.disabled,
          onChange: function (e) { var nv = parseFloat(e.target.value); if (props.value === undefined) st[1](nv); if (props.onChange) props.onChange(nv); } }),
        (props.marks || []).map(function (mk, i) {
          return h('span', { key: i, className: cx('sx-slider-mark', mk.emphasis && 'is-em'), style: { left: ((mk.value - min) / (max - min) * 100) + '%' } }, h('span', { className: 'sx-slider-mark-t' }, mk.label));
        })),
      props.hint ? h('div', { className: 'sx-slider-hint' }, props.hint) : null);
  }

  /* ---------- StatTile ---------- */
  function StatTile(props) {
    return h('div', { className: cx('sx-stat', props.tone && 'sx-stat-' + props.tone, props.className) },
      h('div', { className: 'sx-stat-top' }, props.icon ? h('span', { className: 'sx-stat-ico' }, h(Icon, { name: props.icon, size: 16 })) : null, h('span', { className: 'sx-stat-label' }, props.label)),
      h('div', { className: 'sx-stat-value' }, props.value, props.unit ? h('span', { className: 'sx-stat-unit' }, props.unit) : null),
      props.meter !== undefined ? h('div', { className: 'sx-stat-meter', 'aria-hidden': true }, h('i', { style: { width: Math.max(0, Math.min(1, props.meter)) * 100 + '%' } })) : null,
      props.note ? h('div', { className: 'sx-stat-note' }, props.note) : null);
  }

  function edgePoint(n, tx, ty) {
    var dx = tx - n.x, dy = ty - n.y;
    if (dx === 0 && dy === 0) return { x: n.x, y: n.y };
    var t;
    if (n.kind === 'latent') { t = 1 / Math.sqrt((dx * dx) / (n.rx * n.rx) + (dy * dy) / (n.ry * n.ry)); }
    else { t = Math.min(n.hw / Math.abs(dx || 1e-9), n.hh / Math.abs(dy || 1e-9)); }
    return { x: n.x + dx * t, y: n.y + dy * t };
  }
  function PathDiagram(props) {
    var W = props.width || 560, H = props.height || 320;
    var id = useUid('pd');
    var map = {};
    var nodes = (props.nodes || []).map(function (n) {
      var o = Object.assign({}, n);
      if (o.kind === 'latent') { o.rx = n.rx || 46; o.ry = n.ry || 24; } else { o.hw = (n.w || 52) / 2; o.hh = (n.h || 30) / 2; }
      map[o.id] = o; return o;
    });
    var opts = { decimal: props.decimal || DEC(), leadingZero: props.leadingZero };
    var edges = (props.edges || []).map(function (e, i) {
      var a = map[e.from], b = map[e.to];
      if (!a || !b) return null;
      var ns = e.p !== undefined && e.p >= 0.05;
      var lbl = e.label !== undefined ? e.label : (e.est !== undefined ? fmt(e.est, 2, opts) + (e.p !== undefined ? stars(e.p) : '') : null);
      if (e.kind === 'cov') {
        var p1 = edgePoint(a, b.x, b.y - 0), p2 = edgePoint(b, a.x, a.y);
        var bend = e.bend || 40;
        var mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
        var dx = p2.x - p1.x, dy = p2.y - p1.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
        var cxp = mx + (-dy / len) * bend, cyp = my + (dx / len) * bend;
        var q1 = edgePoint(a, cxp, cyp), q2 = edgePoint(b, cxp, cyp);
        var lx = (q1.x + 2 * cxp + q2.x) / 4, ly = (q1.y + 2 * cyp + q2.y) / 4;
        return { i: i, d: 'M' + q1.x + ' ' + q1.y + ' Q' + cxp + ' ' + cyp + ' ' + q2.x + ' ' + q2.y, cov: true, ns: ns, lbl: lbl, lx: lx, ly: ly };
      }
      var s = edgePoint(a, b.x, b.y), t = edgePoint(b, a.x, a.y);
      var f = e.labelAt === undefined ? 0.5 : e.labelAt;
      return { i: i, d: 'M' + s.x + ' ' + s.y + ' L' + t.x + ' ' + t.y, ns: ns, lbl: lbl, lx: s.x + (t.x - s.x) * f, ly: s.y + (t.y - s.y) * f, loading: e.kind === 'loading' };
    }).filter(Boolean);
    return h('figure', { className: cx('sx-chart sx-path', props.className) },
      h('svg', { viewBox: '0 0 ' + W + ' ' + H, style: { maxWidth: W }, role: 'img', 'aria-label': props.label || __sxT('Diagram ścieżek modelu') },
        h('defs', null,
          h('marker', { id: id + 'a', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, h('path', { d: 'M0 0L10 5L0 10z', className: 'sx-arrow' })),
          h('marker', { id: id + 'n', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, h('path', { d: 'M0 0L10 5L0 10z', className: 'sx-arrow-ns' }))),
        edges.map(function (e) {
          var mk = 'url(#' + id + (e.ns ? 'n' : 'a') + ')';
          return h('path', { key: 'e' + e.i, className: cx('sx-edge', e.ns && 'is-ns', e.cov && 'is-cov', e.loading && 'is-loading'), d: e.d, markerEnd: mk, markerStart: e.cov ? mk : undefined });
        }),
        nodes.map(function (n) {
          return h('g', { key: n.id, className: cx('sx-node', 'is-' + (n.kind || 'observed'), n.highlight && 'is-hl') },
            n.kind === 'latent' ? h('ellipse', { cx: n.x, cy: n.y, rx: n.rx, ry: n.ry }) : h('rect', { x: n.x - n.hw, y: n.y - n.hh, width: n.hw * 2, height: n.hh * 2, rx: 4 }),
            h('text', { x: n.x, y: n.y + (n.r2 !== undefined && n.kind === 'latent' ? 0 : 4.5), textAnchor: 'middle' }, n.label || n.id),
            n.r2 !== undefined && n.kind === 'latent' ? h('text', { className: 'sx-node-r2', x: n.x, y: n.y + 13, textAnchor: 'middle' }, 'R² = ' + fmt(n.r2, 2, opts)) : null);
        }),
        edges.map(function (e) {
          if (e.lbl === null || e.lbl === undefined) return null;
          var w = String(e.lbl).length * 6.6 + 10;
          return h('g', { key: 'l' + e.i, className: cx('sx-edge-lbl', e.ns && 'is-ns') }, h('rect', { x: e.lx - w / 2, y: e.ly - 9, width: w, height: 18, rx: 4 }), h('text', { x: e.lx, y: e.ly + 4, textAnchor: 'middle' }, e.lbl));
        })),
      props.legend !== false ? h('figcaption', { className: 'sx-legend' },
        h('span', { className: 'sx-lg sx-lg-latent' }, __sxT('zmienna latentna')), h('span', { className: 'sx-lg sx-lg-obs' }, 'obserwowalna'),
        h('span', { className: 'sx-lg sx-lg-sig' }, 'p < 0,05'), h('span', { className: 'sx-lg sx-lg-ns' }, 'nieistotna'),
        h('span', { className: 'sx-lg-txt' }, '* p < 0,05  ** p < 0,01  *** p < 0,001')) : null);
  }

  /* ---------- Data ---------- */
  function VTYPE() { return { continuous: ['1.5', __sxT('ciągła')], ordinal: ['1<5', __sxT('porządkowa')], binary: ['0/1', __sxT('binarna')], nominal: ['A·B', __sxT('nominalna')] }; }
  function VariableChip(props) {
    var t = VTYPE()[props.type] || VTYPE().continuous;
    return h('span', { className: cx('sx-vchip', props.selected && 'is-on', props.reversed && 'is-rev', props.className), title: props.label ? props.name + ' - ' + props.label : undefined },
      h('span', { className: 'sx-vchip-type', title: t[1] }, t[0]),
      h('code', { className: 'sx-vchip-name' }, props.name),
      props.reversed ? h('span', { className: 'sx-vchip-flag', title: __sxT('pozycja odwrócona') }, 'R') : null,
      props.label && props.showLabel ? h('span', { className: 'sx-vchip-label' }, props.label) : null,
      props.onRemove ? h('button', { type: 'button', className: 'sx-vchip-x', onClick: props.onRemove, 'aria-label': __sxT('Usuń ') + props.name }, h(Icon, { name: 'x', size: 12 })) : null);
  }

  function Dropzone(props) {
    var st = useState(false);
    var input = useRef(null);
    var formats = props.formats || ['CSV', 'XLSX', 'SAV', 'DTA', 'SAS', 'Parquet'];
    function files(list) { if (props.onFiles && list && list.length) props.onFiles(Array.prototype.slice.call(list)); }
    return h('div', {
      className: cx('sx-drop', st[0] && 'is-over', props.compact && 'is-compact', props.error && 'is-error', props.className),
      onDragOver: function (e) { e.preventDefault(); st[1](true); }, onDragLeave: function () { st[1](false); },
      onDrop: function (e) { e.preventDefault(); st[1](false); files(e.dataTransfer.files); }
    },
      h('span', { className: 'sx-drop-ico' }, h(Icon, { name: props.error ? 'poor' : 'upload', size: 24 })),
      h('div', { className: 'sx-drop-title' }, props.error ? props.error.title : (props.title || __sxT('Upuść plik z danymi'))),
      h('div', { className: 'sx-drop-sub' }, props.error ? props.error.detail : (props.subtitle || __sxT('albo macierz korelacji z liczebnością próby'))),
      h('div', { className: 'sx-drop-formats' }, formats.map(function (f) { return h('span', { key: f, className: 'sx-drop-fmt' }, f); })),
      h('div', { className: 'sx-drop-actions' },
        h(Button, { variant: 'primary', icon: props.error ? 'upload' : 'data', onClick: function () { if (input.current) input.current.click(); } }, props.error ? (props.error.cta || __sxT('Wybierz inny plik')) : (props.cta || __sxT('Wybierz plik'))),
        props.error && props.error.onFix ? h(Button, { variant: 'secondary', icon: props.error.fixIcon, onClick: props.error.onFix }, props.error.fixLabel) : null,
        props.onSample !== undefined || props.sampleLabel ? h(Button, { variant: 'ghost', onClick: props.onSample }, props.sampleLabel || __sxT('Wczytaj przykładową ankietę')) : null),
      h('input', { ref: input, type: 'file', hidden: true, onChange: function (e) { files(e.target.files); } }),
      props.privacy !== false ? h('div', { className: 'sx-drop-privacy' }, h(Icon, { name: 'lock', size: 14 }), props.privacy || __sxT('Dane nie opuszczają komputera - obliczenia działają w przeglądarce.')) : null);
  }

  var LANGS = { python: 'Python', lavaan: 'lavaan (R)', mplus: 'Mplus' };
  function tokenize(line) {
    var re = /(#.*$|!.*$)|("[^"]*"|'[^']*')|(=~|~~|~|:=|\+|=|\*)|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_][\w.]*(?=\())|(\b(?:import|as|from|def|return|MODEL|ANALYSIS|DATA|VARIABLE|ESTIMATOR|BY|ON|WITH|OUTPUT)\b)/g;
    var out = [], last = 0, m, k = 0;
    while ((m = re.exec(line))) {
      if (m.index > last) out.push(line.slice(last, m.index));
      var cls = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'o' : m[4] ? 'n' : m[5] ? 'f' : 'k';
      out.push(h('span', { key: k++, className: 'sx-tok-' + cls }, m[0]));
      last = m.index + m[0].length;
      if (m[0].length === 0) re.lastIndex++;
    }
    if (last < line.length) out.push(line.slice(last));
    return out;
  }
  function CodeExport(props) {
    var snippets = props.snippets || {};
    var langs = Object.keys(snippets);
    var st = useState(props.defaultLang || langs[0]);
    var cp = useState(false);
    var lang = st[0], code = snippets[lang] || '';
    function copy() {
      try { navigator.clipboard.writeText(code); } catch (e) { /* clipboard unavailable */ }
      cp[1](true); setTimeout(function () { cp[1](false); }, 1600);
    }
    return h('div', { className: cx('sx-code', props.className) },
      h('div', { className: 'sx-code-head' },
        h(Segmented, { size: 'sm', value: lang, onChange: st[1], label: __sxT('Język eksportu'), options: langs.map(function (l) { return { value: l, label: LANGS[l] || l }; }) }),
        h('span', { className: 'sx-code-meta' }, props.meta),
        h(Button, { size: 'sm', variant: 'ghost', icon: cp[0] ? 'check' : 'copy', onClick: copy }, cp[0] ? __sxT('Skopiowano') : __sxT('Kopiuj')),
        props.onDownload ? h(Button, { size: 'sm', variant: 'ghost', icon: 'download', onClick: props.onDownload }, __sxT('Pobierz')) : null),
      h('pre', { className: 'sx-code-pre' }, h('code', null, code.split('\n').map(function (ln, i) {
        return h('span', { key: i, className: 'sx-code-line' }, h('span', { className: 'sx-code-ln', 'aria-hidden': true }, i + 1), h('span', null, tokenize(ln), '\n'));
      }))));
  }

  var LOG_ICON = { remove: 'trash', add: 'plus', change: 'settings', split: 'split', note: 'info', run: 'play' };
  function DecisionLog(props) {
    return h('ol', { className: cx('sx-log', props.className) }, (props.entries || []).map(function (e, i) {
      return h('li', { key: i, className: 'sx-log-item' },
        h('span', { className: 'sx-log-ico' }, h(Icon, { name: LOG_ICON[e.kind] || 'history', size: 14 })),
        h('div', { className: 'sx-log-main' },
          h('div', { className: 'sx-log-top' }, h('span', { className: 'sx-log-action' }, e.action), h('time', { className: 'sx-log-time' }, e.time)),
          e.reason ? h('div', { className: 'sx-log-reason' }, e.reason) : null,
          e.effect ? h('div', { className: 'sx-log-effect' }, e.effect) : null));
    }));
  }


  /* ---------- lavaan syntax: parse and print ---------- */
  var IDENT = /^[A-Za-z_][A-Za-z0-9_.]*$/;
  function parseTerm(t) {
    var s = t.trim(), label = null, fixed = null, m = /^([^*]+)\*(.+)$/.exec(s);
    if (m) { var pre = m[1].trim(); s = m[2].trim(); if (/^-?\d+(\.\d+)?$/.test(pre)) fixed = parseFloat(pre); else label = pre; }
    return { name: s, label: label, fixed: fixed };
  }
  function parseLavaan(text) {
    var names = [], kind = {}, edges = [], defined = [], errors = [];
    function add(n) { if (names.indexOf(n) < 0) names.push(n); }
    String(text || '').split('\n').forEach(function (raw, i) {
      var line = raw.replace(/#.*$/, '').trim();
      if (!line) return;
      var m = /^(.+?)\s*(=~|~~|:=|~)\s*(.*)$/.exec(line);
      if (!m) { errors.push({ line: i + 1, message: __sxT('Nie rozpoznano operatora. Użyj =~ (pomiar), ~ (regresja), ~~ (kowariancja) albo := (efekt).') }); return; }
      var lhs = m[1].trim(), op = m[2], rhs = m[3].trim();
      if (!rhs) { errors.push({ line: i + 1, message: __sxT('Po operatorze ') + op + ' brakuje zmiennych.' }); return; }
      if (op === ':=') { if (!IDENT.test(lhs)) errors.push({ line: i + 1, message: 'Nazwa efektu „' + lhs + __sxT('” jest niepoprawna.') }); else defined.push({ name: lhs, expr: rhs }); return; }
      if (!IDENT.test(lhs)) { errors.push({ line: i + 1, message: '„' + lhs + __sxT('” nie jest poprawną nazwą zmiennej.') }); return; }
      var terms = rhs.split('+').map(parseTerm), bad = terms.filter(function (t) { return !IDENT.test(t.name); });
      if (bad.length) { errors.push({ line: i + 1, message: '„' + bad[0].name + __sxT('” nie jest poprawną nazwą zmiennej.') }); return; }
      add(lhs);
      if (op === '=~') kind[lhs] = 'latent';
      terms.forEach(function (t) {
        add(t.name);
        if (op === '=~') edges.push({ from: lhs, to: t.name, kind: 'loading', label: t.label, fixed: t.fixed, line: i + 1 });
        else if (op === '~') edges.push({ from: t.name, to: lhs, kind: 'path', label: t.label, fixed: t.fixed, line: i + 1 });
        else if (t.name !== lhs) edges.push({ from: lhs, to: t.name, kind: 'cov', label: t.label, fixed: t.fixed, line: i + 1 });
      });
    });
    var seen = {};
    edges = edges.filter(function (e) {
      var k = e.kind === 'cov' ? [e.from, e.to].sort().join('~~') : e.from + '>' + e.to;
      if (seen[k]) { errors.push({ line: e.line, level: 'warn', message: __sxT('Relacja ') + e.from + ' – ' + e.to + ' występuje dwa razy; liczy się pierwsza.' }); return false; }
      seen[k] = true; return true;
    });
    var defNames = defined.map(function (d) { return d.name; });
    defined.forEach(function (d) {
      var labels = edges.map(function (e) { return e.label; }).filter(Boolean);
      (d.expr.match(/[A-Za-z_][A-Za-z0-9_.]*/g) || []).forEach(function (tok) {
        if (labels.indexOf(tok) < 0 && defNames.indexOf(tok) < 0) errors.push({ line: 0, level: 'warn', message: __sxT('Efekt ') + d.name + __sxT(' używa etykiety „') + tok + __sxT('”, której nie ma przy żadnej ścieżce.') });
      });
    });
    return { nodes: names.map(function (n) { return { id: n, kind: kind[n] || 'observed' }; }), edges: edges, defined: defined, errors: errors };
  }
  function termText(e, name) { return (e.fixed !== null && e.fixed !== undefined ? e.fixed + '*' : e.label ? e.label + '*' : '') + name; }
  function printLavaan(model) {
    var nodes = model.nodes || [], edges = model.edges || [], out = [];
    var order = nodes.map(function (n) { return n.id; });
    var lat = nodes.filter(function (n) { return n.kind === 'latent'; });
    var meas = lat.map(function (n) {
      var ls = edges.filter(function (e) { return e.kind === 'loading' && e.from === n.id; });
      return ls.length ? '  ' + n.id + ' =~ ' + ls.map(function (e) { return termText(e, e.to); }).join(' + ') : null;
    }).filter(Boolean);
    if (meas.length) out.push('# Model pomiarowy', meas.join('\n'));
    var targets = [];
    edges.forEach(function (e) { if (e.kind === 'path' && targets.indexOf(e.to) < 0) targets.push(e.to); });
    targets.sort(function (a, b) { return order.indexOf(a) - order.indexOf(b); });
    var reg = targets.map(function (t) { return '  ' + t + ' ~ ' + edges.filter(function (e) { return e.kind === 'path' && e.to === t; }).map(function (e) { return termText(e, e.from); }).join(' + '); });
    if (reg.length) out.push((out.length ? '\n' : '') + '# Model strukturalny', reg.join('\n'));
    var cov = edges.filter(function (e) { return e.kind === 'cov'; }).map(function (e) { return '  ' + e.from + ' ~~ ' + termText(e, e.to); });
    if (cov.length) out.push((out.length ? '\n' : '') + '# Kowariancje', cov.join('\n'));
    var def = (model.defined || []).map(function (d) { return '  ' + d.name + ' := ' + d.expr; });
    if (def.length) out.push((out.length ? '\n' : '') + __sxT('# Efekty pośrednie i całkowite'), def.join('\n'));
    return out.join('\n');
  }
  function identification(model, covariates) {
    var nodes = model.nodes || [], edges = model.edges || [];
    var lat = nodes.filter(function (n) { return n.kind === 'latent'; });
    var obs = nodes.filter(function (n) { return n.kind !== 'latent'; });
    var p = obs.length, moments = p * (p + 1) / 2;
    var loadings = edges.filter(function (e) { return e.kind === 'loading'; }).length;
    var indicatorIds = {}; edges.forEach(function (e) { if (e.kind === 'loading') indicatorIds[e.to] = true; });
    var params = Math.max(0, loadings - lat.length) + Object.keys(indicatorIds).length + lat.length
      + edges.filter(function (e) { return e.kind === 'path' || e.kind === 'cov'; }).length
      + obs.filter(function (n) { return !indicatorIds[n.id]; }).length;
    // Kowariancje dodawane automatycznie przez silnik (jak w lavaan): między zmiennymi egzogenicznymi
    // oraz między resztami czystych zmiennych zależnych - inaczej podgląd zawyża df.
    var pairKey = function (a, b) { return a < b ? a + '|' + b : b + '|' + a; };
    var explicitCov = {}; edges.forEach(function (e) { if (e.kind === 'cov') explicitCov[pairKey(e.from, e.to)] = true; });
    var pathTo = {}, pathFrom = {};
    edges.forEach(function (e) { if (e.kind === 'path') { pathTo[e.to] = true; pathFrom[e.from] = true; } });
    var used = nodes.filter(function (n) { return n.kind === 'latent' || edges.some(function (e) { return e.from === n.id || e.to === n.id; }); });
    var exo = used.filter(function (n) { return !pathTo[n.id] && !indicatorIds[n.id]; }).map(function (n) { return n.id; });
    var pureY = used.filter(function (n) { return pathTo[n.id] && !pathFrom[n.id] && !indicatorIds[n.id]; }).map(function (n) { return n.id; });
    [exo, pureY].forEach(function (set) {
      for (var a = 0; a < set.length; a++) for (var b = a + 1; b < set.length; b++) if (!explicitCov[pairKey(set[a], set[b])]) params += 1;
    });
    var issues = [];
    lat.forEach(function (n) {
      var k = edges.filter(function (e) { return e.kind === 'loading' && e.from === n.id; }).length;
      if (k === 0) issues.push({ level: 'poor', node: n.id, message: n.id + __sxT(' nie ma wskaźników - dodaj co najmniej trzy pozycje.') });
      else if (k < 3) issues.push({ level: 'ok', node: n.id, message: n.id + ' ma ' + k + (k === 1 ? __sxT(' wskaźnik') : __sxT(' wskaźniki')) + __sxT(' - przy mniej niż trzech czynnik jest identyfikowalny tylko w szerszym modelu.') });
    });
    obs.forEach(function (n) { if (!edges.some(function (e) { return e.from === n.id || e.to === n.id; })) issues.push({ level: 'ok', node: n.id, message: n.id + __sxT(' nie jest połączona z modelem.') }); });
    var df = moments - params;
    if (df < 0) issues.unshift({ level: 'poor', message: __sxT('Wstępna kontrola liczby parametrów: df = ') + df + __sxT(' < 0, więc model nie jest identyfikowalny. Usuń ścieżki albo dodaj wskaźniki.') });
    return { p: p, moments: moments, params: params, df: df, issues: issues, ok: df >= 0 && !issues.some(function (i) { return i.level === 'poor'; }) };
  }

  /* ---------- Toolbar ---------- */
  function Toolbar(props) {
    return h('div', { className: cx('sx-toolbar', props.vertical && 'is-vertical', props.className), role: 'toolbar', 'aria-label': props.label || __sxT('Narzędzia') },
      (props.items || []).map(function (it, i) {
        if (it === '|') return h('span', { key: 's' + i, className: 'sx-toolbar-sep', 'aria-hidden': true });
        var on = it.type !== 'action' && it.id === props.value;
        return h('button', {
          key: it.id, type: 'button', className: cx('sx-tool', on && 'is-on'), 'aria-pressed': it.type === 'action' ? undefined : on, 'aria-label': it.label, disabled: it.disabled,
          onClick: function () { if (it.type === 'action') { if (props.onAction) props.onAction(it.id); } else if (props.onChange) props.onChange(it.id); }
        }, it.icon ? h(Icon, { name: it.icon, size: 18 }) : null, it.text ? h('span', { className: 'sx-tool-text' }, it.text) : null,
          h('span', { className: 'sx-tool-tip', role: 'presentation' }, it.label, it.shortcut ? h(Kbd, null, it.shortcut) : null));
      }));
  }

  /* ---------- SyntaxEditor ---------- */
  function SyntaxEditor(props) {
    var ta = useRef(null), pre = useRef(null), gut = useRef(null);
    var value = props.value || '';
    var lines = value.split('\n');
    var diag = props.diagnostics || [], byLine = {};
    diag.forEach(function (d) { if (d.line) byLine[d.line] = d.level === 'warn' ? (byLine[d.line] || 'warn') : 'error'; });
    function sync() { if (pre.current && ta.current) { pre.current.scrollTop = ta.current.scrollTop; pre.current.scrollLeft = ta.current.scrollLeft; } if (gut.current && ta.current) gut.current.scrollTop = ta.current.scrollTop; }
    function onKey(e) {
      if (e.key === 'Tab') {
        e.preventDefault(); var el = e.target, s = el.selectionStart, en = el.selectionEnd;
        var nv = value.slice(0, s) + '  ' + value.slice(en);
        if (props.onChange) props.onChange(nv);
        setTimeout(function () { el.selectionStart = el.selectionEnd = s + 2; }, 0);
      }
      if (props.onKeyDown) props.onKeyDown(e);
    }
    return h('div', { className: cx('sx-syntax', props.className), style: { height: props.height } },
      h('div', { className: 'sx-syntax-body' },
        h('div', { className: 'sx-syntax-gutter', ref: gut, 'aria-hidden': true }, lines.map(function (_, i) {
          var st = byLine[i + 1];
          return h('div', { key: i, className: cx('sx-syntax-ln', st && 'is-' + st) }, st ? h(Icon, { name: st === 'error' ? 'poor' : 'ok', size: 12 }) : i + 1);
        })),
        h('div', { className: 'sx-syntax-area' },
          h('pre', { className: 'sx-syntax-pre', ref: pre, 'aria-hidden': true }, lines.map(function (ln, i) {
            var st = byLine[i + 1];
            return h('div', { key: i, className: cx('sx-syntax-line', st && 'is-' + st, props.activeLines && props.activeLines.indexOf(i + 1) >= 0 && 'is-active') }, tokenize(ln), '​');
          })),
          h('textarea', { ref: ta, className: 'sx-syntax-input', value: value, spellCheck: false, autoCapitalize: 'off', autoComplete: 'off', 'aria-label': props.label || __sxT('Składnia modelu'), readOnly: props.readOnly,
            onChange: function (e) { if (props.onChange) props.onChange(e.target.value); }, onScroll: sync, onKeyDown: onKey, onFocus: props.onFocus, onBlur: props.onBlur }))),
      diag.length ? h('ul', { className: 'sx-syntax-diag' }, diag.slice(0, 3).map(function (d, i) {
        return h('li', { key: i, className: d.level === 'warn' ? 'is-warn' : 'is-error' }, h(Icon, { name: d.level === 'warn' ? 'ok' : 'poor', size: 14 }), d.line ? h('b', null, __sxT('Wiersz ') + d.line + ': ') : null, d.message);
      })) : null);
  }

  /* ---------- ModelCanvas ---------- */
  var NODE = { latent: { rx: 50, ry: 26 }, observed: { w: 64, h: 34 } };
  function geom(n) {
    var o = { id: n.id, kind: n.kind, x: n.x, y: n.y };
    if (n.kind === 'latent') { o.rx = n.rx || NODE.latent.rx; o.ry = n.ry || NODE.latent.ry; } else { o.hw = (n.w || NODE.observed.w) / 2; o.hh = (n.h || NODE.observed.h) / 2; }
    return o;
  }
  function inside(g, x, y) {
    if (g.kind === 'latent') { var dx = (x - g.x) / g.rx, dy = (y - g.y) / g.ry; return dx * dx + dy * dy <= 1.15; }
    return Math.abs(x - g.x) <= g.hw + 3 && Math.abs(y - g.y) <= g.hh + 3;
  }
  function edgeKey(e) { return e.id || (e.kind === 'cov' ? [e.from, e.to].sort().join('~~') : e.from + '>' + e.to); }
  function ModelCanvas(props) {
    var svg = useRef(null), wrap = useRef(null);
    var vs = useState(props.initialView || { k: 1, tx: 0, ty: 0 }), view = vs[0], setView = vs[1];
    var cs = useState(null), conn = cs[0], setConn = cs[1];
    var hs = useState(null), hover = hs[0], setHover = hs[1];
    var drag = useRef(null);
    var id = useUid('mc');
    var tk = useState(0);
    useEffect(function () { tk[1](1); }, []);
    var nodes = props.nodes || [], edges = props.edges || [];
    var G = {}; nodes.forEach(function (n) { G[n.id] = geom(n); });
    var sel = props.selected || null, tool = props.tool || 'select';
    var est = props.estimates || {}, hl = props.highlight || [];
    var snap = props.snap === undefined ? 8 : props.snap;
    function sn(v) { return snap ? Math.round(v / snap) * snap : v; }
    function world(e) { var r = svg.current.getBoundingClientRect(); return { x: (e.clientX - r.left - view.tx) / view.k, y: (e.clientY - r.top - view.ty) / view.k }; }
    function hit(x, y) { for (var i = nodes.length - 1; i >= 0; i--) { var g = G[nodes[i].id]; if (inside(g, x, y)) return g.id; } return null; }
    function connKind(from, to) { if (tool === 'cov' || (conn && conn.kind === 'cov')) return 'cov'; return G[from] && G[from].kind === 'latent' && G[to] && G[to].kind !== 'latent' ? 'loading' : 'path'; }

    useEffect(function () {
      var el = wrap.current; if (!el) return;
      function onWheel(e) {
        e.preventDefault();
        var r = svg.current.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
        setView(function (v) {
          if (e.ctrlKey || e.metaKey) {
            var k = Math.max(0.4, Math.min(2.5, v.k * Math.exp(-e.deltaY * 0.0022)));
            return { k: k, tx: mx - (mx - v.tx) * k / v.k, ty: my - (my - v.ty) * k / v.k };
          }
          return { k: v.k, tx: v.tx - e.deltaX, ty: v.ty - e.deltaY };
        });
      }
      el.addEventListener('wheel', onWheel, { passive: false });
      return function () { el.removeEventListener('wheel', onWheel); };
    }, []);

    function fit() {
      if (!nodes.length || !svg.current) return;
      var r = svg.current.getBoundingClientRect();
      var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      nodes.forEach(function (n) { var g = G[n.id], w = g.rx || g.hw, hh = g.ry || g.hh; x0 = Math.min(x0, g.x - w); x1 = Math.max(x1, g.x + w); y0 = Math.min(y0, g.y - hh); y1 = Math.max(y1, g.y + hh); });
      var P = Object.assign({ top: 56, right: 56, bottom: 56, left: 56 }, props.fitPad || {});
      var aw = r.width - P.left - P.right, ah = r.height - P.top - P.bottom;
      var k = Math.max(0.4, Math.min(1.4, Math.min(aw / (x1 - x0), ah / (y1 - y0))));
      setView({ k: k, tx: P.left + (aw - (x1 - x0) * k) / 2 - x0 * k, ty: P.top + (ah - (y1 - y0) * k) / 2 - y0 * k });
    }
    useEffect(function () { if (props.fitOnMount) fit(); }, []);
    useEffect(function () { if (props.fitKey) fit(); }, [props.fitKey]);
    function zoomBy(f) {
      var r = svg.current.getBoundingClientRect(), mx = r.width / 2, my = r.height / 2;
      setView(function (v) { var k = Math.max(0.4, Math.min(2.5, v.k * f)); return { k: k, tx: mx - (mx - v.tx) * k / v.k, ty: my - (my - v.ty) * k / v.k }; });
    }

    function down(e) {
      if (e.button !== 0) return;
      wrap.current && wrap.current.focus({ preventScroll: true });
      var p = world(e), target = e.target.getAttribute && e.target.getAttribute('data-port');
      var nodeId = target || hit(p.x, p.y);
      var edgeId = !nodeId && e.target.getAttribute && e.target.getAttribute('data-edge');
      svg.current.setPointerCapture(e.pointerId);
      if (target) { setConn({ from: target, x: p.x, y: p.y, kind: tool === 'cov' ? 'cov' : 'path' }); return; }
      if (nodeId) {
        if (tool === 'path' || tool === 'cov') { setConn({ from: nodeId, x: p.x, y: p.y, kind: tool }); return; }
        if (props.onSelect) props.onSelect({ type: 'node', id: nodeId });
        drag.current = { type: 'node', id: nodeId, dx: p.x - G[nodeId].x, dy: p.y - G[nodeId].y, moved: false };
        return;
      }
      if (edgeId) { if (props.onSelect) props.onSelect({ type: 'edge', id: edgeId }); return; }
      if ((tool === 'latent' || tool === 'observed') && props.onCreateNode) { props.onCreateNode(tool, sn(p.x), sn(p.y)); return; }
      if (props.onSelect) props.onSelect(null);
      drag.current = { type: 'pan', sx: e.clientX, sy: e.clientY, tx: view.tx, ty: view.ty };
    }
    function move(e) {
      var d = drag.current;
      if (conn) { var p = world(e); setConn(Object.assign({}, conn, { x: p.x, y: p.y, over: hit(p.x, p.y) })); return; }
      if (d && d.type === 'node') { var q = world(e); d.moved = true; if (props.onMoveNode) props.onMoveNode(d.id, sn(q.x - d.dx), sn(q.y - d.dy), false); return; }
      if (d && d.type === 'pan') { setView({ k: view.k, tx: d.tx + e.clientX - d.sx, ty: d.ty + e.clientY - d.sy }); return; }
      var w = world(e); var hv = hit(w.x, w.y); if (hv !== hover) setHover(hv);
    }
    function up(e) {
      var d = drag.current; drag.current = null;
      if (conn) {
        var p = world(e), to = hit(p.x, p.y);
        if (to && to !== conn.from && props.onCreateEdge) props.onCreateEdge(conn.from, to, conn.kind === 'cov' ? 'cov' : connKind(conn.from, to));
        setConn(null); return;
      }
      if (d && d.type === 'node' && d.moved && props.onMoveNode) { var q = world(e); props.onMoveNode(d.id, sn(q.x - d.dx), sn(q.y - d.dy), true); }
    }
    function key(e) {
      if ((e.key === 'Delete' || e.key === 'Backspace') && sel && props.onDelete) { e.preventDefault(); props.onDelete(sel); }
      if (e.key === 'Escape') { setConn(null); if (props.onSelect) props.onSelect(null); }
    }

    var opts = { decimal: props.decimal || DEC() };
    var drawn = edges.map(function (e) {
      var a = G[e.from], b = G[e.to]; if (!a || !b) return null;
      var k = edgeKey(e), es = est[k], ns = es && es.p !== undefined && es.p >= 0.05;
      var lbl = null;
      if (props.showEstimates && es && es.est !== undefined) lbl = fmt(es.est, 2, opts) + (e.kind === 'loading' ? '' : stars(es.p));
      if (e.label && props.showLabels !== false) lbl = lbl ? e.label + ' = ' + lbl : e.label;
      var d, lx, ly;
      if (e.kind === 'cov') {
        var bend = e.bend || 44, s0 = edgePoint(a, b.x, b.y), t0 = edgePoint(b, a.x, a.y);
        var dx = t0.x - s0.x, dy = t0.y - s0.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
        var cxp = (s0.x + t0.x) / 2 + (-dy / len) * bend, cyp = (s0.y + t0.y) / 2 + (dx / len) * bend;
        var q1 = edgePoint(a, cxp, cyp), q2 = edgePoint(b, cxp, cyp);
        d = 'M' + q1.x + ' ' + q1.y + ' Q' + cxp + ' ' + cyp + ' ' + q2.x + ' ' + q2.y;
        lx = (q1.x + 2 * cxp + q2.x) / 4; ly = (q1.y + 2 * cyp + q2.y) / 4;
      } else {
        var s = edgePoint(a, b.x, b.y), t = edgePoint(b, a.x, a.y);
        d = 'M' + s.x + ' ' + s.y + ' L' + t.x + ' ' + t.y;
        var f = e.kind === 'loading' ? 0.5 : 0.5; lx = s.x + (t.x - s.x) * f; ly = s.y + (t.y - s.y) * f;
      }
      var isSel = sel && sel.type === 'edge' && sel.id === k, isHl = hl.indexOf(k) >= 0;
      return { k: k, e: e, d: d, lx: lx, ly: ly, lbl: lbl, ns: ns, sel: isSel, hl: isHl };
    }).filter(Boolean);
    function mk(dd) { return 'url(#' + id + (dd.sel || dd.hl ? 'h' : dd.ns ? 'n' : dd.e.kind === 'loading' ? 'l' : 'a') + ')'; }

    var showPorts = function (nid) { return tool !== 'latent' && tool !== 'observed' && ((sel && sel.type === 'node' && sel.id === nid) || hover === nid || (conn && conn.over === nid)); };
    var tmpLine = null;
    if (conn && G[conn.from]) {
      var tgt = conn.over && conn.over !== conn.from ? G[conn.over] : null;
      var st0 = edgePoint(G[conn.from], tgt ? tgt.x : conn.x, tgt ? tgt.y : conn.y);
      var en0 = tgt ? edgePoint(tgt, G[conn.from].x, G[conn.from].y) : { x: conn.x, y: conn.y };
      tmpLine = h('path', { className: 'sx-mc-tmp', d: 'M' + st0.x + ' ' + st0.y + ' L' + en0.x + ' ' + en0.y, markerEnd: 'url(#' + id + 'h)', markerStart: conn.kind === 'cov' ? 'url(#' + id + 'h)' : undefined });
    }

    // minimap
    var mm = null;
    if (props.minimap !== false && nodes.length && svg.current) {
      var R = svg.current.getBoundingClientRect();
      var vx0 = -view.tx / view.k, vy0 = -view.ty / view.k, vw = R.width / view.k, vh = R.height / view.k;
      var bx0 = vx0, by0 = vy0, bx1 = vx0 + vw, by1 = vy0 + vh;
      nodes.forEach(function (n) { var g = G[n.id]; bx0 = Math.min(bx0, g.x - 60); by0 = Math.min(by0, g.y - 40); bx1 = Math.max(bx1, g.x + 60); by1 = Math.max(by1, g.y + 40); });
      var MW = 168, MH = 104, sc = Math.min(MW / (bx1 - bx0), MH / (by1 - by0));
      mm = h('div', { className: 'sx-mc-mini', 'aria-hidden': true }, h('svg', { width: MW, height: MH },
        h('g', { transform: 'translate(' + ((MW - (bx1 - bx0) * sc) / 2) + ',' + ((MH - (by1 - by0) * sc) / 2) + ') scale(' + sc + ') translate(' + (-bx0) + ',' + (-by0) + ')' },
          edges.map(function (e, i) { var a = G[e.from], b = G[e.to]; return a && b ? h('line', { key: i, className: 'sx-mc-mini-e', x1: a.x, y1: a.y, x2: b.x, y2: b.y }) : null; }),
          nodes.map(function (n) { var g = G[n.id]; return g.kind === 'latent' ? h('ellipse', { key: n.id, className: 'sx-mc-mini-l', cx: g.x, cy: g.y, rx: g.rx, ry: g.ry }) : h('rect', { key: n.id, className: 'sx-mc-mini-o', x: g.x - g.hw, y: g.y - g.hh, width: g.hw * 2, height: g.hh * 2, rx: 4 }); }),
          h('rect', { className: 'sx-mc-mini-view', x: vx0, y: vy0, width: vw, height: vh, rx: 6 / sc }))));
    }

    var gridSize = 24 * view.k;
    return h('div', {
      ref: wrap, tabIndex: 0, className: cx('sx-mc', 'tool-' + tool, props.stale && 'is-stale', conn && 'is-connecting', props.className), onKeyDown: key, 'aria-label': props.label || __sxT('Płótno modelu'),
      onDragOver: props.onDropItem ? function (e) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } : undefined,
      onDrop: props.onDropItem ? function (e) { e.preventDefault(); var p = world(e); props.onDropItem(e.dataTransfer.getData('text/plain'), sn(p.x), sn(p.y)); } : undefined,
      style: Object.assign({ backgroundSize: gridSize + 'px ' + gridSize + 'px', backgroundPosition: view.tx + 'px ' + view.ty + 'px' }, props.style)
    },
      h('svg', { ref: svg, className: 'sx-mc-svg', onPointerDown: down, onPointerMove: move, onPointerUp: up, onPointerLeave: function () { setHover(null); },
        onContextMenu: props.onContextMenu ? function (e) {
          e.preventDefault(); setConn(null);
          var p = world(e), nid = hit(p.x, p.y), eid = !nid && e.target.getAttribute && e.target.getAttribute('data-edge');
          var t = nid ? { type: 'node', id: nid } : eid ? { type: 'edge', id: eid } : null;
          if (props.onSelect) props.onSelect(t);
          props.onContextMenu(t, { x: e.clientX, y: e.clientY });
        } : undefined },
        h('defs', null, ['a', 'n', 'l', 'h'].map(function (c) {
          return h('marker', { key: c, id: id + c, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, h('path', { d: 'M0 0L10 5L0 10z', className: 'sx-mc-arrow-' + c }));
        })),
        h('g', { transform: 'translate(' + view.tx + ',' + view.ty + ') scale(' + view.k + ')' },
          drawn.map(function (dd) {
            return h('g', { key: dd.k, className: cx('sx-mc-edge', 'is-' + dd.e.kind, dd.ns && 'is-ns', dd.sel && 'is-sel', dd.hl && 'is-hl') },
              h('path', { className: 'sx-mc-edge-hit', d: dd.d, 'data-edge': dd.k }),
              h('path', { className: 'sx-mc-edge-line', d: dd.d, markerEnd: mk(dd), markerStart: dd.e.kind === 'cov' ? mk(dd) : undefined }));
          }),
          nodes.map(function (n) {
            var g = G[n.id], isSel = sel && sel.type === 'node' && sel.id === n.id, r2 = props.showEstimates && props.r2 && props.r2[n.id];
            var ports = showPorts(n.id) ? (g.kind === 'latent' ? [[0, -g.ry], [g.rx, 0], [0, g.ry], [-g.rx, 0]] : [[0, -g.hh], [g.hw, 0], [0, g.hh], [-g.hw, 0]]) : [];
            return h('g', { key: n.id, className: cx('sx-mc-node', 'is-' + g.kind, isSel && 'is-sel', hover === n.id && 'is-hover', conn && conn.over === n.id && conn.from !== n.id && 'is-target', (props.dim || []).indexOf(n.id) >= 0 && 'is-dim', (props.flagged || []).indexOf(n.id) >= 0 && 'is-flag') },
              isSel ? (g.kind === 'latent' ? h('ellipse', { className: 'sx-mc-ring', cx: g.x, cy: g.y, rx: g.rx + 5, ry: g.ry + 5 }) : h('rect', { className: 'sx-mc-ring', x: g.x - g.hw - 5, y: g.y - g.hh - 5, width: g.hw * 2 + 10, height: g.hh * 2 + 10, rx: 9 })) : null,
              g.kind === 'latent' ? h('ellipse', { className: 'sx-mc-shape', cx: g.x, cy: g.y, rx: g.rx, ry: g.ry }) : h('rect', { className: 'sx-mc-shape', x: g.x - g.hw, y: g.y - g.hh, width: g.hw * 2, height: g.hh * 2, rx: 6 }),
              h('text', { className: 'sx-mc-name', x: g.x, y: g.y + (r2 ? -1 : 4.5), textAnchor: 'middle' }, n.label || n.id),
              r2 ? h('text', { className: 'sx-mc-r2', x: g.x, y: g.y + 13, textAnchor: 'middle' }, 'R² ' + fmt(r2, 2, opts)) : null,
              (props.flagged || []).indexOf(n.id) >= 0 ? h('circle', { className: 'sx-mc-flag', cx: g.x + (g.rx || g.hw) - 4, cy: g.y - (g.ry || g.hh) + 2, r: 5 }) : null,
              ports.map(function (pp, i) { return h('circle', { key: i, className: 'sx-mc-port', 'data-port': n.id, cx: g.x + pp[0], cy: g.y + pp[1], r: 5 }); }));
          }),
          drawn.map(function (dd) {
            if (!dd.lbl) return null;
            var w = String(dd.lbl).length * 6.7 + 14;
            return h('g', { key: 'l' + dd.k, className: cx('sx-mc-lbl', dd.ns && 'is-ns', dd.sel && 'is-sel', dd.hl && 'is-hl'), 'data-edge': dd.k },
              h('rect', { x: dd.lx - w / 2, y: dd.ly - 10, width: w, height: 20, rx: 10, 'data-edge': dd.k }), h('text', { x: dd.lx, y: dd.ly + 4, textAnchor: 'middle', 'data-edge': dd.k }, dd.lbl));
          }),
          tmpLine)),
      !nodes.length ? h('div', { className: 'sx-mc-empty' }, h(Icon, { name: 'sem', size: 28 }), h('div', { className: 'sx-mc-empty-t' }, props.emptyTitle || __sxT('Puste płótno')), h('div', null, props.emptyText || __sxT('Przeciągnij czynnik z biblioteki albo wpisz składnię lavaan.'))) : null,
      props.children,
      mm,
      props.controls !== false ? h('div', { className: 'sx-mc-zoom' },
        h('button', { type: 'button', onClick: function () { zoomBy(1 / 1.2); }, 'aria-label': __sxT('Oddal') }, h(Icon, { name: 'zoom-out', size: 16 })),
        h('button', { type: 'button', className: 'sx-mc-zoom-val', onClick: function () { setView({ k: 1, tx: view.tx, ty: view.ty }); }, 'aria-label': 'Skala 100%' }, Math.round(view.k * 100) + '%'),
        h('button', { type: 'button', onClick: function () { zoomBy(1.2); }, 'aria-label': __sxT('Przybliż') }, h(Icon, { name: 'zoom-in', size: 16 })),
        h('span', { className: 'sx-mc-zoom-sep' }),
        h('button', { type: 'button', onClick: fit, 'aria-label': __sxT('Dopasuj do widoku') }, h(Icon, { name: 'fit', size: 16 }))) : null);
  }

  /* ---------- ChoiceGroup: large radio cards ---------- */
  function ChoiceGroup(props) {
    var opts = props.options || [];
    var st = useState(props.defaultValue);
    var value = props.value !== undefined ? props.value : st[0];
    function pick(v) { if (props.value === undefined) st[1](v); if (props.onChange) props.onChange(v); }
    function key(e, i) {
      var dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      for (var j = 1; j <= opts.length; j++) { var o = opts[(i + dir * j + opts.length) % opts.length]; if (!o.disabled) { pick(o.value); var el = e.currentTarget.parentNode.querySelector('[data-v="' + o.value + '"]'); if (el) el.focus(); break; } }
    }
    return h('div', { className: cx('sx-choice', props.size === 'sm' && 'is-sm', props.className), role: 'radiogroup', 'aria-label': props.label, style: { gridTemplateColumns: 'repeat(' + (props.columns || 2) + ', minmax(0, 1fr))' } },
      opts.map(function (o, i) {
        var on = o.value === value;
        return h('button', { key: o.value, type: 'button', role: 'radio', 'aria-checked': on, 'data-v': o.value, disabled: o.disabled, tabIndex: on || (value === undefined && i === 0) ? 0 : -1,
          className: cx('sx-choice-item', on && 'is-on'), onClick: function () { pick(o.value); }, onKeyDown: function (e) { key(e, i); } },
          o.icon ? h('span', { className: 'sx-choice-ico' }, h(Icon, { name: o.icon, size: 20 })) : null,
          h('span', { className: 'sx-choice-text' },
            h('span', { className: 'sx-choice-title' }, o.title, o.release ? h(ReleaseTag, { release: o.release }) : null),
            o.desc ? h('span', { className: 'sx-choice-desc' }, o.desc) : null,
            o.meta ? h('span', { className: 'sx-choice-meta' }, o.meta) : null),
          h('span', { className: 'sx-choice-radio', 'aria-hidden': true }, on ? h(Icon, { name: 'check', size: 13, strokeWidth: 2.75 }) : null));
      }));
  }

  /* ---------- StepList: vertical wizard progress ---------- */
  function StepList(props) {
    var steps = props.steps || [];
    return h('ol', { className: cx('sx-steps', props.className), 'aria-label': props.label || __sxT('Kroki') },
      steps.map(function (s, i) {
        var st = s.status || 'todo', can = props.onSelect && st !== 'todo';
        var mark = st === 'done' ? h(Icon, { name: 'check', size: 14, strokeWidth: 2.5 }) : st === 'warn' ? h(Icon, { name: 'ok', size: 14, strokeWidth: 2.25 }) : h('span', null, i + 1);
        return h('li', { key: s.id || i, className: cx('sx-steps-item', 'is-' + st), 'aria-current': st === 'current' ? 'step' : undefined },
          h('button', { type: 'button', className: 'sx-steps-btn', disabled: !can, onClick: can ? function () { props.onSelect(s.id, i); } : undefined },
            h('span', { className: 'sx-steps-dot' }, mark),
            h('span', { className: 'sx-steps-text' }, h('span', { className: 'sx-steps-label' }, s.label), s.desc ? h('span', { className: 'sx-steps-desc' }, s.desc) : null)));
      }));
  }

  /* ---------- RunList: tasks while computing ---------- */
  var RUN_ICON = { done: 'check', warn: 'ok', error: 'poor' };
  function RunList(props) {
    return h('ol', { className: cx('sx-run', props.className), 'aria-live': 'polite' }, (props.tasks || []).map(function (t, i) {
      var st = t.status || 'todo';
      return h('li', { key: t.id || i, className: cx('sx-run-item', 'is-' + st) },
        h('span', { className: 'sx-run-dot', 'aria-hidden': true }, st === 'running' ? h('span', { className: 'sx-spinner' }) : RUN_ICON[st] ? h(Icon, { name: RUN_ICON[st], size: 14, strokeWidth: 2.25 }) : null),
        h('span', { className: 'sx-run-main' }, h('span', { className: 'sx-run-label' }, t.label), t.detail ? h('span', { className: 'sx-run-detail' }, t.detail) : null),
        h('span', { className: 'sx-run-result' }, st === 'todo' ? __sxT('w kolejce') : st === 'running' ? (t.running || __sxT('liczę…')) : t.result));
    }));
  }

  /* ---------- Distribution: small bar chart of a variable ---------- */
  function Distribution(props) {
    var counts = props.counts || [], labels = props.labels || counts.map(function (_, i) { return String(i + 1); });
    var mini = !!props.mini;
    var W = props.width || (mini ? 64 : 320), H = props.height || (mini ? 20 : 150);
    var m = mini ? { l: 0, r: 0, t: 1, b: 0 } : { l: 4, r: 4, t: props.mean !== undefined ? 34 : 18, b: 22 };
    var max = Math.max.apply(null, counts.concat([1])), total = counts.reduce(function (a, b) { return a + b; }, 0) || 1;
    var slot = (W - m.l - m.r) / Math.max(1, counts.length), bw = Math.min(mini ? slot - 2 : 28, slot - (mini ? 2 : 6));
    var hs = useState(null), hv = hs[0], setHv = hs[1];
    var y = function (v) { return H - m.b - v / max * (H - m.t - m.b); };
    var opts = { decimal: props.decimal || DEC() };
    return h('figure', { className: cx('sx-dist', mini && 'is-mini', props.className), style: { position: 'relative' } },
      h('svg', { viewBox: '0 0 ' + W + ' ' + H, width: mini ? W : undefined, height: mini ? H : undefined, style: mini ? null : { width: '100%', height: 'auto', maxWidth: W }, role: 'img', 'aria-label': props.label || __sxT('Rozkład odpowiedzi'), onMouseLeave: function () { setHv(null); } },
        mini ? null : h('line', { className: 'sx-grid', x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b }),
        counts.map(function (c, i) {
          var x = m.l + slot * i + (slot - bw) / 2, top = y(c), hh = Math.max(c > 0 ? 1.5 : 0, H - m.b - top);
          var hl = props.highlight !== undefined && props.highlight === i;
          return h('g', { key: i, onMouseEnter: mini ? undefined : function () { setHv(i); } },
            mini ? null : h('rect', { className: 'sx-dist-hit', x: m.l + slot * i, y: m.t - 18, width: slot, height: H - m.t + 18 }),
            h('rect', { className: cx('sx-dist-bar', hl && 'is-hl', hv === i && 'is-hover'), x: x, y: H - m.b - hh, width: bw, height: hh, rx: mini ? 1 : 3 }),
            mini ? null : h('text', { className: 'sx-tick', x: x + bw / 2, y: H - 6, textAnchor: 'middle' }, labels[i]),
            !mini && props.showValues ? h('text', { className: 'sx-dist-val', x: x + bw / 2, y: top - 5, textAnchor: 'middle' }, Math.round(c / total * 100) + '%') : null);
        }),
        !mini && props.mean !== undefined ? (function () {
          var mx = m.l + slot * (props.mean - (props.meanBase === undefined ? 1 : props.meanBase)) + slot / 2;
          return h('g', null, h('line', { className: 'sx-dist-mean', x1: mx, x2: mx, y1: m.t - 2, y2: H - m.b }), h('text', { className: 'sx-dist-meanlbl', x: mx, y: 10, textAnchor: 'middle' }, 'M = ' + fmt(props.mean, 2, opts)));
        })() : null),
      !mini && hv !== null ? h('div', { className: 'sx-tip', style: { left: Math.min((m.l + slot * hv + slot) / W * 100, 70) + '%', top: 0 } },
        h('div', { className: 'sx-tip-v' }, counts[hv] + ' (' + fmt(counts[hv] / total * 100, 1, opts) + '%)'), h('div', { className: 'sx-tip-l' }, (props.valueLabels && props.valueLabels[hv]) || (__sxT('wartość ') + labels[hv]))) : null);
  }

  /* ---------- DataGrid: spreadsheet view of the raw data ---------- */
  function DataGrid(props) {
    var cols = props.columns || [], rows = props.rows || [];
    var flags = props.rowFlags || {};
    var limit = props.limit || rows.length;
    var sel = props.selectedColumn;
    var opts = { decimal: props.decimal || DEC() };
    function cellText(v, c) {
      if (v === null || v === undefined || (typeof v === 'number' && isNaN(v))) return null;
      if (c.type === 'continuous' && typeof v === 'number' && Math.round(v) !== v) return fmt(v, c.digits === undefined ? 1 : c.digits, opts);
      return String(v);
    }
    return h('div', { className: cx('sx-grid-wrap', props.className), style: { height: props.height } },
      h('table', { className: 'sx-dgrid' },
        h('thead', null, h('tr', null,
          h('th', { className: 'sx-dgrid-corner', scope: 'col' }, '#'),
          cols.map(function (c) {
            var on = c.key === sel;
            return h('th', { key: c.key, scope: 'col', className: cx('sx-dgrid-h', on && 'is-sel', c.flag && 'is-flag-' + c.flag), 'aria-sort': undefined },
              h('button', { type: 'button', className: 'sx-dgrid-hbtn', onClick: props.onSelectColumn ? function () { props.onSelectColumn(c.key); } : undefined, title: c.label },
                h('span', { className: 'sx-dgrid-hname' }, h('code', null, c.key), c.reversed ? h('span', { className: 'sx-vchip-flag', title: __sxT('pozycja odwrócona') }, 'R') : null, c.flag ? h(Icon, { name: c.flag, size: 12, className: 'sx-tone-' + c.flag }) : null),
                c.hist ? h(Distribution, { mini: true, counts: c.hist, width: 56, height: 18 }) : null,
                h('span', { className: 'sx-dgrid-hmeta', title: (VTYPE()[c.type] || VTYPE().continuous)[1] }, (VTYPE()[c.type] || VTYPE().continuous)[0], c.missing !== undefined ? ' · braki ' + fmt(c.missing * 100, 1, opts) + '%' : '')));
          }))),
        h('tbody', null, rows.slice(0, limit).map(function (r, i) {
          var id = props.rowIds ? props.rowIds[i] : i + 1, f = flags[id];
          return h('tr', { key: id, className: cx(f && 'is-' + f) },
            h('th', { scope: 'row', className: 'sx-dgrid-rn' }, f === 'flagged' || f === 'excluded' ? h(Icon, { name: f === 'excluded' ? 'x' : 'ok', size: 11, className: f === 'excluded' ? '' : 'sx-tone-ok' }) : null, id),
            cols.map(function (c, j) {
              var t = cellText(r[j], c);
              return h('td', { key: c.key, className: cx(c.key === sel && 'is-sel', t === null && __sxT('is-na'), c.type !== 'nominal' && 'is-num') }, t === null ? h('span', { 'aria-label': 'brak' }, '·') : t);
            }));
        }))),
      rows.length > limit ? h('div', { className: 'sx-dgrid-more' }, __sxT('Pokazano ') + limit + ' z ' + rows.length + ' wierszy', props.onMore ? h(Button, { size: 'sm', variant: 'ghost', onClick: props.onMore }, __sxT('Pokaż wszystkie')) : null) : null);
  }

  /* ---------- MissingMap: missing-data patterns ---------- */
  function MissingMap(props) {
    var vars = props.variables || [], pats = props.patterns || [];
    var total = pats.reduce(function (a, p) { return a + p.count; }, 0) || 1;
    var maxC = Math.max.apply(null, pats.map(function (p) { return p.count; }).concat([1]));
    var perVar = vars.map(function (_, j) { var s = 0; pats.forEach(function (p) { if (p.missing.indexOf(vars[j]) >= 0) s += p.count; }); return s / total; });
    var maxV = Math.max.apply(null, perVar.concat([0.01]));
    var hs = useState(null), hv = hs[0], setHv = hs[1];
    var opts = { decimal: props.decimal || DEC() };
    return h('div', { className: cx('sx-mmap', props.className), onMouseLeave: function () { setHv(null); } },
      h('table', null,
        h('thead', null,
          h('tr', null, h('th', { className: 'sx-mmap-corner' }, 'Wzorzec'), h('th', { className: 'sx-mmap-ch' }, 'Osoby'),
            vars.map(function (v, j) {
              return h('th', { key: v, className: 'sx-mmap-vh', title: v + ': ' + fmt(perVar[j] * 100, 1, opts) + __sxT('% braków') },
                h('span', { className: 'sx-mmap-vbar' }, h('i', { style: { height: (perVar[j] / maxV * 100) + '%' } })),
                h('code', null, v));
            }))),
        h('tbody', null, pats.map(function (p, i) {
          return h('tr', { key: i, className: cx(hv && hv.r === i && 'is-hover') },
            h('th', { scope: 'row' }, p.label || (p.missing.length ? p.missing.length + ' brak' + (p.missing.length === 1 ? '' : p.missing.length < 5 ? 'i' : __sxT('ów')) : 'kompletne')),
            h('td', { className: 'sx-mmap-count' }, h('span', { className: 'sx-mmap-cbar' }, h('i', { style: { width: (p.count / maxC * 100) + '%' } })), h('span', null, p.count)),
            vars.map(function (v, j) {
              var miss = p.missing.indexOf(v) >= 0;
              return h('td', { key: v, className: cx('sx-mmap-cell', miss ? 'is-miss' : 'is-ok'), onMouseEnter: function () { setHv({ r: i, v: v, miss: miss, count: p.count }); } }, h('span', null));
            }));
        }))),
      h('div', { className: 'sx-mmap-foot' },
        h('span', { className: 'sx-lg sx-lg-sq sx-lg-mm-ok' }, __sxT('odpowiedź')), h('span', { className: 'sx-lg sx-lg-sq sx-lg-mm-miss' }, 'brak'),
        h('span', { className: 'sx-mmap-read', role: 'status' }, hv ? (hv.count + ' ' + (hv.count === 1 ? 'osoba' : __sxT('osób')) + ' · ' + hv.v + ': ' + (hv.miss ? __sxT('brak odpowiedzi') : __sxT('odpowiedź'))) : __sxT('Najedź na komórkę, aby zobaczyć szczegóły.'))));
  }

  /* ---------- ScatterPlot with thresholds ---------- */
  function ScatterPlot(props) {
    var pts = props.points || [];
    var W = props.width || 520, H = props.height || 300, m = { l: 48, r: 16, t: 16, b: 44 };
    var xs = pts.map(function (p) { return p.x; }), ys = pts.map(function (p) { return p.y; });
    var x0 = props.xMin !== undefined ? props.xMin : 0, x1 = props.xMax !== undefined ? props.xMax : Math.ceil(Math.max.apply(null, xs.concat([1])));
    var y0 = props.yMin !== undefined ? props.yMin : 0, y1 = props.yMax !== undefined ? props.yMax : Math.ceil(Math.max.apply(null, ys.concat([1])));
    var X = function (v) { return m.l + (v - x0) / (x1 - x0) * (W - m.l - m.r); };
    var Y = function (v) { return H - m.b - (v - y0) / (y1 - y0) * (H - m.t - m.b); };
    var hs = useState(null), hv = hs[0], setHv = hs[1];
    var svg = useRef(null);
    var opts = { decimal: props.decimal || DEC() };
    var tx = []; var sx = props.xStep || niceStep((x1 - x0) / 6); for (var t = x0; t <= x1 + 1e-9; t += sx) tx.push(Math.round(t * 100) / 100);
    var ty = []; var sy = props.yStep || niceStep((y1 - y0) / 5); for (var u = y0; u <= y1 + 1e-9; u += sy) ty.push(Math.round(u * 100) / 100);
    function move(e) {
      var r = svg.current.getBoundingClientRect(), k = W / r.width, px = (e.clientX - r.left) * k, py = (e.clientY - r.top) * k;
      var best = null, bd = 18 * 18;
      pts.forEach(function (p, i) { var dx = X(p.x) - px, dy = Y(p.y) - py, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } });
      setHv(best); if (props.onHover) props.onHover(best === null ? null : pts[best]);
    }
    var hp = hv !== null ? pts[hv] : null;
    var nFlag = pts.filter(function (p) { return p.flag; }).length;
    return h('figure', { className: cx('sx-chart sx-scatter', props.className), style: { position: 'relative' } },
      h('svg', { ref: svg, viewBox: '0 0 ' + W + ' ' + H, style: { maxWidth: props.fluid ? undefined : W }, role: 'img', 'aria-label': props.label || __sxT('Wykres rozrzutu'), onMouseMove: move, onMouseLeave: function () { setHv(null); if (props.onHover) props.onHover(null); }, onClick: function () { if (hp && props.onSelect) props.onSelect(hp); } },
        props.zone ? h('rect', { className: 'sx-scatter-zone', x: X(props.zone.x0 === undefined ? x0 : props.zone.x0), y: Y(props.zone.y1 === undefined ? y1 : props.zone.y1), width: X(props.zone.x1 === undefined ? x1 : props.zone.x1) - X(props.zone.x0 === undefined ? x0 : props.zone.x0), height: Y(props.zone.y0 === undefined ? y0 : props.zone.y0) - Y(props.zone.y1 === undefined ? y1 : props.zone.y1) }) : null,
        ty.map(function (t, i) { return h('g', { key: 'y' + i }, h('line', { className: 'sx-grid', x1: m.l, x2: W - m.r, y1: Y(t), y2: Y(t) }), h('text', { className: 'sx-tick', x: m.l - 8, y: Y(t) + 4, textAnchor: 'end' }, fmt(t, sy < 1 ? 1 : 0, opts))); }),
        tx.map(function (t, i) { return h('text', { key: 'x' + i, className: 'sx-tick', x: X(t), y: H - m.b + 18, textAnchor: 'middle' }, fmt(t, sx < 1 ? 1 : 0, opts)); }),
        h('text', { className: 'sx-axis-label', x: (m.l + W - m.r) / 2, y: H - 6, textAnchor: 'middle' }, props.xLabel),
        h('text', { className: 'sx-axis-label', x: 12, y: (m.t + H - m.b) / 2, textAnchor: 'middle', transform: 'rotate(-90 12 ' + ((m.t + H - m.b) / 2) + ')' }, props.yLabel),
        props.xThreshold !== undefined ? h('g', null, h('line', { className: 'sx-thr', x1: X(props.xThreshold), x2: X(props.xThreshold), y1: m.t, y2: H - m.b }), h('text', { className: 'sx-thr-lbl', x: X(props.xThreshold) + 4, y: m.t + 10 }, props.xThresholdLabel)) : null,
        props.yThreshold !== undefined ? h('g', null, h('line', { className: 'sx-thr', x1: m.l, x2: W - m.r, y1: Y(props.yThreshold), y2: Y(props.yThreshold) }), h('text', { className: 'sx-thr-lbl', x: W - m.r - 4, y: Y(props.yThreshold) - 6, textAnchor: 'end' }, props.yThresholdLabel)) : null,
        pts.filter(function (p) { return !p.flag; }).map(function (p, i) { return h('circle', { key: 'n' + i, className: 'sx-pt', cx: X(p.x), cy: Y(p.y), r: 3.5 }); }),
        pts.filter(function (p) { return p.flag; }).map(function (p, i) { var cx0 = X(p.x), cy0 = Y(p.y); return h('path', { key: 'f' + i, className: cx('sx-pt-flag', p.excluded && 'is-excluded'), d: 'M' + cx0 + ' ' + (cy0 - 6) + 'L' + (cx0 + 6) + ' ' + cy0 + 'L' + cx0 + ' ' + (cy0 + 6) + 'L' + (cx0 - 6) + ' ' + cy0 + 'Z' }); }),
        hp ? h('circle', { className: 'sx-pt-ring', cx: X(hp.x), cy: Y(hp.y), r: 9 }) : null),
      hp ? h('div', { className: 'sx-tip', style: { left: Math.min(X(hp.x) / W * 100 + 2, 66) + '%', top: Math.max(0, Y(hp.y) / H * 100 - 18) + '%' } },
        h('div', { className: 'sx-tip-v' }, (props.pointLabel ? props.pointLabel(hp) : __sxT('Punkt ') + (hv + 1))), h('div', { className: 'sx-tip-l' }, (props.xShort || 'x') + ' = ' + fmt(hp.x, 1, opts) + ' · ' + (props.yShort || 'y') + ' = ' + fmt(hp.y, 0, opts)), hp.flag ? h('div', { className: 'sx-tip-n' }, hp.note || 'oznaczony') : null) : null,
      props.legend !== false ? h('figcaption', { className: 'sx-legend' },
        h('span', { className: 'sx-lg sx-lg-sc' }, props.normalLabel || __sxT('Pozostali')),
        h('span', { className: 'sx-lg sx-lg-scf' }, (props.flagLabel || __sxT('Oznaczeni')) + ' (' + nFlag + ')'),
        props.zone ? h('span', { className: 'sx-lg sx-lg-sq sx-lg-zone' }, props.zoneLabel || __sxT('Strefa ryzyka')) : null) : null);
  }

  /* ---------- App frame: TopBar ---------- */
  function TopBar(props) {
    var crumbs = props.crumbs || [];
    var st = props.status;
    return h('header', { className: cx('sx-topbar', props.sticky && 'is-sticky', props.className), role: 'banner' },
      props.logo ? h('div', { className: 'sx-topbar-logo' }, props.logo) : null,
      props.project ? h('div', { className: 'sx-topbar-proj' }, h('b', null, props.project.name), props.project.meta ? h('span', null, props.project.meta) : null) : null,
      crumbs.length ? h('nav', { className: 'sx-topbar-crumbs', 'aria-label': __sxT('Ścieżka') }, h('ol', null, crumbs.map(function (c, i) {
        var last = i === crumbs.length - 1;
        return h('li', { key: i, 'aria-current': last ? 'page' : undefined }, i ? h(Icon, { name: 'chevron-right', size: 14 }) : null, last ? h('b', null, c) : h('span', null, c));
      }))) : null,
      st ? h('span', { className: cx('sx-topbar-status', st.tone === 'dirty' && 'is-dirty', st.tone === 'error' && 'is-error'), role: 'status' },
        h(Icon, { name: st.tone === 'dirty' ? 'ok' : st.tone === 'error' ? 'poor' : 'check', size: 14 }), st.text) : null,
      props.meta ? h('div', { className: 'sx-topbar-meta' }, props.meta) : null,
      h('span', { className: 'sx-topbar-grow' }),
      props.search ? h('button', { type: 'button', className: 'sx-topbar-search', onClick: props.search.onOpen },
        h(Icon, { name: 'search', size: 16 }), h('span', { className: 'sx-topbar-search-t' }, props.search.placeholder || 'Szukaj metody…'), h('span', { className: 'sx-topbar-kbd' }, h(Kbd, null, '⌘'), h(Kbd, null, 'K'))) : null,
      props.tools ? h('div', { className: 'sx-topbar-tools' }, props.tools, h('span', { className: 'sx-topbar-sep', 'aria-hidden': true })) : null,
      props.mode !== undefined || props.defaultMode !== undefined ? h(Segmented, { size: props.modeSize || 'sm', label: __sxT('Tryb pracy'), value: props.mode, defaultValue: props.defaultMode, onChange: props.onModeChange,
        options: [{ value: 'simple', label: __sxT('Prosty'), icon: props.modeIcons ? 'layers' : undefined }, { value: 'adv', label: __sxT('Zaawansowany'), icon: props.modeIcons ? 'settings' : undefined }, { value: 'code', label: __sxT('Kod'), icon: props.modeIcons ? 'code' : undefined }] }) : null,
      props.extra || null,
      props.onThemeToggle ? h(Button, { size: 'sm', variant: 'ghost', icon: props.theme === 'dark' ? 'sun' : 'moon', 'aria-label': props.theme === 'dark' ? __sxT('Motyw jasny') : __sxT('Motyw ciemny'), title: props.theme === 'dark' ? __sxT('Motyw jasny') : __sxT('Motyw ciemny'), onClick: props.onThemeToggle }) : null,
      props.actions ? h('div', { className: 'sx-topbar-actions' }, props.actions) : null);
  }

  /* ---------- Feedback: Toast ---------- */
  function Toast(props) {
    var open = props.open !== undefined ? props.open : !!props.message;
    var dur = props.duration === undefined ? 4200 : props.duration;
    var onClose = props.onClose;
    useEffect(function () {
      if (!open || !dur || !onClose) return;
      var t = setTimeout(onClose, dur);
      return function () { clearTimeout(t); };
    }, [open, props.message, dur]);
    if (!open) return null;
    return h('div', { className: cx('sx-toast', 'is-' + (props.placement || 'center'), props.contained && 'is-contained', props.tone && 'sx-toast-' + props.tone, props.className), role: 'status', 'aria-live': 'polite' },
      props.icon ? h(Icon, { name: props.icon, size: 16 }) : null,
      h('span', { className: 'sx-toast-msg' }, props.message || props.children),
      props.actionLabel ? h('button', { type: 'button', className: 'sx-toast-act', onClick: props.onAction }, props.actionLabel) : null,
      onClose && props.dismissible !== false ? h('button', { type: 'button', className: 'sx-toast-x', 'aria-label': __sxT('Zamknij powiadomienie'), onClick: onClose }, h(Icon, { name: 'x', size: 14 })) : null);
  }

  /* ---------- Overlay: Dialog ---------- */
  var FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  function Dialog(props) {
    var box = React.useRef(null), prev = React.useRef(null);
    var tid = useUid('dlg');
    useEffect(function () {
      if (!props.open) return;
      prev.current = document.activeElement;
      var el = box.current;
      var f = el && el.querySelectorAll(FOCUSABLE);
      var target = el && (el.querySelector('[data-autofocus]') || (f && f[f.length - 1]));
      if (target) target.focus();
      return function () { if (prev.current && prev.current.focus) prev.current.focus(); };
    }, [props.open]);
    if (!props.open) return null;
    function key(e) {
      if (e.key === 'Escape' && props.onClose) { e.stopPropagation(); props.onClose(); }
      if (e.key === 'Tab') {
        var f = box.current.querySelectorAll(FOCUSABLE); if (!f.length) return;
        var a = f[0], z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    }
    var danger = props.tone === 'danger';
    var actions = props.actions || (props.onConfirm ? [
      h(Button, { key: 'c', variant: 'ghost', onClick: props.onClose, 'data-autofocus': danger ? true : undefined }, props.cancelLabel || __sxT('Anuluj')),
      h(Button, { key: 'o', variant: danger ? 'danger' : 'primary', icon: props.confirmIcon, onClick: props.onConfirm, 'data-autofocus': danger ? undefined : true }, props.confirmLabel || __sxT('Potwierdź'))] : null);
    return h('div', { className: cx('sx-dialog-layer', props.contained && 'is-contained'), onKeyDown: key },
      h('div', { className: 'sx-dialog-scrim', onClick: props.onClose, 'aria-hidden': true }),
      h('div', { ref: box, className: cx('sx-dialog', danger && 'is-danger', props.className), role: danger ? 'alertdialog' : 'dialog', 'aria-modal': true, 'aria-labelledby': tid, style: props.width ? { width: props.width } : null },
        h('div', { className: 'sx-dialog-head' },
          props.icon ? h('span', { className: cx('sx-dialog-ico', danger && 'is-danger') }, h(Icon, { name: props.icon, size: 20 })) : null,
          h('div', { className: 'sx-dialog-titles' }, h('h2', { id: tid, className: 'sx-dialog-title' }, props.title), props.subtitle ? h('p', { className: 'sx-dialog-sub' }, props.subtitle) : null),
          props.onClose ? h(Button, { size: 'sm', variant: 'ghost', icon: 'x', 'aria-label': __sxT('Zamknij'), className: 'sx-dialog-x', onClick: props.onClose }) : null),
        props.children ? h('div', { className: 'sx-dialog-body' }, props.children) : null,
        actions ? h('div', { className: 'sx-dialog-foot' }, props.footNote ? h('span', { className: 'sx-dialog-note' }, props.footNote) : null, actions) : null));
  }

  /* ---------- Menus ---------- */
  function MenuList(props) {
    var items = props.items || [];
    var ref = React.useRef(null);
    var acts = items.map(function (it, i) { return it.divider || it.group || it.disabled ? -1 : i; }).filter(function (i) { return i >= 0; });
    var st = useState(acts.length ? acts[0] : -1);
    useEffect(function () { if (ref.current) ref.current.focus(); }, []);
    function key(e) {
      var pos = acts.indexOf(st[0]);
      if (e.key === 'ArrowDown') { e.preventDefault(); st[1](acts[(pos + 1) % acts.length]); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); st[1](acts[(pos - 1 + acts.length) % acts.length]); }
      else if (e.key === 'Home') { e.preventDefault(); st[1](acts[0]); }
      else if (e.key === 'End') { e.preventDefault(); st[1](acts[acts.length - 1]); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (st[0] >= 0) props.onPick(items[st[0]]); }
      else if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); props.onClose(); }
    }
    return h('div', { ref: ref, className: cx('sx-menu', props.className), role: 'menu', tabIndex: -1, 'aria-label': props.label, 'aria-activedescendant': st[0] >= 0 ? props.uid + '-' + st[0] : undefined, onKeyDown: key, style: props.style },
      items.map(function (it, i) {
        if (it.divider) return h('div', { key: i, className: 'sx-menu-div', role: 'separator' });
        if (it.group) return h('div', { key: i, className: 'sx-menu-group', role: 'presentation' }, it.group);
        return h('div', { key: i, id: props.uid + '-' + i, role: 'menuitem', 'aria-disabled': it.disabled || undefined, className: cx('sx-menu-item', i === st[0] && 'is-active', it.danger && 'is-danger', it.disabled && 'is-disabled'),
          onMouseEnter: function () { if (!it.disabled) st[1](i); }, onMouseDown: function (e) { e.preventDefault(); }, onClick: function () { if (!it.disabled) props.onPick(it); } },
          h('span', { className: 'sx-menu-ico' }, it.icon ? h(Icon, { name: it.icon, size: 16 }) : it.checked ? h(Icon, { name: 'check', size: 16 }) : null),
          h('span', { className: 'sx-menu-text' }, h('span', { className: 'sx-menu-label' }, it.label), it.hint ? h('span', { className: 'sx-menu-hint' }, it.hint) : null),
          it.shortcut ? h('span', { className: 'sx-menu-kbd' }, it.shortcut) : null);
      }));
  }
  function useOutside(ref, on, cb) {
    useEffect(function () {
      if (!on) return;
      function f(e) { if (ref.current && !ref.current.contains(e.target)) cb(); }
      document.addEventListener('mousedown', f);
      return function () { document.removeEventListener('mousedown', f); };
    }, [on]);
  }
  function Menu(props) {
    var st = useState(!!props.defaultOpen), open = st[0];
    var wrap = React.useRef(null);
    var uid = useUid('menu');
    useOutside(wrap, open, function () { st[1](false); });
    function close(refocus) { st[1](false); var bt = wrap.current && wrap.current.querySelector('button'); if (refocus !== false && bt) bt.focus(); }
    return h('div', { ref: wrap, className: cx('sx-menu-wrap', props.className) },
      h(Button, { variant: props.variant || 'ghost', size: props.size || 'sm', icon: props.icon || (props.label ? undefined : 'more'), iconRight: props.label && props.caret !== false ? 'chevron-down' : undefined,
        'aria-haspopup': 'menu', 'aria-expanded': open, 'aria-controls': open ? uid : undefined, 'aria-label': props.label ? undefined : (props.ariaLabel || __sxT('Więcej działań')), title: props.label ? undefined : (props.ariaLabel || __sxT('Więcej działań')),
        onClick: function () { st[1](!open); }, onKeyDown: function (e) { if (e.key === 'ArrowDown') { e.preventDefault(); st[1](true); } } }, props.label),
      open ? h('div', { id: uid, className: cx('sx-menu-pop', props.align === 'end' && 'is-end', props.up && 'is-up') },
        h(MenuList, { uid: uid, items: props.items, label: props.label || props.ariaLabel, onClose: close, onPick: function (it) { close(); if (props.onSelect) props.onSelect(it.id, it); } })) : null);
  }
  function ContextMenu(props) {
    var ref = React.useRef(null);
    var uid = useUid('ctx');
    var open = props.open !== undefined ? props.open : true;
    useOutside(ref, open, function () { if (props.onClose) props.onClose(); });
    if (!open) return null;
    return h('div', { ref: ref, className: 'sx-menu-pop is-context', style: { left: props.x, top: props.y } },
      props.title ? h('div', { className: 'sx-menu-title' }, props.title) : null,
      h(MenuList, { uid: uid, items: props.items, label: props.title || __sxT('Menu kontekstowe'), onClose: function () { if (props.onClose) props.onClose(); }, onPick: function (it) { if (props.onSelect) props.onSelect(it.id, it); if (props.onClose) props.onClose(); } }));
  }

  /* ---------- Choice: Checkbox, RadioGroup ---------- */
  function Checkbox(props) {
    var ref = React.useRef(null);
    var st = useState(!!props.defaultChecked);
    var on = props.checked !== undefined ? props.checked : st[0];
    useEffect(function () { if (ref.current) ref.current.indeterminate = !!props.indeterminate; }, [props.indeterminate]);
    function change(e) { if (props.checked === undefined) st[1](e.target.checked); if (props.onChange) props.onChange(e.target.checked, e); }
    return h('label', { className: cx('sx-check', props.disabled && 'is-disabled', props.className) },
      h('input', { ref: ref, type: 'checkbox', className: 'sx-check-input', checked: on, disabled: props.disabled, onChange: change, 'aria-label': props.label ? undefined : props.ariaLabel, name: props.name, value: props.value }),
      h('span', { className: cx('sx-check-box', on && 'is-on', props.indeterminate && 'is-mixed'), 'aria-hidden': true }, props.indeterminate ? h(Icon, { name: 'minus', size: 14, strokeWidth: 2.5 }) : on ? h(Icon, { name: 'check', size: 14, strokeWidth: 2.5 }) : null),
      props.label ? h('span', { className: 'sx-check-text' }, h('span', { className: 'sx-check-label' }, props.label), props.hint ? h('span', { className: 'sx-check-hint' }, props.hint) : null) : null);
  }
  function RadioGroup(props) {
    var name = useUid('rg');
    var opts = props.options || [];
    var st = useState(props.defaultValue !== undefined ? props.defaultValue : (opts[0] && opts[0].value));
    var value = props.value !== undefined ? props.value : st[0];
    function pick(v) { if (props.value === undefined) st[1](v); if (props.onChange) props.onChange(v); }
    return h('div', { className: cx('sx-radios', props.direction === 'row' && 'is-row', props.className), role: 'radiogroup', 'aria-label': props.label },
      opts.map(function (o) {
        var on = o.value === value;
        return h('label', { key: o.value, className: cx('sx-radio', o.disabled && 'is-disabled') },
          h('input', { type: 'radio', className: 'sx-check-input', name: props.name || name, value: o.value, checked: on, disabled: o.disabled, onChange: function () { pick(o.value); } }),
          h('span', { className: cx('sx-radio-dot', on && 'is-on'), 'aria-hidden': true }),
          h('span', { className: 'sx-check-text' }, h('span', { className: 'sx-check-label' }, o.label, o.badge ? h('span', { className: 'sx-badge sx-badge-brand sx-radio-badge' }, o.badge) : null), o.hint ? h('span', { className: 'sx-check-hint' }, o.hint) : null));
      }));
  }

  /* ---------- Textarea ---------- */
  function Textarea(props) {
    var rest = omit(props, ['className', 'showCount', 'mono']);
    var st = useState(String(props.defaultValue || ''));
    var len = String(props.value !== undefined ? props.value : st[0]).length;
    var max = props.maxLength;
    return h('span', { className: cx('sx-textarea-wrap', props.className) },
      h('textarea', Object.assign({ rows: 3 }, rest, { className: cx('sx-input', 'sx-textarea', props.mono && 'is-mono'), onChange: function (e) { if (props.value === undefined) st[1](e.target.value); if (props.onChange) props.onChange(e); } })),
      props.showCount || max ? h('span', { className: cx('sx-textarea-count', max && len > max * 0.9 && 'is-near'), 'aria-live': 'polite' }, max ? fmt(len, 0) + ' / ' + fmt(max, 0) : fmt(len, 0) + __sxT(' znaków')) : null);
  }

  /* ---------- States: EmptyState, Skeleton ---------- */
  function EmptyState(props) {
    return h('div', { className: cx('sx-empty', props.size === 'sm' && 'is-sm', props.className) },
      props.icon ? h('span', { className: 'sx-empty-ico' }, h(Icon, { name: props.icon, size: props.size === 'sm' ? 20 : 24 })) : null,
      h('div', { className: 'sx-empty-title' }, props.title),
      props.children ? h('div', { className: 'sx-empty-body' }, props.children) : null,
      props.actions ? h('div', { className: 'sx-empty-actions' }, props.actions) : null,
      props.note ? h('div', { className: 'sx-empty-note' }, props.note) : null);
  }
  function Skeleton(props) {
    var v = props.variant || 'text';
    var label = props.label || 'Wczytywanie…';
    var inner;
    if (v === 'text') {
      var n = props.lines || 3;
      inner = Array.apply(null, Array(n)).map(function (_, i) { return h('span', { key: i, className: 'sx-skel sx-skel-line', style: { width: i === n - 1 && n > 1 ? '62%' : '100%' } }); });
    } else if (v === 'table') {
      var rows = props.rows || 5, cols = props.cols || 4;
      inner = h('div', { className: 'sx-skel-table', style: { gridTemplateColumns: '1.6fr ' + Array(cols).join('1fr ') } },
        Array.apply(null, Array(rows * cols)).map(function (_, i) { return h('span', { key: i, className: cx('sx-skel', i < cols ? 'sx-skel-th' : 'sx-skel-td') }); }));
    } else if (v === 'chart') {
      var hs = props.bars || [62, 88, 48, 74, 36, 54, 28];
      inner = h('div', { className: 'sx-skel-chart', style: { height: props.height || 160 } }, hs.map(function (p, i) { return h('span', { key: i, className: 'sx-skel', style: { height: p + '%' } }); }));
    } else if (v === 'stat') {
      inner = [h('span', { key: 'a', className: 'sx-skel sx-skel-line', style: { width: '45%' } }), h('span', { key: 'b', className: 'sx-skel sx-skel-num' }), h('span', { key: 'c', className: 'sx-skel sx-skel-line', style: { width: '70%' } })];
    } else {
      inner = h('span', { className: cx('sx-skel', v === 'circle' && 'sx-skel-circle'), style: { width: props.width || '100%', height: props.height || 80 } });
    }
    return h('div', { className: cx('sx-skel-wrap', 'sx-skel-' + v + '-wrap', props.className), role: 'status', 'aria-busy': true, 'aria-label': label, style: v === 'text' && props.width ? { width: props.width } : null },
      inner, h('span', { className: 'sx-sr' }, label));
  }


  /* ---------- Diagnosis: what happened, effect, what to do ---------- */
  function Diagnosis(props) {
    var lv = props.level || 'poor';
    var fixes = props.fixes || [];
    var cp = useState(false);
    function copy() {
      var txt = [props.title, props.what, props.effect ? 'Skutek: ' + props.effect : '', props.log || ''].filter(Boolean).join('\n');
      try { navigator.clipboard.writeText(txt); } catch (e) { /* clipboard unavailable */ }
      cp[1](true); setTimeout(function () { cp[1](false); }, 1600);
      if (props.onCopy) props.onCopy();
    }
    return h('section', { className: cx('sx-diag', 'is-' + lv, props.compact && 'is-compact', props.className), role: lv === 'poor' ? 'alert' : 'status' },
      h('div', { className: 'sx-diag-head' },
        h('span', { className: 'sx-diag-ico' }, h(Icon, { name: lv === 'poor' ? 'poor' : lv === 'warn' ? 'ok' : 'info', size: props.compact ? 18 : 20 })),
        h('div', { className: 'sx-diag-titles' },
          props.eyebrow ? h('div', { className: 'sx-diag-eyebrow' }, props.eyebrow) : null,
          h('h3', { className: 'sx-diag-title' }, props.title),
          props.what ? h('p', { className: 'sx-diag-what' }, props.what) : null),
        props.aside ? h('div', { className: 'sx-diag-aside' }, props.aside) : null),
      props.effect ? h('div', { className: 'sx-diag-effect' }, h('b', null, __sxT('Skutek')), h('span', null, props.effect)) : null,
      fixes.length ? h('div', { className: 'sx-diag-fixes' },
        h('div', { className: 'sx-diag-k' }, props.fixesLabel || __sxT('Co zrobić')),
        h('ol', null, fixes.map(function (f, i) {
          return h('li', { key: i, className: cx('sx-diag-fix', f.recommended && 'is-rec', f.done && 'is-done') },
            h('span', { className: 'sx-diag-n', 'aria-hidden': true }, f.done ? h(Icon, { name: 'check', size: 13, strokeWidth: 2.5 }) : i + 1),
            h('div', { className: 'sx-diag-fix-main' },
              h('div', { className: 'sx-diag-fix-t' }, f.title, f.recommended ? h('span', { className: 'sx-badge sx-badge-brand' }, 'zalecane') : null),
              f.detail ? h('div', { className: 'sx-diag-fix-d' }, f.detail) : null),
            f.actionLabel ? h(Button, { size: 'sm', variant: f.recommended ? 'primary' : 'secondary', icon: f.actionIcon, onClick: f.onAction, disabled: f.done }, f.done ? __sxT('Zrobione') : f.actionLabel) : null);
        }))) : null,
      props.children,
      props.log || props.source ? h('div', { className: 'sx-diag-foot' },
        props.log ? h('details', { className: 'sx-diag-log', open: props.logOpen },
          h('summary', null, h(Icon, { name: 'chevron-right', size: 14 }), props.logLabel || __sxT('Szczegóły techniczne')),
          h('pre', null, props.log)) : null,
        h('span', { className: 'sx-diag-foot-r' },
          props.source ? h('span', { className: 'sx-diag-src' }, h(Icon, { name: 'book', size: 13 }), props.source) : null,
          props.log ? h(Button, { size: 'sm', variant: 'ghost', icon: cp[0] ? 'check' : 'copy', onClick: copy }, cp[0] ? __sxT('Skopiowano') : __sxT('Kopiuj diagnostykę')) : null)) : null);
  }

  /* ---------- ThresholdPlot: estimates with CI against threshold zones ---------- */
  function ZONE_WORD() { return { good: __sxT('dobre'), ok: __sxT('akceptowalne'), poor: __sxT('słabe') }; }
  function ThresholdPlot(props) {
    var rows = props.rows || [], series = props.series || [{ key: 'est', label: __sxT('Oszacowanie') }];
    var zones = props.zones || [];
    var min = props.min === undefined ? 0.5 : props.min, max = props.max === undefined ? 1 : props.max;
    var step = props.tickStep || niceStep((max - min) / 5);
    var LW = props.labelWidth || 150, VW = props.valueWidth || 132, RH = props.rowHeight || 44, TOP = 30, BOT = 34;
    var W = props.width || 640, H = TOP + rows.length * RH + BOT;
    var x0 = LW, x1 = W - VW;
    var X = function (v) { return x0 + (Math.max(min, Math.min(max, v)) - min) / (max - min) * (x1 - x0); };
    var opts = { decimal: props.decimal || DEC() };
    var dg = props.digits === undefined ? 2 : props.digits;
    var hs = useState(null);
    var hv = hs[0] !== null ? hs[0] : (props.hovered === undefined ? null : props.hovered);
    function setHover(i) { hs[1](i); if (props.onHover) props.onHover(i); }
    var ticks = []; for (var t = Math.ceil(min / step - 1e-9) * step; t <= max + 1e-9; t += step) ticks.push(+t.toFixed(6));
    var zoneOf = function (v) { var lv = null; zones.forEach(function (z, i) { var from = i ? zones[i - 1].to : -Infinity; if (v >= from && v < (z.to === undefined ? Infinity : z.to)) lv = z.level; }); if (!lv && zones.length) lv = zones[zones.length - 1].level; return lv; };
    var main = series[0].key;
    var tip = null;
    if (hv !== null && rows[hv] && props.tooltip !== false) {
      var r = rows[hv], mv = r.values[main];
      tip = h('div', { className: 'sx-tip', style: { left: Math.min(X(mv.est) / W * 100 + 2, 62) + '%', top: ((TOP + hv * RH) / H * 100 - 4) + '%' } },
        h('div', { className: 'sx-tip-v' }, r.label),
        series.map(function (s) { var v = r.values[s.key]; return v ? h('div', { key: s.key, className: 'sx-tip-l' }, s.label + ' ' + fmt(v.est, dg, opts) + (v.lo !== undefined ? ' [' + fmt(v.lo, dg, opts) + '; ' + fmt(v.hi, dg, opts) + ']' : '')) : null; }),
        zones.length ? h('div', { className: 'sx-tip-n' }, __sxT('Ocena: ') + (ZONE_WORD()[zoneOf(mv.est)] || '') + (mv.lo !== undefined && zoneOf(mv.lo) !== zoneOf(mv.est) ? __sxT(' - dolna granica CI w strefie „') + ZONE_WORD()[zoneOf(mv.lo)] + '”' : '')) : null);
    }
    return h('figure', { className: cx('sx-chart', 'sx-thplot', props.onSelect && 'is-interactive', props.className), style: { position: 'relative' } },
      h('svg', { viewBox: '0 0 ' + W + ' ' + H, style: { maxWidth: props.fluid ? undefined : W }, role: 'img', 'aria-label': props.label || __sxT('Oszacowania z przedziałami ufności na tle progów'), onMouseLeave: function () { setHover(null); } },
        zones.map(function (z, i) {
          var from = i ? zones[i - 1].to : min, to = z.to === undefined ? max : z.to;
          return h('g', { key: 'z' + i },
            h('rect', { className: 'sx-th-zone sx-th-zone-' + z.level, x: X(from), y: TOP - 8, width: Math.max(0, X(to) - X(from)), height: rows.length * RH + 8 }),
            z.label ? h('text', { className: 'sx-th-zlabel', x: (X(from) + X(to)) / 2, y: TOP - 14, textAnchor: 'middle' }, z.label) : null);
        }),
        ticks.map(function (t, i) { return h('g', { key: 't' + i }, h('line', { className: 'sx-grid', x1: X(t), x2: X(t), y1: TOP - 8, y2: TOP + rows.length * RH }), h('text', { className: 'sx-tick', x: X(t), y: TOP + rows.length * RH + 16, textAnchor: 'middle' }, fmt(t, step < 0.1 ? 2 : 1, opts))); }),
        props.axisLabel ? h('text', { className: 'sx-axis-label', x: (x0 + x1) / 2, y: H - 2, textAnchor: 'middle' }, props.axisLabel) : null,
        rows.map(function (r, i) {
          var cy = TOP + i * RH + RH / 2;
          var sel = props.selected === r.id || props.selected === i;
          return h('g', { key: r.id || i, className: cx('sx-th-row', sel && 'is-sel', hv === i && 'is-hover'), tabIndex: props.onSelect ? 0 : undefined, role: props.onSelect ? 'button' : undefined, 'aria-pressed': props.onSelect ? sel : undefined,
            onMouseEnter: function () { setHover(i); }, onFocus: function () { setHover(i); }, onBlur: function () { setHover(null); },
            onClick: props.onSelect ? function () { props.onSelect(r.id === undefined ? i : r.id); } : undefined,
            onKeyDown: props.onSelect ? function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); props.onSelect(r.id === undefined ? i : r.id); } } : undefined },
            h('rect', { className: 'sx-th-band', x: 0, y: TOP + i * RH, width: W, height: RH, rx: 6 }),
            h('text', { className: 'sx-th-label', x: 8, y: cy - (r.sub ? 2 : -4) }, r.label),
            r.sub ? h('text', { className: 'sx-th-sub', x: 8, y: cy + 13 }, r.sub) : null,
            series.map(function (s, si) {
              var v = r.values[s.key]; if (!v) return null;
              var oy = cy + (si - (series.length - 1) / 2) * 9;
              var px = X(v.est), shape = s.shape || (si ? 'square' : 'circle');
              return h('g', { key: s.key, className: 'sx-th-s' + si },
                v.lo !== undefined ? h('line', { className: 'sx-th-ci', x1: X(v.lo), x2: X(v.hi), y1: oy, y2: oy }) : null,
                shape === 'square' ? h('rect', { className: 'sx-th-mk', x: px - 4.5, y: oy - 4.5, width: 9, height: 9, rx: 1.5 }) : shape === 'diamond' ? h('path', { className: 'sx-th-mk', d: 'M' + px + ' ' + (oy - 6) + 'L' + (px + 6) + ' ' + oy + 'L' + px + ' ' + (oy + 6) + 'L' + (px - 6) + ' ' + oy + 'Z' }) : h('circle', { className: 'sx-th-mk', cx: px, cy: oy, r: 5 }));
            }),
            h('text', { className: 'sx-th-val', x: W - 6, y: cy + 4, textAnchor: 'end' }, series.map(function (s, si) { var v = r.values[s.key]; return v ? h('tspan', { key: s.key, className: si ? 'is-2nd' : '' }, (si ? '  ' : '') + (s.short || s.label) + ' ' + fmt(v.est, dg, opts)) : null; })));
        })),
      tip,
      props.legend !== false ? h('figcaption', { className: 'sx-legend' },
        series.map(function (s, si) { return h('span', { key: s.key, className: 'sx-lg sx-lg-th' + si }, s.label + (s.ci !== false ? __sxT(' z 95% CI') : '')); }),
        zones.map(function (z, i) { return z.legend ? h('span', { key: 'zl' + i, className: 'sx-lg sx-lg-sq sx-lg-zone-' + z.level }, z.legend) : null; })) : null);
  }

  /* ---------- ValidityMatrix: HTMT below, correlations above, sqrt(AVE) on the diagonal ---------- */
  function ValidityMatrix(props) {
    var f = props.factors || [], ave = props.ave || [], phi = props.phi || [], ht = props.htmt || [];
    var cut = props.htmtCut || 0.85, near = props.htmtNear || 0.80;
    var opts = { decimal: props.decimal || DEC() };
    var hs = useState(null), hv = hs[0];
    var flags = 0;
    var body = f.map(function (a, i) {
      return h('tr', { key: a }, h('th', { scope: 'row' }, a), f.map(function (b, j) {
        var on = hv && (hv[0] === i || hv[1] === j || hv[0] === j || hv[1] === i) && hv;
        var cls = 'sx-vm-cell', v, title, mark = null, style = null;
        if (i === j) { v = Math.sqrt(ave[i]); cls += ' is-diag'; title = '√AVE ' + a + ' = ' + fmt(v, 2, opts) + ' (AVE = ' + fmt(ave[i], 2, opts) + ')'; if (ave[i] < 0.5) { cls += ' is-poor'; mark = 'poor'; flags++; } }
        else if (i > j) {
          v = ht[i][j]; title = 'HTMT ' + b + '–' + a + ' = ' + fmt(v, 2, opts);
          style = { background: 'color-mix(in oklab, var(--heat-pos) ' + Math.round(Math.min(1, v) * 36) + '%, var(--surface))' };
          if (v >= cut) { cls += ' is-poor'; mark = 'poor'; flags++; } else if (v >= near) { cls += ' is-ok'; mark = 'ok'; }
        } else {
          v = phi[i][j]; cls += ' is-upper'; title = __sxT('Korelacja ') + a + '–' + b + ' = ' + fmt(v, 2, opts);
          if (Math.abs(v) >= Math.sqrt(ave[i]) || Math.abs(v) >= Math.sqrt(ave[j])) { cls += ' is-poor'; mark = 'poor'; flags++; title += __sxT(' - większa niż √AVE (kryterium Fornella–Larckera)'); }
        }
        var hot = hv && ((hv[0] === i && hv[1] === j) || (hv[0] === j && hv[1] === i));
        return h('td', { key: b, className: cls + (hot ? ' is-hot' : ''), style: style, title: title, onMouseEnter: function () { hs[1]([i, j]); }, onMouseLeave: function () { hs[1](null); } },
          mark ? h(Icon, { name: mark, size: 12, className: 'sx-tone-' + mark }) : null, fmt(v, 2, opts));
      }));
    });
    var read = hv ? (hv[0] === hv[1] ? '√AVE ' + f[hv[0]] + ' = ' + fmt(Math.sqrt(ave[hv[0]]), 2, opts) + __sxT(' - średnia wariancja wyjaśniona ') + fmt(ave[hv[0]], 2, opts) + (ave[hv[0]] >= 0.5 ? ' (≥ 0,50)' : ' (< 0,50)')
      : hv[0] > hv[1] ? 'HTMT ' + f[hv[1]] + '–' + f[hv[0]] + ' = ' + fmt(ht[hv[0]][hv[1]], 2, opts) + (ht[hv[0]][hv[1]] < cut ? __sxT(' - poniżej progu ') + fmt(cut, 2, opts) : __sxT(' - powyżej progu ') + fmt(cut, 2, opts))
      : __sxT('Korelacja ') + f[hv[0]] + '–' + f[hv[1]] + ' = ' + fmt(phi[hv[0]][hv[1]], 2, opts) + ' wobec √AVE ' + fmt(Math.sqrt(ave[hv[0]]), 2, opts) + ' i ' + fmt(Math.sqrt(ave[hv[1]]), 2, opts)) : null;
    return h('div', { className: cx('sx-vm', props.className) },
      h('table', null,
        h('thead', null, h('tr', null, h('th', { className: 'sx-vm-corner' }), f.map(function (a) { return h('th', { key: a, scope: 'col' }, a); }))),
        h('tbody', null, body)),
      h('div', { className: 'sx-vm-legend' },
        h('span', null, h('i', { className: 'sx-vm-key is-diag' }), __sxT('przekątna: √AVE')),
        h('span', null, h('i', { className: 'sx-vm-key is-lower' }), __sxT('pod przekątną: HTMT (próg ') + fmt(cut, 2, opts) + ')'),
        h('span', null, h('i', { className: 'sx-vm-key is-upper' }), __sxT('nad przekątną: korelacje czynników'))),
      h('div', { className: 'sx-vm-read', role: 'status' }, read || (flags ? __sxT('Oznaczono ') + flags + (flags === 1 ? __sxT(' komórkę') : __sxT(' komórki')) + __sxT(' - najedź, aby zobaczyć, dlaczego.') : __sxT('Wszystkie kryteria trafności różnicowej spełnione - najedź na komórkę, aby zobaczyć wartość.'))));
  }

  /* ---------- InvarianceLadder: configural → metric → scalar → strict ---------- */
  function INV_WORD() { return { good: __sxT('utrzymana'), poor: __sxT('odrzucona'), ok: __sxT('częściowa'), todo: __sxT('nie testowano') }; }
  function InvarianceLadder(props) {
    var steps = props.steps || [];
    var th = props.thresholds || { dcfi: -0.01, drmsea: 0.015 };
    var opts = { decimal: props.decimal || DEC() };
    var f3 = function (v) { return fmt(v, 3, opts); };
    var sgn = function (v) { return (v > 0 ? '+' : '') + fmt(v, 3, opts); };
    return h('ol', { className: cx('sx-inv', props.className) }, steps.map(function (s, i) {
      var lv = s.verdict || 'todo';
      var sel = props.selected === s.id;
      var passC = s.dcfi === undefined ? null : s.dcfi >= th.dcfi, passR = s.drmsea === undefined ? null : s.drmsea <= th.drmsea;
      var mark = lv === 'good' ? h(Icon, { name: 'check', size: 14, strokeWidth: 2.5 }) : lv === 'poor' ? h(Icon, { name: 'x', size: 14, strokeWidth: 2.5 }) : lv === 'ok' ? h(Icon, { name: 'minus', size: 14, strokeWidth: 2.5 }) : h('span', null, i + 1);
      return h('li', { key: s.id, className: cx('sx-inv-step', 'is-' + lv, s.branch && 'is-branch', sel && 'is-sel', props.onSelect && 'is-interactive') },
        h('span', { className: 'sx-inv-rail', 'aria-hidden': true }, h('span', { className: 'sx-inv-dot' }, mark), i < steps.length - 1 ? h('span', { className: 'sx-inv-line' }) : null),
        h('div', { className: 'sx-inv-card', role: props.onSelect ? 'button' : undefined, tabIndex: props.onSelect ? 0 : undefined, 'aria-pressed': props.onSelect ? sel : undefined,
          onClick: props.onSelect ? function () { props.onSelect(s.id); } : undefined, onKeyDown: props.onSelect ? function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); props.onSelect(s.id); } } : undefined },
          h('div', { className: 'sx-inv-top' },
            h('div', { className: 'sx-inv-titles' }, h('div', { className: 'sx-inv-title' }, s.branch ? h(Icon, { name: 'split', size: 14 }) : null, s.label), s.desc ? h('div', { className: 'sx-inv-desc' }, s.desc) : null),
            h('span', { className: cx('sx-inv-verdict', 'is-' + lv) }, lv === 'todo' ? null : h(Icon, { name: lv === 'good' ? 'good' : lv === 'poor' ? 'poor' : 'ok', size: 14 }), s.verdictLabel || INV_WORD()[lv])),
          s.cfi !== undefined ? h('div', { className: 'sx-inv-fit' },
            h('span', null, h('small', null, 'χ²(' + s.df + ')'), fmt(s.chi2, 1, opts)),
            h('span', null, h('small', null, 'CFI'), f3(s.cfi)),
            h('span', null, h('small', null, 'RMSEA'), f3(s.rmsea)),
            s.dcfi !== undefined ? h('span', { className: cx('sx-inv-d', passC ? 'is-pass' : 'is-fail') }, h('small', null, 'ΔCFI'), h(Icon, { name: passC ? 'good' : 'poor', size: 13 }), sgn(s.dcfi)) : h('span', { className: 'sx-inv-d is-base' }, h('small', null, 'ΔCFI'), __sxT('model bazowy')),
            s.drmsea !== undefined ? h('span', { className: cx('sx-inv-d', passR ? 'is-pass' : 'is-fail') }, h('small', null, 'ΔRMSEA'), h(Icon, { name: passR ? 'good' : 'poor', size: 13 }), sgn(s.drmsea)) : null) : null,
          s.note ? h('div', { className: 'sx-inv-note' }, s.note) : null));
    }));
  }

  /* ---------- DecisionTimeline: every decision across modules ---------- */
  function ORIGIN() { return { proposal: [__sxT('propozycja SEMplex'), 'brand'], manual: [__sxT('ręcznie'), 'neutral'], auto: [__sxT('automatycznie'), 'observed'] }; }
  function DecisionTimeline(props) {
    var groups = props.groups || [];
    return h('div', { className: cx('sx-tl', props.className) }, groups.map(function (g, gi) {
      return h('section', { key: gi, className: 'sx-tl-group', 'aria-label': g.label },
        h('div', { className: 'sx-tl-day' }, g.label, g.meta ? h('span', null, g.meta) : null),
        h('ol', null, g.entries.map(function (e) {
          var sel = props.selected === e.id;
          var o = ORIGIN()[e.origin];
          return h('li', { key: e.id, className: cx('sx-tl-item', sel && 'is-sel', e.reverted && 'is-reverted', e.stale && 'is-stale') },
            h('time', { className: 'sx-tl-time' }, e.time),
            h('span', { className: 'sx-tl-rail', 'aria-hidden': true }, h('span', { className: 'sx-tl-dot' }, h(Icon, { name: e.reverted ? 'undo' : (LOG_ICON[e.kind] || 'history'), size: 14 }))),
            h('div', { className: cx('sx-tl-card', props.onSelect && 'is-clickable'), onClick: props.onSelect ? function () { props.onSelect(e.id); } : undefined },
              h('div', { className: 'sx-tl-meta' },
                e.module ? h('span', { className: 'sx-tl-mod' }, e.moduleIcon ? h(Icon, { name: e.moduleIcon, size: 13 }) : null, e.module) : null,
                o ? h('span', { className: 'sx-badge sx-badge-' + o[1] + ' sx-tl-origin' }, o[0]) : null,
                e.reverted ? h('span', { className: 'sx-badge sx-tl-origin' }, __sxT('cofnięta')) : null,
                e.stale && !e.reverted ? h('span', { className: 'sx-badge sx-badge-ok sx-tl-origin' }, h(Icon, { name: 'ok', size: 12 }), __sxT('liczby do przeliczenia')) : null,
                props.renderActions ? h('span', { className: 'sx-tl-actions', onClick: function (ev) { ev.stopPropagation(); } }, props.renderActions(e)) : null),
              props.onSelect ? h('button', { type: 'button', className: 'sx-tl-action', 'aria-pressed': sel, onClick: function (ev) { ev.stopPropagation(); props.onSelect(e.id); } }, e.action) : h('div', { className: 'sx-tl-action' }, e.action),
              e.reason ? h('div', { className: 'sx-tl-reason' }, e.reason) : null,
              e.effects && e.effects.length ? h('div', { className: 'sx-tl-effects' }, e.effects.map(function (x, i) {
                return h('span', { key: i, className: cx('sx-tl-eff', x.tone && 'is-' + x.tone) }, h('small', null, x.label), x.from !== undefined ? h(React.Fragment, null, h('span', { className: 'sx-tl-from' }, x.from), h(Icon, { name: 'arrow-right', size: 12 })) : null, h('b', null, x.to));
              })) : null));
        })));
    }));
  }

  /* ---------- Drawer: side sheet for the inspector on narrow screens ---------- */
  function Drawer(props) {
    var box = React.useRef(null), prev = React.useRef(null);
    var tid = useUid('drw');
    useEffect(function () {
      if (!props.open) return;
      prev.current = document.activeElement;
      var el = box.current, f = el && el.querySelectorAll(FOCUSABLE);
      if (f && f.length) f[0].focus();
      return function () { if (prev.current && prev.current.focus) prev.current.focus(); };
    }, [props.open]);
    if (!props.open) return null;
    function key(e) {
      if (e.key === 'Escape' && props.onClose) { e.stopPropagation(); props.onClose(); }
      if (e.key === 'Tab') {
        var f = box.current.querySelectorAll(FOCUSABLE); if (!f.length) return;
        var a = f[0], z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    }
    return h('div', { className: cx('sx-drawer-layer', props.contained && 'is-contained', props.side === 'left' && 'is-left'), onKeyDown: key },
      h('div', { className: 'sx-dialog-scrim', onClick: props.onClose, 'aria-hidden': true }),
      h('aside', { ref: box, className: cx('sx-drawer', props.className), role: 'dialog', 'aria-modal': true, 'aria-labelledby': tid, style: { width: props.width || 380 } },
        h('div', { className: 'sx-drawer-head' },
          h('div', { className: 'sx-dialog-titles' }, h('h2', { id: tid, className: 'sx-drawer-title' }, props.title), props.subtitle ? h('p', { className: 'sx-dialog-sub' }, props.subtitle) : null),
          h(Button, { size: 'sm', variant: 'ghost', icon: 'x', 'aria-label': __sxT('Zamknij'), onClick: props.onClose })),
        h('div', { className: 'sx-drawer-body' }, props.children),
        props.footer ? h('div', { className: 'sx-drawer-foot' }, props.footer) : null));
  }

  /* ---------- Navigation: one canonical list of modules ---------- */
  function NAV() { return [
    { label: __sxT('Dane'), items: [{ id: 'data', label: __sxT('Dane i czyszczenie'), icon: 'data' }, { id: 'stats', label: __sxT('Opisowe i testy'), icon: 'stats' }] },
    { label: __sxT('Pomiar'), items: [{ id: 'rel', label: __sxT('Rzetelność i trafność'), icon: 'reliability' }, { id: 'efa', label: 'EFA', icon: 'efa' }, { id: 'cfa', label: 'CFA', icon: 'cfa' }] },
    { label: __sxT('Model'), items: [{ id: 'sem', label: __sxT('SEM - edytor modelu'), icon: 'sem' }, { id: 'med', label: __sxT('Mediacja i moderacja'), icon: 'mediation' }, { id: 'bridge', label: __sxT('Porównanie podejść'), icon: 'bridge', release: 'nowe' }, { id: 'groups', label: __sxT('Porównanie grup'), icon: 'groups', release: 'v1' }] },
    { label: __sxT('Rozszerzenia'), items: [{ id: 'power', label: __sxT('Moc i wielkość próby'), icon: 'power', release: 'v1' }, { id: 'pls', label: 'PLS-SEM, IPMA, NCA', icon: 'pls', release: 'v1' }, { id: 'ml', label: __sxT('Modele wielopoziomowe'), icon: 'layers', release: 'v2' }] },
    { label: __sxT('Wynik'), items: [{ id: 'report', label: __sxT('Raport'), icon: 'report' }, { id: 'log', label: __sxT('Dziennik decyzji'), icon: 'history' }] }]; }
  function navSections(over) {
    over = over || {};
    return NAV().map(function (sec) { return { label: sec.label, items: sec.items.map(function (it) { return Object.assign({}, it, over[it.id] || {}); }) }; });
  }

  var SERIES_DASH = ['', '7 4', '2 4', '9 3 2 3'];

  /* ---------- PowerCurve: Monte Carlo power as a function of N ---------- */
  function PowerCurve(props) {
    var series = props.series || [];
    var W = props.width || 720, H = props.height || 320, m = { l: 48, r: 18, t: 22, b: 46 };
    var all = []; series.forEach(function (s) { s.points.forEach(function (p) { all.push(p.n); }); });
    var n0 = props.nMin !== undefined ? props.nMin : Math.min.apply(null, all), n1 = props.nMax !== undefined ? props.nMax : Math.max.apply(null, all);
    var target = props.target === undefined ? 0.8 : props.target;
    var X = function (n) { return m.l + (n - n0) / (n1 - n0) * (W - m.l - m.r); };
    var Y = function (p) { return H - m.b - p * (H - m.t - m.b); };
    var opts = { decimal: props.decimal || DEC() };
    var xs = niceStep((n1 - n0) / 6), xt = []; for (var t = Math.ceil(n0 / xs) * xs; t <= n1 + 1e-9; t += xs) xt.push(t);
    function cross(s) { var P = s.points; for (var i = 1; i < P.length; i++) { if (P[i - 1].power < target && P[i].power >= target) { return P[i - 1].n + (target - P[i - 1].power) / (P[i].power - P[i - 1].power) * (P[i].n - P[i - 1].n); } } return P.length && P[0].power >= target ? P[0].n : null; }
    function at(s, n) { var P = s.points; for (var i = 1; i < P.length; i++) { if (n <= P[i].n) { var f = (n - P[i - 1].n) / (P[i].n - P[i - 1].n); return { power: P[i - 1].power + f * (P[i].power - P[i - 1].power), lo: P[i - 1].lo + f * (P[i].lo - P[i - 1].lo), hi: P[i - 1].hi + f * (P[i].hi - P[i - 1].hi) }; } } return P[P.length - 1]; }
    var hs = useState(null), hv = hs[0];
    var svg = React.useRef(null);
    var stepN = props.step || (series[0] && series[0].points.length > 1 ? series[0].points[1].n - series[0].points[0].n : 50);
    function move(e) { var r = svg.current.getBoundingClientRect(); var px = (e.clientX - r.left) / r.width * W; var n = n0 + (px - m.l) / (W - m.l - m.r) * (n1 - n0); n = Math.round(n / stepN) * stepN; hs[1](Math.max(n0, Math.min(n1, n))); }
    var path = function (pts, k) { return pts.map(function (p, i) { return (i ? 'L' : 'M') + X(p.n).toFixed(1) + ' ' + Y(p[k]).toFixed(1); }).join(' '); };
    var band = function (pts) { return path(pts, 'hi') + ' ' + pts.slice().reverse().map(function (p) { return 'L' + X(p.n).toFixed(1) + ' ' + Y(p.lo).toFixed(1); }).join(' ') + ' Z'; };
    var cur = props.currentN;
    return h('figure', { className: cx('sx-chart', 'sx-power', props.className), style: { position: 'relative' } },
      h('svg', { ref: svg, viewBox: '0 0 ' + W + ' ' + H, style: { maxWidth: props.fluid ? undefined : W }, role: 'img', 'aria-label': props.label || __sxT('Moc testu w zależności od liczebności próby'), onMouseMove: move, onMouseLeave: function () { hs[1](null); } },
        [0, 0.2, 0.4, 0.6, 0.8, 1].map(function (p) { return h('g', { key: 'y' + p }, h('line', { className: 'sx-grid', x1: m.l, x2: W - m.r, y1: Y(p), y2: Y(p) }), h('text', { className: 'sx-tick', x: m.l - 8, y: Y(p) + 4, textAnchor: 'end' }, Math.round(p * 100) + '%')); }),
        xt.map(function (n) { return h('text', { key: 'x' + n, className: 'sx-tick', x: X(n), y: H - m.b + 18, textAnchor: 'middle' }, fmt(n, 0, opts)); }),
        h('text', { className: 'sx-axis-label', x: (m.l + W - m.r) / 2, y: H - 6, textAnchor: 'middle' }, props.xLabel || __sxT('Liczebność próby (N)')),
        h('line', { className: 'sx-pw-target', x1: m.l, x2: W - m.r, y1: Y(target), y2: Y(target) }),
        h('text', { className: 'sx-pw-tlabel', x: W - m.r - 4, y: Y(target) - 6, textAnchor: 'end' }, (props.targetLabel || __sxT('moc docelowa')) + ' ' + Math.round(target * 100) + '%'),
        cur !== undefined ? h('g', null, h('line', { className: 'sx-pw-cur', x1: X(cur), x2: X(cur), y1: m.t, y2: H - m.b }), h('text', { className: 'sx-pw-clabel', x: X(cur) + 6, y: H - m.b - 8 }, (props.currentLabel || __sxT('Twoja próba')) + ': ' + fmt(cur, 0, opts))) : null,
        series.map(function (s, si) { return h('path', { key: 'b' + si, className: 'sx-pw-band sx-pw-s' + si, d: band(s.points) }); }),
        series.map(function (s, si) { return h('path', { key: 'l' + si, className: 'sx-pw-line sx-pw-s' + si, d: path(s.points, 'power'), strokeDasharray: SERIES_DASH[si % 4] || undefined }); }),
        series.map(function (s, si) {
          var c = cross(s); if (c === null || c > n1) return null;
          return h('g', { key: 'c' + si, className: 'sx-pw-s' + si },
            h('path', { className: 'sx-pw-cross', d: 'M' + X(c) + ' ' + (Y(target) - 6) + 'L' + (X(c) + 6) + ' ' + Y(target) + 'L' + X(c) + ' ' + (Y(target) + 6) + 'L' + (X(c) - 6) + ' ' + Y(target) + 'Z' }),
            h('text', { className: 'sx-pw-clab', x: X(c), y: Y(target) + 20 + (si % 2) * 12, textAnchor: 'middle' }, fmt(Math.ceil(c / 10) * 10, 0, opts)));
        }),
        hv !== null ? h('line', { className: 'sx-scree-guide', x1: X(hv), x2: X(hv), y1: m.t, y2: H - m.b }) : null,
        hv !== null ? series.map(function (s, si) { var a = at(s, hv); return h('circle', { key: 'h' + si, className: 'sx-pw-dot sx-pw-s' + si, cx: X(hv), cy: Y(a.power), r: 4 }); }) : null),
      hv !== null ? h('div', { className: 'sx-tip', style: { left: Math.min(X(hv) / W * 100 + 2, 66) + '%', top: '8%' } },
        h('div', { className: 'sx-tip-v' }, 'N = ' + fmt(hv, 0, opts)),
        series.map(function (s) { var a = at(s, hv); return h('div', { key: s.key, className: 'sx-tip-l' }, s.label + ': ' + Math.round(a.power * 100) + '% [' + Math.round(a.lo * 100) + '; ' + Math.round(a.hi * 100) + ']'); }),
        h('div', { className: 'sx-tip-n' }, props.replications ? fmt(props.replications, 0, opts).replace(/(\d)(?=(\d{3})+$)/g, '$1 ') + ' replikacji Monte Carlo' : null)) : null,
      props.legend !== false ? h('figcaption', { className: 'sx-legend' },
        series.map(function (s, si) { return h('span', { key: s.key, className: 'sx-lg sx-lg-pw' + si }, s.label); }),
        h('span', { className: 'sx-lg sx-lg-pwt' }, __sxT('moc docelowa')),
        h('span', { className: 'sx-lg sx-lg-pwx' }, __sxT('N potrzebne do celu')),
        cur !== undefined ? h('span', { className: 'sx-lg sx-lg-pwc' }, __sxT('obecna próba')) : null) : null);
  }

  /* ---------- ConditionalEffectPlot: effect across a moderator with Johnson–Neyman region ---------- */
  function ConditionalEffectPlot(props) {
    var pts = props.points || [];
    var W = props.width || 720, H = props.height || 320, hasDist = !!props.dist, m = { l: 52, r: 18, t: 18, b: hasDist ? 82 : 44 };
    var w0 = pts[0].w, w1 = pts[pts.length - 1].w;
    var ys = []; pts.forEach(function (p) { ys.push(p.lo, p.hi); }); ys.push(0);
    var y0 = props.yMin !== undefined ? props.yMin : Math.min.apply(null, ys), y1 = props.yMax !== undefined ? props.yMax : Math.max.apply(null, ys);
    var ystep = props.yStep || niceStep((y1 - y0) / 4); y0 = Math.floor(y0 / ystep) * ystep; y1 = Math.ceil(y1 / ystep) * ystep;
    var plotB = H - m.b;
    var X = function (w) { return m.l + (w - w0) / (w1 - w0) * (W - m.l - m.r); };
    var Y = function (v) { return plotB - (Math.max(y0, Math.min(y1, v)) - y0) / (y1 - y0) * (plotB - m.t); };
    var opts = { decimal: props.decimal || DEC() };
    var yt = []; for (var t = y0; t <= y1 + 1e-9; t += ystep) yt.push(+t.toFixed(6));
    var xs = props.wStep || niceStep((w1 - w0) / 6), xt = []; for (var u = Math.ceil(w0 / xs) * xs; u <= w1 + 1e-9; u += xs) xt.push(+u.toFixed(6));
    var sig = function (p) { return p.lo > 0 || p.hi < 0; };
    var regions = []; var cur = null;
    pts.forEach(function (p, i) { if (sig(p)) { if (!cur) { cur = { a: i ? (props.jn && props.jn.length ? props.jn.filter(function (j) { return j >= pts[i - 1].w && j <= p.w; })[0] || p.w : p.w) : p.w }; } cur.b = p.w; } else if (cur) { cur.b = props.jn && props.jn.filter(function (j) { return j >= pts[i - 1].w && j <= p.w; })[0] || pts[i - 1].w; regions.push(cur); cur = null; } });
    if (cur) regions.push(cur);
    var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + X(p.w).toFixed(1) + ' ' + Y(p.est).toFixed(1); }).join(' ');
    var band = pts.map(function (p, i) { return (i ? 'L' : 'M') + X(p.w).toFixed(1) + ' ' + Y(p.hi).toFixed(1); }).join(' ') + ' ' + pts.slice().reverse().map(function (p) { return 'L' + X(p.w).toFixed(1) + ' ' + Y(p.lo).toFixed(1); }).join(' ') + ' Z';
    var hs = useState(null), hv = hs[0];
    var svg = React.useRef(null);
    function move(e) { var r = svg.current.getBoundingClientRect(); var px = (e.clientX - r.left) / r.width * W; var best = 0, bd = 1e9; pts.forEach(function (p, i) { var d = Math.abs(X(p.w) - px); if (d < bd) { bd = d; best = i; } }); hs[1](best); }
    var dg = props.digits === undefined ? 2 : props.digits;
    var hp = hv !== null ? pts[hv] : null;
    var dmax = hasDist ? Math.max.apply(null, props.dist.map(function (d) { return d.count; })) : 1;
    return h('figure', { className: cx('sx-chart', 'sx-ceplot', props.className), style: { position: 'relative' } },
      h('svg', { ref: svg, viewBox: '0 0 ' + W + ' ' + H, style: { maxWidth: props.fluid ? undefined : W }, role: 'img', 'aria-label': props.label || __sxT('Efekt warunkowy w zależności od moderatora'), onMouseMove: move, onMouseLeave: function () { hs[1](null); } },
        regions.map(function (r, i) { return h('g', { key: 'r' + i }, h('rect', { className: 'sx-ce-sig', x: X(r.a), y: m.t, width: Math.max(0, X(r.b) - X(r.a)), height: plotB - m.t }), h('text', { className: 'sx-ce-siglab', x: (X(r.a) + X(r.b)) / 2, y: m.t + 14, textAnchor: 'middle' }, props.sigLabel || __sxT('efekt istotny'))); }),
        yt.map(function (v, i) { return h('g', { key: 'y' + i }, h('line', { className: 'sx-grid', x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v) }), h('text', { className: 'sx-tick', x: m.l - 8, y: Y(v) + 4, textAnchor: 'end' }, fmt(v, ystep < 0.1 ? 2 : 1, opts))); }),
        xt.map(function (v, i) { return h('text', { key: 'x' + i, className: 'sx-tick', x: X(v), y: plotB + 16, textAnchor: 'middle' }, fmt(v, Math.round(xs) === xs ? 0 : 1, opts)); }),
        h('text', { className: 'sx-axis-label', x: (m.l + W - m.r) / 2, y: plotB + 34, textAnchor: 'middle' }, props.wLabel || __sxT('Moderator')),
        props.yLabel ? h('text', { className: 'sx-axis-label', x: 12, y: (m.t + plotB) / 2, textAnchor: 'middle', transform: 'rotate(-90 12 ' + ((m.t + plotB) / 2) + ')' }, props.yLabel) : null,
        h('line', { className: 'sx-ce-zero', x1: m.l, x2: W - m.r, y1: Y(0), y2: Y(0) }),
        h('path', { className: 'sx-ce-band', d: band }),
        h('path', { className: 'sx-ce-line', d: line }),
        (props.jn || []).map(function (j, i) { return h('g', { key: 'j' + i }, h('line', { className: 'sx-ce-jn', x1: X(j), x2: X(j), y1: m.t, y2: plotB }), h('text', { className: 'sx-ce-jnlab', x: X(j) + 5, y: plotB - 8 }, 'J–N: ' + fmt(j, 1, opts))); }),
        (props.marks || []).map(function (mk, i) {
          var p = pts.reduce(function (a, b) { return Math.abs(b.w - mk.w) < Math.abs(a.w - mk.w) ? b : a; });
          return h('g', { key: 'm' + i }, h('circle', { className: 'sx-ce-mark', cx: X(mk.w), cy: Y(p.est), r: 4.5 }), h('text', { className: 'sx-ce-marklab', x: X(mk.w), y: Y(p.est) - 10, textAnchor: 'middle' }, mk.label));
        }),
        hasDist ? h('g', null,
          props.dist.map(function (d, i) { var bw = (X(d.to) - X(d.from)) - 2; var bh = d.count / dmax * 22; return h('rect', { key: 'd' + i, className: 'sx-ce-dist', x: X(d.from) + 1, y: H - 6 - bh, width: Math.max(1, bw), height: bh, rx: 1.5 }); }),
          h('text', { className: 'sx-tick', x: m.l - 8, y: H - 8, textAnchor: 'end' }, 'n')) : null,
        hp ? h('g', null, h('line', { className: 'sx-scree-guide', x1: X(hp.w), x2: X(hp.w), y1: m.t, y2: plotB }), h('circle', { className: 'sx-ce-hdot', cx: X(hp.w), cy: Y(hp.est), r: 5 })) : null),
      hp ? h('div', { className: 'sx-tip', style: { left: Math.min(X(hp.w) / W * 100 + 2, 64) + '%', top: '6%' } },
        h('div', { className: 'sx-tip-v' }, (props.wShort || 'W') + ' = ' + fmt(hp.w, 1, opts)),
        h('div', { className: 'sx-tip-l' }, (props.effectShort || 'efekt') + ' ' + fmt(hp.est, dg, opts) + ' [' + fmt(hp.lo, dg, opts) + '; ' + fmt(hp.hi, dg, opts) + ']'),
        h('div', { className: 'sx-tip-n' }, sig(hp) ? __sxT('przedział nie obejmuje 0 - efekt istotny') : __sxT('przedział obejmuje 0 - efekt nieistotny'))) : null,
      props.legend !== false ? h('figcaption', { className: 'sx-legend' },
        h('span', { className: 'sx-lg sx-lg-ce' }, (props.effectLabel || __sxT('Efekt warunkowy')) + __sxT(' z 95% CI')),
        h('span', { className: 'sx-lg sx-lg-sq sx-lg-cesig' }, __sxT('obszar istotności')),
        props.jn && props.jn.length ? h('span', { className: 'sx-lg sx-lg-cejn' }, 'punkt Johnsona–Neymana') : null,
        hasDist ? h('span', { className: 'sx-lg sx-lg-sq sx-lg-cedist' }, __sxT('rozkład moderatora w próbie')) : null) : null);
  }

  /* ---------- CorrMatrix: lower-triangle correlation heatmap ---------- */
  function CorrMatrix(props) {
    var v = props.vars || [], R = props.r || [], Pm = props.p || [];
    var opts = { decimal: props.decimal || DEC(), leadingZero: false };
    var alpha = props.alpha || 0.05;
    var bnd = {}; (props.groups || []).forEach(function (g) { bnd[g.vars[0]] = g.label; });
    var hs = useState(null), hv = hs[0];
    var hl = props.highlight ? v.indexOf(props.highlight) : -1;
    var read = hv ? v[hv[0]] + ' × ' + v[hv[1]] + ': r = ' + fmt(R[hv[0]][hv[1]], 2, { decimal: opts.decimal }) + ', p ' + (function (pp) { var t = fmtP(pp, { decimal: opts.decimal }); return t.charAt(0) === '<' ? t : '= ' + t; })(Pm[hv[0]] ? Pm[hv[0]][hv[1]] : 1) + (props.n ? ', n = ' + props.n : '') : null;
    return h('div', { className: cx('sx-corr', props.className) },
      h('div', { className: 'sx-corr-scroll' }, h('table', null,
        h('thead', null, h('tr', null, h('th', { className: 'sx-corr-corner' }), v.slice(0, -1).map(function (a, j) { return h('th', { key: a, scope: 'col', className: cx(bnd[a] && j && 'is-bnd', ((hv && hv[1] === j) || hl === j) && 'is-hot') }, a); }))),
        h('tbody', null, v.map(function (a, i) {
          if (i === 0) return null;
          return h('tr', { key: a, className: cx(bnd[a] && 'is-bnd') }, h('th', { scope: 'row', className: cx(((hv && hv[0] === i) || hl === i) && 'is-hot') }, a),
            v.slice(0, -1).map(function (b, j) {
              if (j >= i) return h('td', { key: b, className: cx('sx-corr-empty', bnd[b] && j && 'is-bnd') });
              var r = R[i][j], p = Pm[i] ? Pm[i][j] : 0;
              var mix = Math.round(Math.min(1, Math.abs(r)) * 46);
              return h('td', { key: b, className: cx('sx-corr-cell', p >= alpha && 'is-ns', Math.abs(r) >= (props.strong || 0.5) && 'is-strong', bnd[b] && j && 'is-bnd', hv && hv[0] === i && hv[1] === j && 'is-hot', hl >= 0 && (hl === i || hl === j) && 'is-hl'),
                style: { background: 'color-mix(in oklab, var(' + (r < 0 ? '--heat-neg' : '--heat-pos') + ') ' + mix + '%, var(--surface))' },
                onMouseEnter: function () { hs[1]([i, j]); }, onMouseLeave: function () { hs[1](null); }, title: a + ' × ' + b }, fmt(r, 2, opts));
            }));
        })))),
      h('div', { className: 'sx-corr-foot' },
        h('span', { className: 'sx-heat-sw is-neg' }), h('span', null, 'ujemne'), h('span', { className: 'sx-heat-sw is-pos' }), h('span', null, 'dodatnie'),
        h('span', { className: 'sx-corr-nsk' }, '0,12'), h('span', null, 'nieistotne (p ≥ ' + fmt(alpha, 2) + ')'),
        h('span', { className: 'sx-corr-read', role: 'status' }, read || (props.hint || __sxT('Najedź na komórkę, aby zobaczyć r, p i n.')))));
  }

  /* ---------- Layout: media query hook and Inspector (column ≥ 1280 px, Drawer below) ---------- */
  function useMedia(query) {
    var mq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query) : null;
    var st = useState(mq ? mq.matches : false);
    useEffect(function () {
      if (!mq) return;
      function on(e) { st[1](e.matches); }
      st[1](mq.matches);
      if (mq.addEventListener) mq.addEventListener('change', on); else mq.addListener(on);
      return function () { if (mq.removeEventListener) mq.removeEventListener('change', on); else mq.removeListener(on); };
    }, [query]);
    return st[0];
  }
  function Inspector(props) {
    var auto = useMedia(props.query || '(max-width: 1279px)');
    var narrow = props.narrow !== undefined ? props.narrow : auto;
    if (!narrow) return props.children || null;
    return h(Drawer, { open: !!props.open, onClose: props.onClose, title: props.title, subtitle: props.subtitle, width: props.width || 400, footer: props.footer, className: props.className }, props.children);
  }

  /* ---------- IPMAMap: importance–performance map ---------- */
  function IPMAMap(props) {
    var pts = props.points || [];
    var W = props.width || 640, H = props.height || 380, m = { l: 52, r: 20, t: 20, b: 48 };
    var imps = pts.map(function (p) { return p.importance; });
    var x0 = props.xMin !== undefined ? props.xMin : 0, x1 = props.xMax !== undefined ? props.xMax : Math.ceil(Math.max.apply(null, imps.concat([0.1])) * 10 + 0.5) / 10;
    var y0 = props.yMin !== undefined ? props.yMin : 40, y1 = props.yMax !== undefined ? props.yMax : 100;
    var mean = function (a) { return a.reduce(function (s, v) { return s + v; }, 0) / (a.length || 1); };
    var xm = props.xMid !== undefined ? props.xMid : mean(imps), ym = props.yMid !== undefined ? props.yMid : mean(pts.map(function (p) { return p.performance; }));
    var X = function (v) { return m.l + (v - x0) / (x1 - x0) * (W - m.l - m.r); };
    var Y = function (v) { return H - m.b - (v - y0) / (y1 - y0) * (H - m.t - m.b); };
    var opts = { decimal: props.decimal || DEC() };
    var hs = useState(null), hv = props.hovered !== undefined ? props.hovered : hs[0];
    function setHv(i) { hs[1](i); if (props.onHover) props.onHover(i); }
    var sx = props.xStep || niceStep((x1 - x0) / 5), tx = []; for (var t = x0; t <= x1 + 1e-9; t += sx) tx.push(+t.toFixed(4));
    var sy = props.yStep || 10, ty = []; for (var u = y0; u <= y1 + 1e-9; u += sy) ty.push(u);
    var Q = props.quadrants || { priority: __sxT('Popraw najpierw'), keep: __sxT('Utrzymaj'), low: __sxT('Niski priorytet'), over: __sxT('Możliwy nadmiar') };
    var hp = hv !== null && hv !== undefined ? pts[hv] : null;
    var selI = -1; pts.forEach(function (p, i) { if (p.id === props.selected) selI = i; });
    var dg = props.digits === undefined ? 2 : props.digits;
    return h('figure', { className: cx('sx-chart', 'sx-ipma', props.className), style: { position: 'relative' } },
      h('svg', { viewBox: '0 0 ' + W + ' ' + H, style: { maxWidth: props.fluid ? undefined : W }, role: 'img', 'aria-label': props.label || __sxT('Mapa ważność–wykonanie') },
        h('rect', { className: 'sx-ipma-prio', x: X(xm), y: Y(ym), width: X(x1) - X(xm), height: Y(y0) - Y(ym) }),
        ty.map(function (v, i) { return h('g', { key: 'y' + i }, h('line', { className: 'sx-grid', x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v) }), h('text', { className: 'sx-tick', x: m.l - 8, y: Y(v) + 4, textAnchor: 'end' }, fmt(v, 0, opts))); }),
        tx.map(function (v, i) { return h('text', { key: 'x' + i, className: 'sx-tick', x: X(v), y: H - m.b + 18, textAnchor: 'middle' }, fmt(v, sx < 0.1 ? 2 : 1, opts)); }),
        h('text', { className: 'sx-axis-label', x: (m.l + W - m.r) / 2, y: H - 8, textAnchor: 'middle' }, props.xLabel || __sxT('Ważność (efekt całkowity na wynik)')),
        h('text', { className: 'sx-axis-label', x: 13, y: (m.t + H - m.b) / 2, textAnchor: 'middle', transform: 'rotate(-90 13 ' + ((m.t + H - m.b) / 2) + ')' }, props.yLabel || 'Wykonanie (0–100)'),
        h('line', { className: 'sx-ipma-mid', x1: X(xm), x2: X(xm), y1: m.t, y2: H - m.b }),
        h('line', { className: 'sx-ipma-mid', x1: m.l, x2: W - m.r, y1: Y(ym), y2: Y(ym) }),
        h('text', { className: 'sx-ipma-q is-prio', x: W - m.r - 8, y: H - m.b - 10, textAnchor: 'end' }, Q.priority),
        h('text', { className: 'sx-ipma-q', x: W - m.r - 8, y: m.t + 16, textAnchor: 'end' }, Q.keep),
        h('text', { className: 'sx-ipma-q', x: m.l + 8, y: H - m.b - 10 }, Q.low),
        h('text', { className: 'sx-ipma-q', x: m.l + 8, y: m.t + 16 }, Q.over),
        pts.map(function (p, i) {
          var cx0 = X(p.importance), cy0 = Y(p.performance), prio = p.importance >= xm && p.performance < ym, on = i === selI || i === hv;
          var right = cx0 < W - m.r - 120;
          return h('g', { key: p.id || i, className: cx('sx-ipma-pt', prio && 'is-prio', on && 'is-on'), tabIndex: 0, role: 'button', 'aria-label': (p.label || p.id) + __sxT(': ważność ') + fmt(p.importance, dg, opts) + ', wykonanie ' + fmt(p.performance, 1, opts) + (prio ? ', priorytet' : ''),
            onMouseEnter: function () { setHv(i); }, onMouseLeave: function () { setHv(null); }, onFocus: function () { setHv(i); }, onBlur: function () { setHv(null); },
            onClick: function () { if (props.onSelect) props.onSelect(p.id, i); }, onKeyDown: function (e) { if ((e.key === 'Enter' || e.key === ' ') && props.onSelect) { e.preventDefault(); props.onSelect(p.id, i); } } },
            on ? h('circle', { className: 'sx-ipma-ring', cx: cx0, cy: cy0, r: 11 }) : null,
            prio ? h('path', { className: 'sx-ipma-dot', d: 'M' + cx0 + ' ' + (cy0 - 7) + 'L' + (cx0 + 7) + ' ' + cy0 + 'L' + cx0 + ' ' + (cy0 + 7) + 'L' + (cx0 - 7) + ' ' + cy0 + 'Z' }) : h('circle', { className: 'sx-ipma-dot', cx: cx0, cy: cy0, r: 5.5 }),
            h('text', { className: 'sx-ipma-lab', x: right ? cx0 + 11 : cx0 - 11, y: cy0 + 4, textAnchor: right ? 'start' : 'end' }, p.short || p.id));
        })),
      hp ? h('div', { className: 'sx-tip', style: { left: Math.min(X(hp.importance) / W * 100 + 3, 64) + '%', top: Math.max(0, Y(hp.performance) / H * 100 - 22) + '%' } },
        h('div', { className: 'sx-tip-v' }, hp.label || hp.id),
        h('div', { className: 'sx-tip-l' }, __sxT('ważność ') + fmt(hp.importance, dg, opts) + ' · wykonanie ' + fmt(hp.performance, 1, opts)),
        h('div', { className: 'sx-tip-n' }, hp.importance >= xm && hp.performance < ym ? __sxT('ważny i słabo oceniany - tu poprawa da najwięcej') : hp.importance >= xm ? __sxT('ważny i dobrze oceniany') : __sxT('mniejszy wpływ na wynik'))) : null,
      props.legend !== false ? h('figcaption', { className: 'sx-legend' },
        h('span', { className: 'sx-lg sx-lg-ipma' }, props.pointLabel || __sxT('Konstrukt')),
        h('span', { className: 'sx-lg sx-lg-ipmap' }, __sxT('Priorytet: ważny, słabo oceniany')),
        h('span', { className: 'sx-lg sx-lg-ref' }, __sxT('Średnia ważność i wykonanie'))) : null);
  }

  /* ---------- NCAPlot: necessary condition analysis with ceiling line ---------- */
  function NCAPlot(props) {
    var pts = props.points || [], ce = props.ceiling || [];
    var W = props.width || 560, H = props.height || 360, m = { l: 48, r: 16, t: 18, b: 46 };
    var x0 = props.xMin !== undefined ? props.xMin : 1, x1 = props.xMax !== undefined ? props.xMax : 7;
    var y0 = props.yMin !== undefined ? props.yMin : 1, y1 = props.yMax !== undefined ? props.yMax : 7;
    var X = function (v) { return m.l + (v - x0) / (x1 - x0) * (W - m.l - m.r); };
    var Y = function (v) { return H - m.b - (v - y0) / (y1 - y0) * (H - m.t - m.b); };
    var opts = { decimal: props.decimal || DEC() };
    var hs = useState(null), hv = hs[0];
    var svg = useRef(null);
    var step = 'M' + X(x0) + ' ' + Y(ce.length ? ce[0].y : y0);
    ce.forEach(function (c, i) { step += 'L' + X(c.x) + ' ' + Y(i ? ce[i - 1].y : c.y) + 'L' + X(c.x) + ' ' + Y(c.y); });
    step += 'L' + X(x1) + ' ' + Y(ce.length ? ce[ce.length - 1].y : y1);
    var empty = step + 'L' + X(x1) + ' ' + Y(y1) + 'L' + X(x0) + ' ' + Y(y1) + 'Z';
    var tx = []; for (var t = Math.ceil(x0); t <= x1; t += props.xStep || 1) tx.push(t);
    var ty = []; for (var u = Math.ceil(y0); u <= y1; u += props.yStep || 1) ty.push(u);
    function move(e) {
      var r = svg.current.getBoundingClientRect(), k = W / r.width, px = (e.clientX - r.left) * k, py = (e.clientY - r.top) * k;
      var best = null, bd = 16 * 16;
      pts.forEach(function (p, i) { var dx = X(p.x) - px, dy = Y(p.y) - py, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } });
      hs[1](best);
    }
    var hp = hv !== null ? pts[hv] : null;
    function ceilAt(x) { var c = ce.length ? ce[0].y : y0; ce.forEach(function (q) { if (x >= q.x) c = q.y; }); return c; }
    var bott = props.bottleneck;
    return h('figure', { className: cx('sx-chart', 'sx-nca', props.className), style: { position: 'relative' } },
      h('svg', { ref: svg, viewBox: '0 0 ' + W + ' ' + H, style: { maxWidth: props.fluid ? undefined : W }, role: 'img', 'aria-label': props.label || ('Analiza warunku koniecznego: ' + (props.xShort || 'X') + ' dla ' + (props.yShort || 'Y')), onMouseMove: move, onMouseLeave: function () { hs[1](null); } },
        h('path', { className: 'sx-nca-empty', d: empty }),
        ty.map(function (v, i) { return h('g', { key: 'y' + i }, h('line', { className: 'sx-grid', x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v) }), h('text', { className: 'sx-tick', x: m.l - 8, y: Y(v) + 4, textAnchor: 'end' }, fmt(v, 0, opts))); }),
        tx.map(function (v, i) { return h('text', { key: 'x' + i, className: 'sx-tick', x: X(v), y: H - m.b + 18, textAnchor: 'middle' }, fmt(v, 0, opts)); }),
        h('text', { className: 'sx-axis-label', x: (m.l + W - m.r) / 2, y: H - 8, textAnchor: 'middle' }, props.xLabel || __sxT('Warunek')),
        h('text', { className: 'sx-axis-label', x: 12, y: (m.t + H - m.b) / 2, textAnchor: 'middle', transform: 'rotate(-90 12 ' + ((m.t + H - m.b) / 2) + ')' }, props.yLabel || __sxT('Wynik')),
        pts.map(function (p, i) { return h('circle', { key: i, className: 'sx-nca-pt', cx: X(p.x + (p.jx || 0)), cy: Y(p.y + (p.jy || 0)), r: 3 }); }),
        props.crLine ? (function (c) { var xe = c.b > 0 ? Math.min(x1, (y1 - c.a) / c.b) : x1; return h('line', { className: 'sx-nca-cr', x1: X(x0), y1: Y(c.a + c.b * x0), x2: X(xe), y2: Y(c.a + c.b * xe) }); })(props.crLine) : null,
        h('path', { className: 'sx-nca-ce', d: step }),
        h('text', { className: 'sx-nca-elab', x: m.l + 10, y: m.t + 16 }, props.emptyLabel || __sxT('pusta strefa: tu nie ma obserwacji')),
        bott ? h('g', null, h('line', { className: 'sx-nca-bott', x1: m.l, x2: X(bott.x), y1: Y(bott.y), y2: Y(bott.y) }), h('line', { className: 'sx-nca-bott', x1: X(bott.x), x2: X(bott.x), y1: Y(bott.y), y2: H - m.b }),
          h('circle', { className: 'sx-nca-bdot', cx: X(bott.x), cy: Y(bott.y), r: 5 }), h('text', { className: 'sx-nca-blab', x: X(bott.x) - 8, y: Y(bott.y) - 9, textAnchor: 'end' }, bott.label)) : null,
        hp ? h('circle', { className: 'sx-pt-ring', cx: X(hp.x + (hp.jx || 0)), cy: Y(hp.y + (hp.jy || 0)), r: 8 }) : null),
      hp ? h('div', { className: 'sx-tip', style: { left: Math.min(X(hp.x) / W * 100 + 3, 64) + '%', top: Math.max(0, Y(hp.y) / H * 100 - 20) + '%' } },
        h('div', { className: 'sx-tip-v' }, (props.xShort || 'X') + ' = ' + fmt(hp.x, 0, opts) + ', ' + (props.yShort || 'Y') + ' = ' + fmt(hp.y, 0, opts)),
        h('div', { className: 'sx-tip-l' }, (hp.n || 1) + (hp.n > 1 && hp.n < 5 ? ' osoby' : hp.n === 1 || !hp.n ? ' osoba' : __sxT(' osób'))),
        h('div', { className: 'sx-tip-n' }, __sxT('przy ') + (props.xShort || 'X') + ' = ' + fmt(hp.x, 0, opts) + __sxT(' najwyższy osiągalny ') + (props.yShort || 'Y') + ' to ' + fmt(ceilAt(hp.x), 0, opts))) : null,
      props.legend !== false ? h('figcaption', { className: 'sx-legend' },
        h('span', { className: 'sx-lg sx-lg-sc' }, 'Obserwacje'),
        h('span', { className: 'sx-lg sx-lg-ncace' }, 'Linia sufitu CE-FDH'),
        props.crLine ? h('span', { className: 'sx-lg sx-lg-ncacr' }, 'Linia sufitu CR-FDH') : null,
        h('span', { className: 'sx-lg sx-lg-sq sx-lg-ncaempty' }, 'Pusta strefa'),
        props.d !== undefined ? h('span', { className: 'sx-lg-txt' }, 'd = ' + fmt(props.d, 2, opts) + (props.p !== undefined ? ', p ' + (function (t) { return t.charAt(0) === '<' ? t : '= ' + t; })(fmtP(props.p, opts)) : '')) : null) : null);
  }

  /* ---------- VarianceSplit: share of variance at each level (ICC) ---------- */
  function VarianceSplit(props) {
    var rows = props.rows || [], levels = props.levels || [{ key: 'between', label: __sxT('Między grupami') }, { key: 'within', label: __sxT('Wewnątrz grup') }];
    var opts = { decimal: props.decimal || DEC() };
    var hs = useState(null), hv = hs[0];
    return h('div', { className: cx('sx-vsplit', props.className) },
      h('div', { className: 'sx-vsplit-rows', role: 'list' }, rows.map(function (r, i) {
        var tot = r.parts.reduce(function (s, p) { return s + p.value; }, 0) || 1;
        var first = r.parts[0].value / tot;
        return h('div', { key: r.label, role: 'listitem', className: cx('sx-vsplit-row', props.selected === r.label && 'is-on'), onClick: props.onSelect ? function () { props.onSelect(r.label); } : undefined },
          h('div', { className: 'sx-vsplit-lab' }, h('b', null, r.label), r.sub ? h('span', null, r.sub) : null),
          h('div', { className: 'sx-vsplit-bar', role: 'img', 'aria-label': r.label + ': ' + r.parts.map(function (p, j) { return levels[j].label + ' ' + Math.round(p.value / tot * 100) + '%'; }).join(', ') },
            r.parts.map(function (p, j) {
              var pct = p.value / tot * 100;
              return h('span', { key: j, className: 'sx-vsplit-seg sx-vsplit-s' + j, style: { width: pct + '%' }, onMouseEnter: function () { hs[1]([i, j]); }, onMouseLeave: function () { hs[1](null); } },
                pct >= 12 ? Math.round(pct) + '%' : null);
            })),
          h('div', { className: 'sx-vsplit-icc' }, h('span', null, props.iccLabel || 'ICC'), fmt(first, 2, { decimal: opts.decimal, leadingZero: false })));
      })),
      h('div', { className: 'sx-legend' },
        levels.map(function (l, j) { return h('span', { key: l.key, className: 'sx-lg sx-lg-sq sx-lg-vs' + j }, l.label); }),
        h('span', { className: 'sx-corr-read', role: 'status' }, hv ? rows[hv[0]].label + ' · ' + levels[hv[1]].label.toLowerCase() + ': ' + fmt(rows[hv[0]].parts[hv[1]].value, 2, opts) + ' wariancji (' + Math.round(rows[hv[0]].parts[hv[1]].value / rows[hv[0]].parts.reduce(function (s, p) { return s + p.value; }, 0) * 100) + '%)' : (props.hint || __sxT('Najedź na pasek, aby zobaczyć wariancję na danym poziomie.')))));
  }

  /* ---------- CaterpillarPlot: random effects with intervals, sorted ---------- */
  function CaterpillarPlot(props) {
    var rows = (props.rows || []).slice().sort(function (a, b) { return a.est - b.est; });
    var W = props.width || 640, H = props.height || 260, m = { l: 48, r: 16, t: 14, b: 40 };
    var all = []; rows.forEach(function (r) { all.push(r.lo, r.hi); });
    var y0 = props.min !== undefined ? props.min : Math.min.apply(null, all.concat([0])), y1 = props.max !== undefined ? props.max : Math.max.apply(null, all.concat([0]));
    var st = props.tickStep || niceStep((y1 - y0) / 4); y0 = Math.floor(y0 / st) * st; y1 = Math.ceil(y1 / st) * st;
    var n = rows.length, bw = (W - m.l - m.r) / Math.max(1, n);
    var X = function (i) { return m.l + bw * (i + 0.5); };
    var Y = function (v) { return H - m.b - (v - y0) / (y1 - y0) * (H - m.t - m.b); };
    var opts = { decimal: props.decimal || DEC() };
    var hs = useState(null), hv = hs[0];
    var svg = useRef(null);
    var yt = []; for (var t = y0; t <= y1 + 1e-9; t += st) yt.push(+t.toFixed(4));
    function move(e) { var r = svg.current.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * W; var i = Math.floor((px - m.l) / bw); hs[1](i >= 0 && i < n ? i : null); }
    var hp = hv !== null ? rows[hv] : null;
    var dg = props.digits === undefined ? 2 : props.digits;
    var nHi = rows.filter(function (r) { return r.lo > 0; }).length, nLo = rows.filter(function (r) { return r.hi < 0; }).length;
    return h('figure', { className: cx('sx-chart', 'sx-cat', props.className), style: { position: 'relative' } },
      h('svg', { ref: svg, viewBox: '0 0 ' + W + ' ' + H, style: { maxWidth: props.fluid ? undefined : W }, role: 'img', 'aria-label': props.label || (__sxT('Efekty losowe ') + n + __sxT(' grup z przedziałami')), onMouseMove: move, onMouseLeave: function () { hs[1](null); }, onClick: function () { if (hp && props.onSelect) props.onSelect(hp.id); } },
        yt.map(function (v, i) { return h('g', { key: 'y' + i }, h('line', { className: 'sx-grid', x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v) }), h('text', { className: 'sx-tick', x: m.l - 8, y: Y(v) + 4, textAnchor: 'end' }, fmt(v, st < 0.1 ? 2 : 1, opts))); }),
        h('line', { className: 'sx-cat-zero', x1: m.l, x2: W - m.r, y1: Y(0), y2: Y(0) }),
        rows.map(function (r, i) {
          var tone = r.lo > 0 ? 'is-hi' : r.hi < 0 ? 'is-lo' : '';
          return h('g', { key: r.id, className: cx('sx-cat-r', tone, (props.selected === r.id || i === hv) && 'is-on') },
            h('line', { className: 'sx-cat-ci', x1: X(i), x2: X(i), y1: Y(r.lo), y2: Y(r.hi) }),
            h('circle', { className: 'sx-cat-dot', cx: X(i), cy: Y(r.est), r: props.selected === r.id ? 4.5 : 3.25 }));
        }),
        h('text', { className: 'sx-axis-label', x: (m.l + W - m.r) / 2, y: H - 10, textAnchor: 'middle' }, props.axisLabel || (n + __sxT(' grup, od najniższego efektu do najwyższego'))),
        hp ? h('rect', { className: 'sx-cat-hover', x: X(hv) - bw / 2, y: m.t, width: bw, height: H - m.t - m.b }) : null),
      hp ? h('div', { className: 'sx-tip', style: { left: Math.min(X(hv) / W * 100 + 2, 66) + '%', top: '4%' } },
        h('div', { className: 'sx-tip-v' }, hp.label || hp.id),
        h('div', { className: 'sx-tip-l' }, (props.effectShort || 'u₀') + ' = ' + fmt(hp.est, dg, opts) + ' [' + fmt(hp.lo, dg, opts) + '; ' + fmt(hp.hi, dg, opts) + ']'),
        h('div', { className: 'sx-tip-n' }, (hp.n ? 'n = ' + hp.n + ' · ' : '') + (hp.lo > 0 ? __sxT('wyraźnie powyżej średniej') : hp.hi < 0 ? __sxT('wyraźnie poniżej średniej') : __sxT('nie różni się od średniej')))) : null,
      props.legend !== false ? h('figcaption', { className: 'sx-legend' },
        h('span', { className: 'sx-lg sx-lg-cat' }, __sxT('Grupa z 95% przedziałem')),
        h('span', { className: 'sx-lg sx-lg-cathi' }, __sxT('Powyżej średniej (') + nHi + ')'),
        h('span', { className: 'sx-lg sx-lg-catlo' }, __sxT('Poniżej średniej (') + nLo + ')'),
        h('span', { className: 'sx-lg sx-lg-catz' }, props.referenceLabel || __sxT('Średnia wszystkich grup'))) : null);
  }

  /* ---------- SlopesPlot: one line per group plus the fixed effect ---------- */
  function SlopesPlot(props) {
    var lines = props.lines || [], fx = props.fixed;
    var W = props.width || 560, H = props.height || 320, m = { l: 48, r: 16, t: 16, b: 46 };
    var x0 = props.xMin !== undefined ? props.xMin : -3, x1 = props.xMax !== undefined ? props.xMax : 3;
    var ys = []; lines.concat(fx ? [fx] : []).forEach(function (l) { ys.push(l.a + l.b * x0, l.a + l.b * x1); });
    var y0 = props.yMin !== undefined ? props.yMin : Math.floor(Math.min.apply(null, ys)), y1 = props.yMax !== undefined ? props.yMax : Math.ceil(Math.max.apply(null, ys));
    var X = function (v) { return m.l + (v - x0) / (x1 - x0) * (W - m.l - m.r); };
    var Y = function (v) { return H - m.b - (Math.max(y0, Math.min(y1, v)) - y0) / (y1 - y0) * (H - m.t - m.b); };
    var opts = { decimal: props.decimal || DEC() };
    var hs = useState(null), hv = hs[0];
    var svg = useRef(null);
    var sx = props.xStep || 1, tx = []; for (var t = x0; t <= x1 + 1e-9; t += sx) tx.push(+t.toFixed(4));
    var sy = props.yStep || niceStep((y1 - y0) / 4), ty = []; for (var u = Math.ceil(y0 / sy) * sy; u <= y1 + 1e-9; u += sy) ty.push(+u.toFixed(4));
    function move(e) {
      var r = svg.current.getBoundingClientRect(), k = W / r.width, px = (e.clientX - r.left) * k, py = (e.clientY - r.top) * k;
      var xv = x0 + (px - m.l) / (W - m.l - m.r) * (x1 - x0); if (xv < x0 || xv > x1) { hs[1](null); return; }
      var best = null, bd = 10;
      lines.forEach(function (l, i) { var d = Math.abs(Y(l.a + l.b * xv) - py); if (d < bd) { bd = d; best = i; } });
      hs[1](best);
    }
    var hl = hv !== null ? lines[hv] : null;
    var selL = lines.filter(function (l) { return l.id === props.selected; })[0];
    var dg = props.digits === undefined ? 2 : props.digits;
    var band = fx && fx.lo && fx.hi ? (function () { var P = []; for (var i = 0; i <= 24; i++) { var xv = x0 + (x1 - x0) * i / 24; P.push([xv, Math.max(fx.lo.a + fx.lo.b * xv, fx.hi.a + fx.hi.b * xv), Math.min(fx.lo.a + fx.lo.b * xv, fx.hi.a + fx.hi.b * xv)]); } return P.map(function (p, i) { return (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1); }).join(' ') + ' ' + P.slice().reverse().map(function (p) { return 'L' + X(p[0]).toFixed(1) + ' ' + Y(p[2]).toFixed(1); }).join(' ') + ' Z'; })() : null;
    return h('figure', { className: cx('sx-chart', 'sx-slopes', props.className), style: { position: 'relative' } },
      h('svg', { ref: svg, viewBox: '0 0 ' + W + ' ' + H, style: { maxWidth: props.fluid ? undefined : W }, role: 'img', 'aria-label': props.label || (__sxT('Nachylenia w ') + lines.length + __sxT(' grupach i efekt stały')), onMouseMove: move, onMouseLeave: function () { hs[1](null); }, onClick: function () { if (hl && props.onSelect) props.onSelect(hl.id); } },
        ty.map(function (v, i) { return h('g', { key: 'y' + i }, h('line', { className: 'sx-grid', x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v) }), h('text', { className: 'sx-tick', x: m.l - 8, y: Y(v) + 4, textAnchor: 'end' }, fmt(v, sy < 1 ? 1 : 0, opts))); }),
        tx.map(function (v, i) { return h('text', { key: 'x' + i, className: 'sx-tick', x: X(v), y: H - m.b + 18, textAnchor: 'middle' }, (v > 0 ? '+' : '') + fmt(v, sx < 1 ? 1 : 0, opts)); }),
        h('text', { className: 'sx-axis-label', x: (m.l + W - m.r) / 2, y: H - 8, textAnchor: 'middle' }, props.xLabel || __sxT('Predyktor')),
        h('text', { className: 'sx-axis-label', x: 12, y: (m.t + H - m.b) / 2, textAnchor: 'middle', transform: 'rotate(-90 12 ' + ((m.t + H - m.b) / 2) + ')' }, props.yLabel || __sxT('Wynik')),
        lines.map(function (l, i) { return h('line', { key: l.id, className: cx('sx-sl-line', (i === hv || l.id === props.selected) && 'is-on'), x1: X(x0), y1: Y(l.a + l.b * x0), x2: X(x1), y2: Y(l.a + l.b * x1) }); }),
        band ? h('path', { className: 'sx-sl-band', d: band }) : null,
        fx ? h('line', { className: 'sx-sl-fixed', x1: X(x0), y1: Y(fx.a + fx.b * x0), x2: X(x1), y2: Y(fx.a + fx.b * x1) }) : null,
        selL ? h('line', { className: 'sx-sl-sel', x1: X(x0), y1: Y(selL.a + selL.b * x0), x2: X(x1), y2: Y(selL.a + selL.b * x1) }) : null),
      hl ? h('div', { className: 'sx-tip', style: { left: '58%', top: '6%' } },
        h('div', { className: 'sx-tip-v' }, hl.label || hl.id),
        h('div', { className: 'sx-tip-l' }, (props.slopeShort || 'nachylenie') + ' ' + fmt(hl.b, dg, opts) + (fx ? __sxT(' (średnio ') + fmt(fx.b, dg, opts) + ')' : '')),
        hl.n ? h('div', { className: 'sx-tip-n' }, 'n = ' + hl.n) : null) : null,
      props.legend !== false ? h('figcaption', { className: 'sx-legend' },
        h('span', { className: 'sx-lg sx-lg-sl' }, __sxT('Pojedyncza grupa')),
        fx ? h('span', { className: 'sx-lg sx-lg-slfix' }, (props.fixedLabel || __sxT('Efekt stały')) + (band ? __sxT(' z 95% CI') : '')) : null,
        selL ? h('span', { className: 'sx-lg sx-lg-slsel' }, 'Wybrana: ' + (selL.label || selL.id)) : null) : null);
  }

  /* ---------- TagInput: a list of short values (missing-value codes, keywords) ---------- */
  function TagInput(props) {
    var st = useState(props.defaultValue || []);
    var vals = props.value !== undefined ? props.value : st[0];
    var ds = useState(''), draft = ds[0];
    var inp = useRef(null);
    function set(v) { if (props.value === undefined) st[1](v); if (props.onChange) props.onChange(v); }
    function add(raw) { var t = String(raw).trim(); if (!t && t !== '') return; if (vals.indexOf(t) >= 0) { ds[1](''); return; } set(vals.concat([t])); ds[1](''); }
    function key(e) {
      if ((e.key === 'Enter' || e.key === ',' || e.key === 'Tab') && draft.trim()) { e.preventDefault(); add(draft); }
      else if (e.key === 'Backspace' && !draft && vals.length) { set(vals.slice(0, -1)); }
    }
    var shown = function (v) { return v === '' ? (props.emptyLabel || __sxT('pusta komórka')) : v; };
    return h('div', { className: cx('sx-tags', props.className), onClick: function (e) { if (e.target === e.currentTarget && inp.current) inp.current.focus(); } },
      vals.map(function (v, i) {
        return h('span', { key: v + i, className: cx('sx-tag', v === '' && 'is-empty') }, h('span', { className: 'sx-tag-t' }, shown(v)),
          h('button', { type: 'button', className: 'sx-tag-x', 'aria-label': __sxT('Usuń: ') + shown(v), onClick: function () { set(vals.filter(function (x, j) { return j !== i; })); } }, h(Icon, { name: 'x', size: 12 })));
      }),
      h('input', { ref: inp, id: props.id, className: 'sx-tags-input', value: draft, placeholder: vals.length ? props.morePlaceholder || '' : props.placeholder, 'aria-label': props.label || props.placeholder,
        onChange: function (e) { ds[1](e.target.value); }, onKeyDown: key, onBlur: function () { if (draft.trim()) add(draft); } }),
      (props.suggestions || []).filter(function (s) { return vals.indexOf(s) < 0; }).length ? h('span', { className: 'sx-tags-sugg' },
        (props.suggestions || []).filter(function (s) { return vals.indexOf(s) < 0; }).map(function (s) { return h('button', { key: 's' + s, type: 'button', className: 'sx-tags-add', onClick: function () { set(vals.concat([s])); } }, h(Icon, { name: 'plus', size: 12 }), shown(s)); })) : null);
  }

  /* ---------- JobTray: long computations running in the background ---------- */
  function JobTray(props) {
    var jobs = props.jobs || [];
    var st = useState(!!props.defaultOpen), open = props.open !== undefined ? props.open : st[0];
    function setOpen(v) { if (props.open === undefined) st[1](v); if (props.onOpenChange) props.onOpenChange(v); }
    var wrap = useRef(null);
    var uid = useUid('jobs');
    useOutside(wrap, open, function () { setOpen(false); });
    var running = jobs.filter(function (j) { return j.status === 'running' || j.status === 'queued'; });
    var failed = jobs.filter(function (j) { return j.status === 'error'; }).length;
    var label = running.length ? running.length + (running.length === 1 ? ' zadanie' : running.length < 5 ? ' zadania' : __sxT(' zadań')) : failed ? __sxT('Błąd zadania') : __sxT('Zadania');
    var lead = running.filter(function (j) { return j.status === 'running'; })[0];
    return h('div', { ref: wrap, className: cx('sx-jobs', props.className), onKeyDown: function (e) { if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false); var b = wrap.current.querySelector('button'); if (b) b.focus(); } } },
      h('button', { type: 'button', className: cx('sx-jobs-btn', running.length && 'is-busy', failed && !running.length && 'is-error'), 'aria-expanded': open, 'aria-controls': open ? uid : undefined, 'aria-haspopup': 'dialog', onClick: function () { setOpen(!open); } },
        running.length ? h('span', { className: 'sx-jobs-ring', style: { '--sx-p': Math.round((lead ? lead.progress || 0 : 0) * 360) + 'deg' }, 'aria-hidden': true }) : h(Icon, { name: failed ? 'poor' : 'check', size: 15 }),
        h('span', null, label),
        lead && lead.eta ? h('span', { className: 'sx-jobs-eta' }, lead.eta) : null),
      open ? h('div', { id: uid, role: 'dialog', 'aria-label': __sxT('Zadania w tle'), className: cx('sx-jobs-pop', props.align === 'start' && 'is-start') },
        h('div', { className: 'sx-jobs-head' }, h('b', null, __sxT('Zadania w tle')), h('span', null, props.note || __sxT('Możesz pracować dalej - wynik pojawi się sam.'))),
        jobs.length ? h('ul', { className: 'sx-jobs-list' }, jobs.map(function (j) {
          var pct = Math.round((j.progress || 0) * 100);
          return h('li', { key: j.id, className: 'sx-job is-' + (j.status || 'running') },
            h('span', { className: 'sx-job-ico' }, h(Icon, { name: j.icon || 'play', size: 16 })),
            h('div', { className: 'sx-job-main' },
              h('div', { className: 'sx-job-top' }, h('span', { className: 'sx-job-label' }, j.label), j.module ? h('span', { className: 'sx-job-mod' }, j.module) : null),
              j.status === 'running' ? h(Progress, { value: pct, max: 100, label: j.label, valueText: pct + '%' + (j.eta ? ' · ' + j.eta : ''), detail: j.detail }) :
                h('div', { className: 'sx-job-detail' }, j.status === 'queued' ? h(React.Fragment, null, h(Icon, { name: 'history', size: 13 }), __sxT(' w kolejce')) : j.status === 'cancelled' ? h(React.Fragment, null, h(Icon, { name: 'x', size: 13 }), ' ' + (j.detail || 'anulowano')) : j.status === 'error' ? h(React.Fragment, null, h(Icon, { name: 'poor', size: 13, className: 'sx-tone-poor' }), ' ' + (j.detail || __sxT('nie udało się'))) : h(React.Fragment, null, h(Icon, { name: 'good', size: 13, className: 'sx-tone-good' }), ' ' + (j.detail || 'gotowe')))),
            h('div', { className: 'sx-job-act' },
              j.status === 'running' || j.status === 'queued' ? h(Button, { size: 'sm', variant: 'ghost', icon: 'x', 'aria-label': __sxT('Anuluj: ') + j.label, title: __sxT('Anuluj'), onClick: function () { if (props.onCancel) props.onCancel(j.id); } }) :
                j.status === 'cancelled' ? (props.onResume ? h(Button, { size: 'sm', variant: 'ghost', icon: 'play', onClick: function () { props.onResume(j.id); } }, __sxT('Wznów')) : null) :
                h(Button, { size: 'sm', variant: 'ghost', onClick: function () { if (props.onOpenResult) props.onOpenResult(j.id); setOpen(false); } }, j.status === 'error' ? __sxT('Diagnoza') : __sxT('Pokaż'))));
        })) : h('div', { className: 'sx-jobs-empty' }, __sxT('Nic się teraz nie liczy.')),
        props.footer ? h('div', { className: 'sx-jobs-foot' }, props.footer) : null) : null);
  }

  window.SEMplex = Object.assign(window.SEMplex || {}, {
    Logo: Logo, Icon: Icon, Button: Button, Segmented: Segmented, Field: Field, Input: Input, Select: Select, Switch: Switch,
    Badge: Badge, ReleaseTag: ReleaseTag, Verdict: Verdict, Kbd: Kbd, Sidebar: Sidebar, PipelineStepper: PipelineStepper, Tabs: Tabs,
    CommandPalette: CommandPalette, Panel: Panel, FitIndex: FitIndex, Interpretation: Interpretation, Term: Term, Progress: Progress,
    ResultTable: ResultTable, LoadingHeatmap: LoadingHeatmap, ScreePlot: ScreePlot, ForestPlot: ForestPlot, PathDiagram: PathDiagram,
    VariableChip: VariableChip, Dropzone: Dropzone, CodeExport: CodeExport, DecisionLog: DecisionLog,
    Toolbar: Toolbar, ModelCanvas: ModelCanvas, SyntaxEditor: SyntaxEditor, WaterfallChart: WaterfallChart, Slider: Slider, StatTile: StatTile, ChoiceGroup: ChoiceGroup, StepList: StepList, RunList: RunList, DataGrid: DataGrid, Distribution: Distribution, MissingMap: MissingMap, ScatterPlot: ScatterPlot, FactorConsensus: FactorConsensus, SampleSplit: SampleSplit,
    Diagnosis: Diagnosis, ThresholdPlot: ThresholdPlot, ValidityMatrix: ValidityMatrix, InvarianceLadder: InvarianceLadder, DecisionTimeline: DecisionTimeline, Drawer: Drawer, PowerCurve: PowerCurve, ConditionalEffectPlot: ConditionalEffectPlot, CorrMatrix: CorrMatrix, navSections: navSections, useMedia: useMedia, TagInput: TagInput, JobTray: JobTray, Inspector: Inspector, IPMAMap: IPMAMap, NCAPlot: NCAPlot, VarianceSplit: VarianceSplit, CaterpillarPlot: CaterpillarPlot, SlopesPlot: SlopesPlot, TopBar: TopBar, Toast: Toast, Dialog: Dialog, Menu: Menu, ContextMenu: ContextMenu, Checkbox: Checkbox, RadioGroup: RadioGroup, Textarea: Textarea, EmptyState: EmptyState, Skeleton: Skeleton,
    format: { num: fmt, p: fmtP, stars: stars },
    lavaan: { parse: parseLavaan, print: printLavaan, identification: identification, edgeKey: edgeKey }
  });
})();
