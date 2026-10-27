import type * as React from 'react';

export type Tone = 'good' | 'ok' | 'poor';
export type Release = 'MVP' | 'v1' | 'v2' | 'nowe';
export type IconName =
  | 'data' | 'stats' | 'reliability' | 'efa' | 'cfa' | 'sem' | 'bridge' | 'mediation' | 'groups' | 'pls' | 'power' | 'layers' | 'report'
  | 'code' | 'search' | 'play' | 'check' | 'good' | 'ok' | 'poor' | 'info' | 'upload' | 'download' | 'copy' | 'chevron-right' | 'chevron-down'
  | 'arrow-right' | 'plus' | 'x' | 'settings' | 'lock' | 'history' | 'book' | 'globe' | 'sun' | 'moon' | 'split' | 'trash' | 'link' | 'shuffle'
  | 'pointer' | 'latent' | 'observed' | 'path' | 'cov' | 'interaction' | 'undo' | 'redo' | 'layout' | 'zoom-in' | 'zoom-out' | 'fit' | 'eye' | 'template'
  | 'minus' | 'more' | 'file' | 'refresh' | 'pencil' | 'print' | 'pin' | 'help' | 'keyboard' | 'folder' | 'archive' | 'bug' | 'external';

/** Znak SEMplex z nazwą. */
export interface LogoProps { size?: number; name?: boolean; className?: string }
export declare function Logo(props: LogoProps): React.ReactElement;

/** Ikona z zestawu SEMplex (24 px, kreska 1,75). */
export interface IconProps { name: IconName; size?: number; title?: string; strokeWidth?: number; className?: string; style?: React.CSSProperties }
export declare function Icon(props: IconProps): React.ReactElement | null;
/** Lista nazw wszystkich ikon w kolejności zestawu. */
export declare namespace Icon { const names: IconName[]; }

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName; iconRight?: IconName; loading?: boolean; block?: boolean;
}
export declare function Button(props: ButtonProps): React.ReactElement;

export interface SegmentedOption { value: string; label?: React.ReactNode; icon?: IconName; title?: string }
export interface SegmentedProps { options: SegmentedOption[]; value?: string; defaultValue?: string; onChange?: (value: string) => void; size?: 'sm' | 'md'; label?: string; className?: string }
export declare function Segmented(props: SegmentedProps): React.ReactElement;

export interface FieldProps { label?: React.ReactNode; hint?: React.ReactNode; error?: React.ReactNode; required?: boolean; aside?: React.ReactNode; htmlFor?: string; children: React.ReactElement; className?: string }
export declare function Field(props: FieldProps): React.ReactElement;

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { mono?: boolean; icon?: IconName; suffix?: React.ReactNode }
export declare function Input(props: InputProps): React.ReactElement;

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> { options: Array<string | { value: string; label: React.ReactNode }> }
export declare function Select(props: SelectProps): React.ReactElement;

export interface SwitchProps { label?: React.ReactNode; hint?: React.ReactNode; checked?: boolean; defaultChecked?: boolean; onChange?: (checked: boolean) => void; disabled?: boolean; className?: string }
export declare function Switch(props: SwitchProps): React.ReactElement;

export interface BadgeProps { tone?: 'neutral' | 'brand' | 'observed' | Tone; icon?: IconName; children?: React.ReactNode; className?: string }
export declare function Badge(props: BadgeProps): React.ReactElement;

export interface ReleaseTagProps { release: Release; className?: string }
export declare function ReleaseTag(props: ReleaseTagProps): React.ReactElement;

export interface VerdictProps { level: Tone; children?: React.ReactNode; className?: string }
export declare function Verdict(props: VerdictProps): React.ReactElement;

export interface KbdProps { children: React.ReactNode }
export declare function Kbd(props: KbdProps): React.ReactElement;

export interface SidebarItem { id: string; label: React.ReactNode; icon?: IconName; status?: Tone; release?: Release; count?: number; disabled?: boolean }
export interface SidebarProps { sections: Array<{ label?: string; items: SidebarItem[] }>; compact?: boolean; active?: string; defaultActive?: string; onSelect?: (id: string) => void; header?: React.ReactNode; footer?: React.ReactNode; label?: string; className?: string }
export declare function Sidebar(props: SidebarProps): React.ReactElement;

export interface PipelineStep { id?: string; label: React.ReactNode; meta?: React.ReactNode; status?: 'done' | 'current' | 'warn' | 'todo' }
export interface PipelineStepperProps { steps: PipelineStep[]; onSelect?: (id?: string) => void; allowAhead?: boolean; compact?: boolean; label?: string; className?: string }
export declare function PipelineStepper(props: PipelineStepperProps): React.ReactElement;

export interface TabsProps { tabs: Array<{ id: string; label: React.ReactNode; icon?: IconName; count?: number; status?: Tone }>; value?: string; defaultValue?: string; onChange?: (id: string) => void; className?: string }
export declare function Tabs(props: TabsProps): React.ReactElement;

export interface CommandItem { id?: string; title: string; module?: string; icon?: IconName; release?: Release; keywords?: string; description?: string; shortcut?: string }
export interface CommandScope { prefix: string; label: string; module: string; placeholder?: string }
export interface CommandPaletteProps { items: CommandItem[]; onPick?: (item: CommandItem) => void; onClose?: () => void; overlay?: boolean; defaultQuery?: string; placeholder?: string; limit?: number; total?: number; autoFocus?: boolean; scopes?: CommandScope[]; recent?: string[]; recentLabel?: string; countLabel?: React.ReactNode; contained?: boolean; label?: string }
export declare function CommandPalette(props: CommandPaletteProps): React.ReactElement;

export interface PanelProps { title?: React.ReactNode; eyebrow?: React.ReactNode; subtitle?: React.ReactNode; icon?: IconName; actions?: React.ReactNode; flush?: boolean; children?: React.ReactNode; className?: string; style?: React.CSSProperties }
export declare function Panel(props: PanelProps): React.ReactElement;

export interface FitIndexProps { label: React.ReactNode; value: number | string; verdict?: Tone; threshold?: React.ReactNode; source?: React.ReactNode; ci?: [number, number]; ciLabel?: string; scale?: [number, number]; cut?: number; term?: React.ReactNode; digits?: number; decimal?: ',' | '.'; leadingZero?: boolean; className?: string }
export declare function FitIndex(props: FitIndexProps): React.ReactElement;

export interface InterpretationProps { tone?: 'info' | 'good' | 'warn' | 'poor' | 'brand'; title?: React.ReactNode; icon?: IconName; source?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string }
export declare function Interpretation(props: InterpretationProps): React.ReactElement;

export interface TermProps { term: React.ReactNode; definition?: React.ReactNode; threshold?: React.ReactNode; source?: React.ReactNode; placement?: 'bottom' | 'top'; open?: boolean; children?: React.ReactNode }
export declare function Term(props: TermProps): React.ReactElement;

export interface ProgressProps { value?: number; max?: number; label?: React.ReactNode; valueText?: React.ReactNode | false; detail?: React.ReactNode; indeterminate?: boolean; className?: string }
export declare function Progress(props: ProgressProps): React.ReactElement;

export interface ResultColumn { key: string; label: React.ReactNode; type?: 'text' | 'var' | 'num' | 'est' | 'p' | 'ci' | 'verdict'; digits?: number; weakBelow?: number; pKey?: string; align?: 'text' | 'num' | 'center'; title?: string; render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode }
export interface ResultTableProps { columns: ResultColumn[]; rows: Array<Record<string, unknown> & { group?: string; flag?: 'ok' | 'poor'; muted?: boolean; selected?: boolean; hovered?: boolean }>; onRowClick?: (row: Record<string, unknown>, index: number) => void; onRowHover?: (row: Record<string, unknown> | null, index: number | null) => void; caption?: React.ReactNode; number?: React.ReactNode; note?: React.ReactNode; decimal?: ',' | '.'; leadingZero?: boolean; dense?: boolean; className?: string }
export declare function ResultTable(props: ResultTableProps): React.ReactElement;

export interface LoadingHeatmapProps { items: string[]; factors: string[]; loadings: number[][]; cutoff?: number; communality?: number[]; stability?: number[]; stabilityCutoff?: number; explained?: number[]; explainedLabel?: string; crossRule?: { min: number; gap: number }; selected?: string; onRowClick?: (item: string, index: number) => void; onRowContextMenu?: (item: string, index: number, e: React.MouseEvent) => void; removed?: string[]; labels?: Record<string, string> | string[]; legend?: boolean; corner?: React.ReactNode; decimal?: ',' | '.'; leadingZero?: boolean; className?: string }
export declare function LoadingHeatmap(props: LoadingHeatmapProps): React.ReactElement;

export interface ScreePlotProps { eigenvalues: number[]; parallel?: number[]; suggested?: number; suggestedLabel?: string; selected?: number; onSelect?: (k: number) => void; hovered?: number | null; onHover?: (k: number | null) => void; tooltip?: boolean; kaiser?: boolean; width?: number; height?: number; fluid?: boolean; decimal?: ',' | '.'; className?: string }
export declare function ScreePlot(props: ScreePlotProps): React.ReactElement;

export interface FactorCriterion { id?: string; name: string; source?: string; k: number; recommended?: boolean; aux?: boolean; note?: string }
export interface FactorConsensusProps { criteria: FactorCriterion[]; max?: number; value?: number; onChange?: (k: number) => void; consensus?: number; hovered?: number | null; onHover?: (k: number | null) => void; caption?: React.ReactNode; className?: string }
export declare function FactorConsensus(props: FactorConsensusProps): React.ReactElement;

export interface SamplePart { label: string; n: number; tone?: 'observed' | 'brand' | 'neutral'; icon?: IconName; active?: boolean; dim?: boolean; note?: string }
export interface SampleSplitProps { parts: SamplePart[]; n?: number; method?: string; seed?: number | string; className?: string }
export declare function SampleSplit(props: SampleSplitProps): React.ReactElement;

export interface ForestRow { label: string; est: number; lo: number; hi: number; sub?: string; highlight?: boolean; muted?: boolean; noCi?: boolean }
export interface ForestPlotProps { rows: ForestRow[]; reference?: number; referenceLabel?: string; referenceShort?: string; band?: [number, number]; bandLabel?: string; highlightLabel?: string; otherLabel?: string; selected?: number | null; onSelect?: (index: number) => void; hovered?: number | null; onHover?: (index: number | null) => void; tooltip?: boolean; legend?: boolean; axisLabel?: string; min?: number; max?: number; tickStep?: number; width?: number; fluid?: boolean; labelWidth?: number; valueWidth?: number; rowHeight?: number; label?: string; decimal?: ',' | '.'; className?: string }
export declare function ForestPlot(props: ForestPlotProps): React.ReactElement;

export interface PathNode { id: string; label?: string; kind?: 'latent' | 'observed'; x: number; y: number; r2?: number; rx?: number; ry?: number; w?: number; h?: number; highlight?: boolean }
export interface PathEdge { from: string; to: string; kind?: 'path' | 'loading' | 'cov'; est?: number; p?: number; label?: string; bend?: number; labelAt?: number }
export interface PathDiagramProps { nodes: PathNode[]; edges: PathEdge[]; width?: number; height?: number; legend?: boolean; label?: string; decimal?: ',' | '.'; leadingZero?: boolean; className?: string }
export declare function PathDiagram(props: PathDiagramProps): React.ReactElement;

export interface VariableChipProps { name: string; type?: 'continuous' | 'ordinal' | 'binary' | 'nominal'; label?: string; showLabel?: boolean; selected?: boolean; reversed?: boolean; onRemove?: () => void; className?: string }
export declare function VariableChip(props: VariableChipProps): React.ReactElement;

export interface DropzoneProps { onFiles?: (files: File[]) => void; formats?: string[]; title?: React.ReactNode; subtitle?: React.ReactNode; cta?: React.ReactNode; onSample?: () => void; sampleLabel?: React.ReactNode; privacy?: React.ReactNode | false; compact?: boolean; className?: string; error?: { title: React.ReactNode; detail?: React.ReactNode; cta?: string; fixLabel?: string; fixIcon?: IconName; onFix?: () => void } }
export declare function Dropzone(props: DropzoneProps): React.ReactElement;

export interface CodeExportProps { snippets: { python?: string; lavaan?: string; mplus?: string; [lang: string]: string | undefined }; defaultLang?: string; meta?: React.ReactNode; onDownload?: () => void; className?: string }
export declare function CodeExport(props: CodeExportProps): React.ReactElement;

export interface DecisionEntry { kind?: 'remove' | 'add' | 'change' | 'split' | 'run' | 'note'; action: React.ReactNode; reason?: React.ReactNode; effect?: React.ReactNode; time: string }
export interface DecisionLogProps { entries: DecisionEntry[]; className?: string }
export declare function DecisionLog(props: DecisionLogProps): React.ReactElement;

export interface ToolbarItem { id: string; icon?: IconName; label: string; shortcut?: string; type?: 'mode' | 'action'; text?: React.ReactNode; disabled?: boolean }
export interface ToolbarProps { items: Array<ToolbarItem | '|'>; value?: string; onChange?: (id: string) => void; onAction?: (id: string) => void; vertical?: boolean; label?: string; className?: string }
export declare function Toolbar(props: ToolbarProps): React.ReactElement;

export interface ModelNode { id: string; kind: 'latent' | 'observed'; x: number; y: number; label?: string }
export interface ModelEdge { id?: string; from: string; to: string; kind: 'loading' | 'path' | 'cov'; label?: string; fixed?: number | null; bend?: number }
export type Selection = { type: 'node' | 'edge'; id: string } | null;
export interface ModelCanvasProps {
  nodes: ModelNode[]; edges: ModelEdge[]; selected?: Selection; tool?: 'select' | 'latent' | 'observed' | 'path' | 'cov';
  estimates?: Record<string, { est?: number; p?: number }>; r2?: Record<string, number>; showEstimates?: boolean; showLabels?: boolean; stale?: boolean;
  highlight?: string[]; flagged?: string[]; dim?: string[]; fitOnMount?: boolean; fitKey?: number; fitPad?: { top?: number; right?: number; bottom?: number; left?: number };
  minimap?: boolean; controls?: boolean; snap?: number; decimal?: ',' | '.'; emptyTitle?: React.ReactNode; emptyText?: React.ReactNode; label?: string;
  onSelect?: (sel: Selection) => void; onMoveNode?: (id: string, x: number, y: number, done: boolean) => void; onCreateNode?: (kind: 'latent' | 'observed', x: number, y: number) => void;
  onCreateEdge?: (from: string, to: string, kind: 'loading' | 'path' | 'cov') => void; onDelete?: (sel: Selection) => void; onDropItem?: (data: string, x: number, y: number) => void;
  onContextMenu?: (target: { type: 'node' | 'edge'; id: string } | null, at: { x: number; y: number }) => void;
  children?: React.ReactNode; className?: string; style?: React.CSSProperties;
}
export declare function ModelCanvas(props: ModelCanvasProps): React.ReactElement;

export interface Diagnostic { line: number; message: string; level?: 'warn' }
export interface SyntaxEditorProps { value: string; onChange?: (text: string) => void; diagnostics?: Diagnostic[]; activeLines?: number[]; readOnly?: boolean; height?: number | string; label?: string; onKeyDown?: React.KeyboardEventHandler; onFocus?: React.FocusEventHandler; onBlur?: React.FocusEventHandler; className?: string }
export declare function SyntaxEditor(props: SyntaxEditorProps): React.ReactElement;

export interface WaterfallStep { label: string; value?: number; kind?: 'start' | 'step' | 'end' | 'aside'; note?: string }
export interface WaterfallChartProps { steps: WaterfallStep[]; min?: number; max?: number; tickStep?: number; width?: number; height?: number; fluid?: boolean; barWidth?: number; axisLabel?: string | false; startLabel?: string; endLabel?: string; asideLabel?: string; legend?: boolean; label?: string; decimal?: ',' | '.'; className?: string }
export declare function WaterfallChart(props: WaterfallChartProps): React.ReactElement;

export interface SliderProps { label?: React.ReactNode; min?: number; max?: number; step?: number; value?: number; defaultValue?: number; onChange?: (value: number) => void; format?: (value: number) => string; marks?: Array<{ value: number; label: string; emphasis?: boolean }>; hint?: React.ReactNode; disabled?: boolean; className?: string }
export declare function Slider(props: SliderProps): React.ReactElement;

export interface StatTileProps { label: React.ReactNode; value: React.ReactNode; unit?: React.ReactNode; icon?: IconName; tone?: 'brand' | Tone; meter?: number; note?: React.ReactNode; className?: string }
export declare function StatTile(props: StatTileProps): React.ReactElement;

export interface ChoiceOption { value: string; title: React.ReactNode; desc?: React.ReactNode; meta?: React.ReactNode; icon?: IconName; release?: Release; disabled?: boolean }
export interface ChoiceGroupProps { options: ChoiceOption[]; value?: string; defaultValue?: string; onChange?: (value: string) => void; columns?: number; size?: 'sm' | 'md'; label?: string; className?: string }
export declare function ChoiceGroup(props: ChoiceGroupProps): React.ReactElement;

export interface StepListStep { id?: string; label: React.ReactNode; desc?: React.ReactNode; status?: 'done' | 'current' | 'warn' | 'todo' }
export interface StepListProps { steps: StepListStep[]; onSelect?: (id: string | undefined, index: number) => void; label?: string; className?: string }
export declare function StepList(props: StepListProps): React.ReactElement;

export interface RunTask { id?: string; label: React.ReactNode; detail?: React.ReactNode; status?: 'todo' | 'running' | 'done' | 'warn' | 'error'; result?: React.ReactNode; running?: React.ReactNode }
export interface RunListProps { tasks: RunTask[]; className?: string }
export declare function RunList(props: RunListProps): React.ReactElement;

export interface DataGridColumn { key: string; type?: 'ordinal' | 'continuous' | 'binary' | 'nominal'; label?: string; hist?: number[]; missing?: number; reversed?: boolean; flag?: Tone; digits?: number }
export interface DataGridProps { columns: DataGridColumn[]; rows: Array<Array<number | string | null>>; rowIds?: Array<number | string>; rowFlags?: Record<string, 'flagged' | 'excluded'>; selectedColumn?: string; onSelectColumn?: (key: string) => void; limit?: number; onMore?: () => void; height?: number | string; decimal?: ',' | '.'; className?: string }
export declare function DataGrid(props: DataGridProps): React.ReactElement;

export interface DistributionProps { counts: number[]; labels?: string[]; valueLabels?: string[]; mean?: number; meanBase?: number; showValues?: boolean; highlight?: number; mini?: boolean; width?: number; height?: number; label?: string; decimal?: ',' | '.'; className?: string }
export declare function Distribution(props: DistributionProps): React.ReactElement;

export interface MissingPattern { missing: string[]; count: number; label?: string }
export interface MissingMapProps { variables: string[]; patterns: MissingPattern[]; decimal?: ',' | '.'; className?: string }
export declare function MissingMap(props: MissingMapProps): React.ReactElement;

export interface ScatterPoint { x: number; y: number; flag?: boolean; excluded?: boolean; id?: number | string; note?: string }
export interface ScatterPlotProps { points: ScatterPoint[]; xLabel?: string; yLabel?: string; xShort?: string; yShort?: string; xThreshold?: number; xThresholdLabel?: string; yThreshold?: number; yThresholdLabel?: string; zone?: { x0?: number; x1?: number; y0?: number; y1?: number }; zoneLabel?: string; xMin?: number; xMax?: number; yMin?: number; yMax?: number; xStep?: number; yStep?: number; pointLabel?: (p: ScatterPoint) => string; onHover?: (p: ScatterPoint | null) => void; onSelect?: (p: ScatterPoint) => void; flagLabel?: string; normalLabel?: string; legend?: boolean; width?: number; height?: number; fluid?: boolean; label?: string; decimal?: ',' | '.'; className?: string }
export declare function ScatterPlot(props: ScatterPlotProps): React.ReactElement;

export interface LavaanModel { nodes: Array<{ id: string; kind: 'latent' | 'observed' }>; edges: ModelEdge[]; defined: Array<{ name: string; expr: string }> }
export interface Lavaan {
  /** Składnia → model; błędy z numerem wiersza i komunikatem po polsku. */
  parse(text: string): LavaanModel & { errors: Diagnostic[] };
  /** Model → składnia z sekcjami: pomiarowy, strukturalny, kowariancje, efekty. */
  print(model: { nodes: ModelNode[] | LavaanModel['nodes']; edges: ModelEdge[]; defined?: LavaanModel['defined'] }): string;
  /** Liczba momentów, parametrów, df i problemy z identyfikowalnością. */
  identification(model: { nodes: Array<{ id: string; kind: string }>; edges: ModelEdge[] }): { p: number; moments: number; params: number; df: number; ok: boolean; issues: Array<{ level: Tone; message: string; node?: string }> };
  edgeKey(edge: ModelEdge): string;
}

export interface Format {
  /** Liczba z przecinkiem dziesiętnym i znakiem minus U+2212. */
  num(value: number, digits?: number, opts?: { decimal?: ',' | '.'; leadingZero?: boolean }): string;
  /** Wartość p; poniżej 0,001 zwraca „< 0,001”. */
  p(value: number, opts?: { decimal?: ',' | '.'; leadingZero?: boolean }): string;
  stars(p: number): '' | '*' | '**' | '***';
}

/** Górny pasek widoku. */
export interface TopBarProps { crumbs?: React.ReactNode[]; logo?: React.ReactNode; project?: { name: React.ReactNode; meta?: React.ReactNode }; status?: { tone?: 'saved' | 'dirty' | 'error'; text: React.ReactNode }; meta?: React.ReactNode; search?: { placeholder?: string; onOpen?: () => void }; tools?: React.ReactNode; mode?: 'simple' | 'adv' | 'code'; defaultMode?: 'simple' | 'adv' | 'code'; onModeChange?: (mode: 'simple' | 'adv' | 'code') => void; modeSize?: 'sm' | 'md'; modeIcons?: boolean; theme?: 'light' | 'dark'; onThemeToggle?: () => void; extra?: React.ReactNode; actions?: React.ReactNode; sticky?: boolean; className?: string }
export declare function TopBar(props: TopBarProps): React.ReactElement;

/** Powiadomienie z opcjonalnym „Cofnij”. */
export interface ToastProps { message?: React.ReactNode; children?: React.ReactNode; open?: boolean; onClose?: () => void; actionLabel?: string; onAction?: () => void; icon?: IconName; duration?: number; placement?: 'center' | 'start'; contained?: boolean; dismissible?: boolean; tone?: string; className?: string }
export declare function Toast(props: ToastProps): React.ReactElement | null;

/** Okno modalne do potwierdzania kosztownych decyzji. */
export interface DialogProps { open: boolean; onClose?: () => void; title: React.ReactNode; subtitle?: React.ReactNode; icon?: IconName; tone?: 'default' | 'danger'; children?: React.ReactNode; onConfirm?: () => void; confirmLabel?: string; confirmIcon?: IconName; cancelLabel?: string; actions?: React.ReactNode; footNote?: React.ReactNode; width?: number | string; contained?: boolean; className?: string }
export declare function Dialog(props: DialogProps): React.ReactElement | null;

export type MenuItem = { id: string; label: React.ReactNode; icon?: IconName; hint?: React.ReactNode; shortcut?: string; danger?: boolean; disabled?: boolean; checked?: boolean } | { divider: true } | { group: string };
/** Menu rozwijane pod przyciskiem. */
export interface MenuProps { items: MenuItem[]; onSelect?: (id: string, item: MenuItem) => void; label?: React.ReactNode; ariaLabel?: string; icon?: IconName; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md' | 'lg'; align?: 'start' | 'end'; up?: boolean; caret?: boolean; defaultOpen?: boolean; className?: string }
export declare function Menu(props: MenuProps): React.ReactElement;
/** Menu pod prawym przyciskiem. */
export interface ContextMenuProps { x: number; y: number; items: MenuItem[]; onSelect?: (id: string, item: MenuItem) => void; onClose?: () => void; title?: React.ReactNode; open?: boolean }
export declare function ContextMenu(props: ContextMenuProps): React.ReactElement | null;

export interface CheckboxProps { label?: React.ReactNode; hint?: React.ReactNode; checked?: boolean; defaultChecked?: boolean; indeterminate?: boolean; onChange?: (checked: boolean, e: React.ChangeEvent<HTMLInputElement>) => void; disabled?: boolean; ariaLabel?: string; name?: string; value?: string; className?: string }
export declare function Checkbox(props: CheckboxProps): React.ReactElement;
export interface RadioOption { value: string; label: React.ReactNode; hint?: React.ReactNode; badge?: React.ReactNode; disabled?: boolean }
export interface RadioGroupProps { options: RadioOption[]; value?: string; defaultValue?: string; onChange?: (value: string) => void; label?: string; direction?: 'column' | 'row'; name?: string; className?: string }
export declare function RadioGroup(props: RadioGroupProps): React.ReactElement;
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { showCount?: boolean; mono?: boolean }
export declare function Textarea(props: TextareaProps): React.ReactElement;

export interface EmptyStateProps { title: React.ReactNode; icon?: IconName; children?: React.ReactNode; actions?: React.ReactNode; note?: React.ReactNode; size?: 'md' | 'sm'; className?: string }
export declare function EmptyState(props: EmptyStateProps): React.ReactElement;
export interface SkeletonProps { variant?: 'text' | 'stat' | 'table' | 'chart' | 'block' | 'circle'; lines?: number; rows?: number; cols?: number; bars?: number[]; width?: number | string; height?: number | string; label?: string; className?: string }
export declare function Skeleton(props: SkeletonProps): React.ReactElement;

export interface DiagnosisFix { title: React.ReactNode; detail?: React.ReactNode; recommended?: boolean; actionLabel?: string; actionIcon?: IconName; onAction?: () => void; done?: boolean }
/** Błąd lub ostrzeżenie analityczne: co się stało, skutek, co zrobić. */
export interface DiagnosisProps { title: React.ReactNode; level?: 'poor' | 'warn' | 'info'; eyebrow?: React.ReactNode; what?: React.ReactNode; effect?: React.ReactNode; fixes?: DiagnosisFix[]; fixesLabel?: string; children?: React.ReactNode; log?: string; logLabel?: string; logOpen?: boolean; source?: React.ReactNode; aside?: React.ReactNode; compact?: boolean; onCopy?: () => void; className?: string }
export declare function Diagnosis(props: DiagnosisProps): React.ReactElement;

export interface ThresholdValue { est: number; lo?: number; hi?: number }
export interface ThresholdRow { id?: string; label: string; sub?: string; values: Record<string, ThresholdValue> }
export interface ThresholdSeries { key: string; label: string; short?: string; shape?: 'circle' | 'square' | 'diamond'; ci?: boolean }
export interface ThresholdZone { to?: number; level: Tone; label?: string; legend?: string }
/** Oszacowania z przedziałami na tle stref progowych. */
export interface ThresholdPlotProps { rows: ThresholdRow[]; series?: ThresholdSeries[]; zones?: ThresholdZone[]; min?: number; max?: number; tickStep?: number; axisLabel?: string; selected?: string | number; onSelect?: (id: string | number) => void; hovered?: number | null; onHover?: (index: number | null) => void; tooltip?: boolean; legend?: boolean; digits?: number; width?: number; fluid?: boolean; labelWidth?: number; valueWidth?: number; rowHeight?: number; label?: string; decimal?: ',' | '.'; className?: string }
export declare function ThresholdPlot(props: ThresholdPlotProps): React.ReactElement;

/** HTMT, korelacje czynników i √AVE w jednej macierzy. */
export interface ValidityMatrixProps { factors: string[]; ave: number[]; phi: number[][]; htmt: number[][]; htmtCut?: number; htmtNear?: number; decimal?: ',' | '.'; className?: string }
export declare function ValidityMatrix(props: ValidityMatrixProps): React.ReactElement;

export interface InvarianceStep { id: string; label: string; desc?: React.ReactNode; chi2?: number; df?: number; cfi?: number; rmsea?: number; dcfi?: number; drmsea?: number; verdict?: Tone | 'todo'; verdictLabel?: string; note?: React.ReactNode; branch?: boolean }
/** Drabina inwariancji pomiarowej. */
export interface InvarianceLadderProps { steps: InvarianceStep[]; thresholds?: { dcfi: number; drmsea: number }; selected?: string; onSelect?: (id: string) => void; decimal?: ',' | '.'; className?: string }
export declare function InvarianceLadder(props: InvarianceLadderProps): React.ReactElement;

export interface TimelineEffect { label: string; from?: React.ReactNode; to: React.ReactNode; tone?: Tone }
export interface TimelineEntry { id: string; time: string; module?: string; moduleIcon?: IconName; kind?: 'remove' | 'add' | 'change' | 'split' | 'note' | 'run'; origin?: 'proposal' | 'manual' | 'auto'; action: React.ReactNode; reason?: React.ReactNode; effects?: TimelineEffect[]; reverted?: boolean; stale?: boolean }
/** Oś czasu decyzji ze wszystkich modułów. */
export interface DecisionTimelineProps { groups: Array<{ label: React.ReactNode; meta?: React.ReactNode; entries: TimelineEntry[] }>; selected?: string; onSelect?: (id: string) => void; renderActions?: (entry: TimelineEntry) => React.ReactNode; className?: string }
export declare function DecisionTimeline(props: DecisionTimelineProps): React.ReactElement;

/** Szuflada boczna (inspektor na wąskich ekranach). */
export interface DrawerProps { open: boolean; onClose?: () => void; title: React.ReactNode; subtitle?: React.ReactNode; children?: React.ReactNode; footer?: React.ReactNode; width?: number | string; side?: 'right' | 'left'; contained?: boolean; className?: string }
export declare function Drawer(props: DrawerProps): React.ReactElement | null;

export interface PowerPoint { n: number; power: number; lo: number; hi: number }
/** Krzywe mocy z symulacji Monte Carlo. */
export interface PowerCurveProps { series: Array<{ key: string; label: string; points: PowerPoint[] }>; target?: number; currentN?: number; replications?: number; nMin?: number; nMax?: number; step?: number; xLabel?: string; targetLabel?: string; currentLabel?: string; legend?: boolean; width?: number; height?: number; fluid?: boolean; label?: string; decimal?: ',' | '.'; className?: string }
export declare function PowerCurve(props: PowerCurveProps): React.ReactElement;

export interface ConditionalPoint { w: number; est: number; lo: number; hi: number }
/** Efekt warunkowy z obszarem Johnsona–Neymana. */
export interface ConditionalEffectPlotProps { points: ConditionalPoint[]; jn?: number[]; marks?: Array<{ w: number; label: string }>; dist?: Array<{ from: number; to: number; count: number }>; wLabel?: string; wShort?: string; yLabel?: string; effectLabel?: string; effectShort?: string; sigLabel?: string; yMin?: number; yMax?: number; yStep?: number; wStep?: number; digits?: number; legend?: boolean; width?: number; height?: number; fluid?: boolean; label?: string; decimal?: ',' | '.'; className?: string }
export declare function ConditionalEffectPlot(props: ConditionalEffectPlotProps): React.ReactElement;

/** Macierz korelacji (mapa cieplna pod przekątną). */
export interface CorrMatrixProps { vars: string[]; r: number[][]; p?: number[][]; n?: number; groups?: Array<{ label: string; vars: string[] }>; alpha?: number; strong?: number; highlight?: string; hint?: React.ReactNode; decimal?: ',' | '.'; className?: string }
export declare function CorrMatrix(props: CorrMatrixProps): React.ReactElement;

export interface NavItem { id: string; label: string; icon?: IconName; release?: Release; status?: Tone; count?: number; disabled?: boolean }
export interface NavSection { label: string; items: NavItem[] }
/** Kanoniczna lista modułów dla `Sidebar`; `overrides` dodaje stan i liczniki. */
export declare function navSections(overrides?: Record<string, Partial<NavItem>>): NavSection[];

declare global {
  /** Po wczytaniu components/bundle.js cała biblioteka jest dostępna jako window.SEMplex. */
  interface Window { SEMplex: typeof import('./index') }
}

/** Hook: czy zapytanie medialne pasuje (np. '(max-width: 1279px)'); aktualizuje się przy zmianie okna. */
export declare function useMedia(query: string): boolean;
/** Inspektor: na szerokim ekranie zwraca dzieci bez zmian (kolumna), poniżej 1280 px pokazuje je w Drawer. */
export interface InspectorProps { open?: boolean; onClose?: () => void; title: React.ReactNode; subtitle?: React.ReactNode; footer?: React.ReactNode; width?: number | string; narrow?: boolean; query?: string; children?: React.ReactNode; className?: string }
export declare function Inspector(props: InspectorProps): React.ReactElement | null;

/** Mapa ważność–wykonanie (IPMA) z ćwiartką priorytetu. */
export interface IPMAPoint { id: string; label?: string; short?: string; importance: number; performance: number }
export interface IPMAMapProps { points: IPMAPoint[]; xMid?: number; yMid?: number; xMin?: number; xMax?: number; yMin?: number; yMax?: number; xStep?: number; yStep?: number; xLabel?: string; yLabel?: string; quadrants?: { priority: string; keep: string; low: string; over: string }; pointLabel?: string; selected?: string; onSelect?: (id: string, index: number) => void; hovered?: number | null; onHover?: (index: number | null) => void; digits?: number; legend?: boolean; width?: number; height?: number; fluid?: boolean; label?: string; decimal?: ',' | '.'; className?: string }
export declare function IPMAMap(props: IPMAMapProps): React.ReactElement;

/** Analiza warunku koniecznego (NCA): obserwacje, linia sufitu, pusta strefa, wąskie gardło. */
export interface NCAPoint { x: number; y: number; n?: number; jx?: number; jy?: number }
export interface NCAPlotProps { points: NCAPoint[]; ceiling: Array<{ x: number; y: number }>; crLine?: { a: number; b: number }; bottleneck?: { x: number; y: number; label: string }; d?: number; p?: number; xMin?: number; xMax?: number; yMin?: number; yMax?: number; xStep?: number; yStep?: number; xLabel?: string; yLabel?: string; xShort?: string; yShort?: string; emptyLabel?: string; legend?: boolean; width?: number; height?: number; fluid?: boolean; label?: string; decimal?: ',' | '.'; className?: string }
export declare function NCAPlot(props: NCAPlotProps): React.ReactElement;

/** Podział wariancji między poziomy (ICC) dla kilku zmiennych. */
export interface VarianceSplitRow { label: string; sub?: string; parts: Array<{ value: number }> }
export interface VarianceSplitProps { rows: VarianceSplitRow[]; levels?: Array<{ key: string; label: string }>; iccLabel?: string; selected?: string; onSelect?: (label: string) => void; hint?: React.ReactNode; decimal?: ',' | '.'; className?: string }
export declare function VarianceSplit(props: VarianceSplitProps): React.ReactElement;

/** Efekty losowe grup posortowane rosnąco, z przedziałami (wykres „gąsienica”). */
export interface CaterpillarRow { id: string; label?: string; est: number; lo: number; hi: number; n?: number }
export interface CaterpillarPlotProps { rows: CaterpillarRow[]; selected?: string; onSelect?: (id: string) => void; min?: number; max?: number; tickStep?: number; referenceLabel?: string; axisLabel?: string; effectShort?: string; digits?: number; legend?: boolean; width?: number; height?: number; fluid?: boolean; label?: string; decimal?: ',' | '.'; className?: string }
export declare function CaterpillarPlot(props: CaterpillarPlotProps): React.ReactElement;

/** Nachylenia w grupach (linie cienkie) i efekt stały (linia gruba z pasmem CI). */
export interface SlopeLine { id: string; label?: string; a: number; b: number; n?: number }
export interface SlopesPlotProps { lines: SlopeLine[]; fixed?: { a: number; b: number; lo?: { a: number; b: number }; hi?: { a: number; b: number } }; selected?: string; onSelect?: (id: string) => void; xMin?: number; xMax?: number; yMin?: number; yMax?: number; xStep?: number; yStep?: number; xLabel?: string; yLabel?: string; slopeShort?: string; fixedLabel?: string; digits?: number; legend?: boolean; width?: number; height?: number; fluid?: boolean; label?: string; decimal?: ',' | '.'; className?: string }
export declare function SlopesPlot(props: SlopesPlotProps): React.ReactElement;

/** Lista krótkich wartości wpisywanych jak znaczniki (kody braków, słowa kluczowe). Enter, przecinek lub Tab dodaje, Backspace w pustym polu usuwa ostatni. */
export interface TagInputProps { value?: string[]; defaultValue?: string[]; onChange?: (values: string[]) => void; placeholder?: string; morePlaceholder?: string; suggestions?: string[]; emptyLabel?: string; label?: string; id?: string; className?: string }
export declare function TagInput(props: TagInputProps): React.ReactElement;

/** Zadania liczone w tle (bootstrap, Monte Carlo, inwariancja): przycisk w TopBar z postępem i okienko z listą. */
export interface Job { id: string; label: string; module?: string; icon?: IconName; status?: 'running' | 'queued' | 'done' | 'error' | 'cancelled'; progress?: number; eta?: string; detail?: React.ReactNode }
export interface JobTrayProps { jobs: Job[]; open?: boolean; defaultOpen?: boolean; onOpenChange?: (open: boolean) => void; onCancel?: (id: string) => void; onResume?: (id: string) => void; onOpenResult?: (id: string) => void; note?: React.ReactNode; footer?: React.ReactNode; align?: 'start' | 'end'; className?: string }
export declare function JobTray(props: JobTrayProps): React.ReactElement;

/** Formatowanie liczb (przecinek dziesiętny, minus U+2212, „< 0,001”). */
export declare const format: Format;
/** Parser i drukarka składni lavaan oraz kontrola identyfikowalności. */
export declare const lavaan: Lavaan;

/** Cała biblioteka jako jeden obiekt - to samo, co window.SEMplex po wczytaniu bundle.js. */
declare const SEMplex: typeof import('./index');
export default SEMplex;
