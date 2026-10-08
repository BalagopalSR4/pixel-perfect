import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, Download, LockKeyhole, Pencil, Send, Sparkles } from "lucide-react";
import { AppButton, IconInfo, SectionTitle, Status } from "@/components/workspace-ui";
import { useCSSI } from "@/lib/cssi-store";
import { wageFigure, wagesRestricted } from "@/lib/workspace-access";
import type { Engagement, Project } from "@/lib/cssi-seed-data";
import type { Verdict } from "@/lib/qualification";
import {
  awaitingDraftDecision,
  canMarkSectionReviewed,
  draftIncluded,
  draftQualifiedTotal,
  editorIssues,
  editorOutline,
  issuesAfterAccept,
  readEditorScope,
  refusesUnsupportedFigure,
  reviewAnchor,
  workingVerdict,
} from "@/lib/editor-review";

/** Narrative already written for the thermal-control project. It stays collapsed until opened. */
const thermalExcerpt = "The business component under development was an internal manufacturing process intended to hold operating temperature within a narrower band than the existing configuration was able to sustain across the range of conditions encountered on the production floor.";

/** One-sentence agent summary shown on the draft and inside the full report. */
const agentSummary = "Analyzed 3 projects. Selected Project 01 as Eligible, Project 02 as Likely Ineligible, and Project 03 as Needs Review. Generated qualifying narratives, processed the supplied wage PDF, populated the QRE table, and flagged 4 items requiring human review.";

/** Sentence the assistant can propose. It names no figure outside the source. */
const proposedSentence = "Pioneer measured repeated drift cycles and kept the thermal process inside the target band.";

/** Opening suggestion. Accept is the only way it enters the document. */
const openingSuggestion = "The team compared three architectural approaches and used repeated load testing to identify the option that met the target response time.";

/** Document text the reviewer starts from. */
const openingDocument = "During the 2025 tax year, the Company undertook the redesign of its thermal control process with the objective of improving production stability and reducing variation in finished output. The team compared three configurations and measured deviation across a full drift cycle.";

/** Session log the assistant shows before this visit adds a row. */
const sessionSeed = ["Applied, removed unsupported cause", "Applied, added testing sentence", "Refused, efficiency figure"];

/** Wage rows the reviewer can edit. Employee C starts unallocated. */
const reviewWageSeed = [
  { employee: "Employee A", annual: "125000", percent: "34", qre: "42500" },
  { employee: "Employee B", annual: "69500", percent: "40", qre: "27800" },
  { employee: "Employee C", annual: "88000", percent: "25", qre: "" },
];

/** Locked wage snapshot. Employee C shows the amount allocated during review. */
const verifiedWages = [
  ["Employee A", "$125,000", "34%", "$42,500", "Julie"],
  ["Employee B", "$69,500", "40%", "$27,800", "Julie"],
  ["Employee C", "$88,000", "25%", "$22,000", "Julie"],
];

/** Short Pioneer answers for the assistant quick actions. */
const pioneerNotes: Record<string, string[]> = {
  Evidence: ["Pioneer Interview #2 at 00:14:22.", "“We tried three different approaches before settling on.”"],
  Gaps: ["Pioneer thermal case study still has an unfinished outcome.", "Project 03 is missing experimentation detail."],
  Changes: ["Pioneer applied a testing sentence and removed an unsupported cause.", "One efficiency figure was refused."],
  Wages: ["Pioneer Employee A is $42,500 and Employee B is $27,800.", "Only a reviewer can accept a wage figure."],
};

/** Answers that stay available after the report is locked. */
const verifiedNotes: Record<string, string[]> = {
  Explain: ["Pioneer Systems 2024–2025 was locked by Julie on Sep 26.", "The qualified wage total is $92,300."],
  Evidence: ["Pioneer Interview #2 at 00:14:22.", "“We tried three different approaches before settling on.”"],
  "Changes since v4": ["Employee C was allocated during review.", "Julie verified each wage line."],
};

/** Formats a whole-dollar amount for the draft. */
function money(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}

/** Included, excluded, or pending for the full-report contents line. */
function draftStateLabel(project: Project, confirmed?: Verdict): string {
  const verdict = workingVerdict(project.verdict, confirmed);
  if (verdict === "Likely Ineligible") return "excluded";
  if (verdict === "Eligible") return "included";
  return "pending";
}

/** Scroll target for an outline row or an open issue. */
function scrollTarget(label: string): string {
  if (label === "Employee C" || label === "Employee C unmapped") return reviewAnchor("Employee C unmapped");
  if (label === "4-Part Test" || label === "Alternatives not cited") return reviewAnchor("4-Part Test");
  if (label === "Case Study" || label === "Outcome unfinished") return reviewAnchor("Case Study");
  return reviewAnchor(label);
}

/** Moves the matching anchor into view. */
function scrollToLabel(label: string) {
  document.getElementById(scrollTarget(label))?.scrollIntoView({ behavior: "smooth", block: "center" });
}

/** Draft for one engagement. Each included project keeps its own wages and downloads. */
export function DraftScreen({ engagement, go, notify }: { engagement: Engagement; go: (target: string) => void; notify: (message: string) => void }) {
  const { verified, toggleVerified, confirmed, viewAsLee, settings } = useCSSI();
  const restricted = wagesRestricted(engagement.owner, viewAsLee, settings.wageAccess);
  const included = engagement.projects.filter((project) => draftIncluded(project.verdict, confirmed[project.id]?.verdict));
  const lines = included.flatMap((project) => project.lines);
  const verifiedCount = lines.filter((line) => verified[line.employee]).length;
  const qualified = draftQualifiedTotal(engagement.projects.map((project) => {
    const decision = confirmed[project.id]?.verdict;
    return decision ? { agent: project.verdict, confirmed: decision, amount: project.amount } : { agent: project.verdict, amount: project.amount };
  }));
  const awaiting = engagement.projects.filter((project) => awaitingDraftDecision(project.verdict, confirmed[project.id]?.verdict)).length;
  const projectThreeConfirmed = confirmed["calibration"]?.verdict === "Eligible";
  return <div className="space-y-5">
    <section className="surface p-5"><p className="text-sm text-navy">{agentSummary}</p></section>
    {engagement.projects.map((project) => {
      const verdict = workingVerdict(project.verdict, confirmed[project.id]?.verdict);
      const isIncluded = verdict === "Eligible";
      const projectTotal = project.lines.reduce((sum, line) => sum + line.amount, 0);
      return <section className={`surface engagement-card ${verdict === "Needs Review" ? "warning" : verdict === "Likely Ineligible" ? "negative" : ""}`} key={project.id}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2"><span className="rounded-lg bg-secondary px-2 py-1 text-xs font-bold">{project.number}</span><h2 className="text-sm font-bold text-navy">{project.name}</h2><Status value={verdict}/></div>
          <div className="flex gap-2">
            {isIncluded ? <>
              <AppButton variant="secondary" onClick={() => go(`/engagements/${engagement.id}/editor/project/${project.id}`)}><Pencil size={14}/>Edit</AppButton>
              <AppButton variant="ghost" className="text-mint" onClick={() => notify(`Project ${project.number} Word download ready`)}><Download size={14}/>Word</AppButton>
              <AppButton variant="ghost" className="text-mint" onClick={() => notify(`Project ${project.number} PDF download ready`)}><Download size={14}/>PDF</AppButton>
            </> : verdict === "Needs Review" ? <AppButton onClick={() => go(`/engagements/${engagement.id}/qualification/${project.id}/confirm`)}>Resolve</AppButton> : <AppButton variant="ghost" className="text-mint" onClick={() => go(`/engagements/${engagement.id}/qualification/${project.id}`)}>View assessment</AppButton>}
          </div>
        </div>
        {isIncluded && <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div>
            <div className="flex gap-2"><Status value="[DRAFT]"/><span className="text-sm font-semibold text-navy">4-Part Test</span></div>
            {project.id === "thermal" && <details className="mt-3"><summary className="cursor-pointer text-xs font-bold text-mint">Show excerpt</summary><p className="mt-2 text-xs leading-6 text-muted-foreground">{thermalExcerpt}</p></details>}
            <div className="mt-4 flex flex-wrap items-center gap-2"><Status value="[DRAFT]"/><span className="text-sm font-semibold text-navy">Case Study</span><Status value="[REVIEW NEEDED]"/></div>
          </div>
          <div className="rounded-2xl bg-secondary/50 p-4">
            <h3 className="mb-2 text-xs font-bold text-navy">QRE wages</h3>
            {project.lines.map((line) => <label key={line.employee} className="flex items-center gap-2 border-b border-border py-2 text-xs"><input type="checkbox" checked={Boolean(verified[line.employee])} onChange={() => toggleVerified(line.employee)} className="accent-mint" aria-label={`Verify ${line.employee}`}/><span className="text-navy">{line.employee}</span><span className="ml-auto font-semibold text-navy">{wageFigure(money(line.amount), restricted)}</span></label>)}
            <div className="mt-3 flex items-center justify-between text-xs font-bold text-navy"><span className="flex items-center gap-2">Total <IconInfo text="Each line is verified before finalizing."/></span><span>{wageFigure(money(projectTotal), restricted)}</span></div>
          </div>
        </div>}
        {verdict === "Needs Review" && <p className="mt-4 text-xs text-navy">{project.note}</p>}
        {verdict === "Needs Review" && <p className="mt-2 text-xs text-muted-foreground">Employee C · Not allocated</p>}
        {verdict === "Likely Ineligible" && project.lines.map((line) => <p key={line.employee} className="mt-4 text-xs text-muted-foreground">{line.employee} {wageFigure(money(line.amount), restricted)} · Total Excluded</p>)}
      </section>;
    })}
    <section className="surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-navy">Full report</h2>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">Qualified {wageFigure(money(qualified), restricted)}{projectThreeConfirmed && <IconInfo text="Total changed after Project 03 was confirmed."/>}</span>
            <span>Employees {lines.length} of 4</span>
            <span>Wage lines verified {verifiedCount} of {lines.length}</span>
            <span>Awaiting decision {awaiting}</span>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{engagement.projects.map((project) => `${project.number} ${draftStateLabel(project, confirmed[project.id]?.verdict)}`).join(" · ")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AppButton onClick={() => go(`/engagements/${engagement.id}/editor/report`)}><Pencil size={14}/>Edit report</AppButton>
          <IconInfo text="Opens every included project, not just this one."/>
          <AppButton variant="ghost" className="text-mint" onClick={() => notify("Full report Word download ready")}><Download size={14}/>Word</AppButton>
          <AppButton variant="ghost" className="text-mint" onClick={() => notify("Full report PDF download ready")}><Download size={14}/>PDF</AppButton>
        </div>
      </div>
    </section>
  </div>;
}

/** Left outline. The selected row is navy text on white. */
function EditorOutline({ items, active, onSelect, issues, onIssue }: { items: string[]; active: string; onSelect: (item: string) => void; issues: string[]; onIssue: (issue: string) => void }) {
  return <aside className="surface h-fit p-4">
    <nav className="space-y-1 rounded-xl bg-secondary/70 p-1">{items.map((item) => <button type="button" key={item} onClick={() => onSelect(item)} className={`block w-full rounded-lg px-3 py-2 text-left text-xs ${active === item ? "bg-white font-bold text-navy" : "text-muted-foreground"}`}>{item}</button>)}</nav>
    <div className="mt-6 border-t border-border pt-4">
      <h3 className="mb-2 text-xs font-bold text-navy">{issues.length === 0 ? "Issues · 0 open" : `Issues · ${issues.length}`}</h3>
      {issues.map((item) => <button type="button" key={item} onClick={() => onIssue(item)} className="block py-2 text-left text-[10px] text-negative">{item}</button>)}
    </div>
  </aside>;
}

/** Reviewer-owned wage grid. The assistant has no control that writes these figures. */
function ReviewWages({ verified, onToggle, restricted }: { verified: Record<string, boolean>; onToggle: (employee: string) => void; restricted: boolean }) {
  const [rows, setRows] = useState(reviewWageSeed);
  const total = rows.reduce((sum, row) => sum + (Number(row.qre) || 0), 0);
  const update = (employee: string, field: "annual" | "percent" | "qre", value: string) => {
    setRows((current) => current.map((row) => row.employee === employee ? { ...row, [field]: value.replace(/[^0-9]/g, "") } : row));
  };
  return <div id={reviewAnchor("QRE")} className="mt-6">
    <SectionTitle title="QRE wages" info="The agent can propose a figure. Only you can accept it."/>
    <div className="mt-3 overflow-auto">
      <table className="workspace-table min-w-[520px]">
        <thead><tr><th>Employee</th><th>Annual</th><th>Qualified</th><th>QRE</th><th>Verified by</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.employee} id={row.employee === "Employee C" ? reviewAnchor("Employee C unmapped") : reviewAnchor(row.employee)}>
          <td className="font-semibold text-navy">{row.employee}</td>
          <td>{restricted ? "Restricted" : <input aria-label={`${row.employee} annual`} className="workspace-input !min-h-9" value={row.annual} onChange={(event) => update(row.employee, "annual", event.target.value)}/>}</td>
          <td>{restricted ? "Restricted" : <input aria-label={`${row.employee} qualified percent`} className="workspace-input !min-h-9" value={row.percent} onChange={(event) => update(row.employee, "percent", event.target.value)}/>}</td>
          <td>{restricted ? "Restricted" : <input aria-label={`${row.employee} QRE`} className="workspace-input !min-h-9" value={row.qre} placeholder="Not allocated" onChange={(event) => update(row.employee, "qre", event.target.value)}/>}</td>
          <td><label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(verified[row.employee])} onChange={() => onToggle(row.employee)} className="accent-mint" aria-label={`Verify ${row.employee}`}/>Verified</label></td>
        </tr>)}</tbody>
      </table>
      <p className="mt-3 text-right text-xs font-bold text-navy">Total qualified {wageFigure(money(total), restricted)}</p>
    </div>
  </div>;
}

/** Read-only wage table on the verified lock. */
function VerifiedWageTable({ restricted }: { restricted: boolean }) {
  return <div className="mt-3 overflow-auto">
    <table className="workspace-table min-w-[520px]">
      <thead><tr><th>Employee</th><th>Annual</th><th>Qualified</th><th>QRE</th><th>Verified by</th></tr></thead>
      <tbody>{verifiedWages.map(([employee, annual = "", percent = "", amount = "", reviewer]) => <tr key={employee}><td className="font-semibold text-navy">{employee}</td><td>{wageFigure(annual, restricted)}</td><td>{restricted ? "Restricted" : percent}</td><td className="font-semibold text-navy">{wageFigure(amount, restricted)}</td><td>{reviewer}</td></tr>)}</tbody>
    </table>
    <p className="mt-3 flex items-center justify-end gap-2 text-xs font-bold text-navy">Total qualified {wageFigure("$92,300", restricted)} <IconInfo text="Employee C was allocated during review."/></p>
  </div>;
}

/** Locked report. Reopen keeps the typed reason, and version 1 stays downloadable. */
function VerifiedLock({ engagement, content, includedNumbers, go, notify }: { engagement: Engagement; content: string; includedNumbers: string[]; go: (target: string) => void; notify: (message: string) => void }) {
  const store = useCSSI();
  const restricted = wagesRestricted(engagement.owner, store.viewAsLee, store.settings.wageAccess);
  const [active, setActive] = useState("Executive Summary");
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const [chosen, setChosen] = useState<string[]>(() => engagement.projects.filter((project) => project.number === "01").map((project) => project.id));
  const [note, setNote] = useState<string[]>([]);
  const outline = editorOutline("report", "01", [], includedNumbers);
  const toggleProject = (id: string) => setChosen((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  /** Opens the revision for the projects the reviewer chose. Version 1 is not removed. */
  const openRevision = () => {
    if (!reason.trim() || chosen.length === 0) return;
    store.openRevision(reason.trim(), chosen);
    go(`/engagements/${engagement.id}/revision`);
  };
  return <div className="min-h-screen bg-canvas p-4 md:p-5">
    <header className="surface mx-auto mb-4 flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="flex items-center gap-3"><LockKeyhole size={18}/><b className="text-sm text-navy">v5 · Verified · Julie · Sep 26, 10:35 AM</b><IconInfo text="Locked. Reopen to correct it. This version stays available."/></div>
      <div className="flex flex-wrap gap-2">
        <AppButton variant="secondary" onClick={() => go(`/engagements/${engagement.id}/report`)}>View report</AppButton>
        <AppButton onClick={() => notify("Final PDF download ready")}><Download size={15}/>Export PDF</AppButton>
      </div>
    </header>
    <div className="mx-auto grid max-w-[1500px] gap-4 lg:grid-cols-[210px_minmax(0,1fr)_300px]" data-editor-scope="verified">
      <EditorOutline items={outline} active={active} onSelect={setActive} issues={[]} onIssue={() => undefined}/>
      <section className="surface min-h-[720px] p-5 md:p-7">
        <h2 className="mb-6 text-lg font-bold text-navy">{engagement.client} · {engagement.years}</h2>
        <p className="text-sm leading-8 text-navy">{content}</p>
        <h3 className="mt-8 text-sm font-bold text-navy">Wage verification</h3>
        <VerifiedWageTable restricted={restricted}/>
      </section>
      <aside className="surface flex min-h-[720px] flex-col p-5">
        <div className="flex items-center gap-2"><span className="icon-tile !h-8 !w-8 !basis-8"><Sparkles size={15}/></span><div><p className="text-xs font-bold text-navy">Read only</p><p className="text-[10px] text-muted-foreground">{active}</p></div></div>
        <div className="mt-4 grid gap-2">{["Explain", "Evidence", "Changes since v4"].map((item) => <AppButton key={item} variant="secondary" className="!text-[11px]" onClick={() => setNote(verifiedNotes[item] ?? [])}>{item}</AppButton>)}</div>
        {note.length > 0 && <div className="mt-4 space-y-1 rounded-xl bg-secondary/60 p-3">{note.map((line) => <p key={line} className="text-xs leading-5 text-navy">{line}</p>)}</div>}
        <div className="mt-auto pt-5">
          {asking ? <div className="space-y-3">
            <label className="block text-xs font-semibold text-navy">Reason<textarea className="workspace-input workspace-textarea mt-2" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason for reopening"/></label>
            <fieldset className="space-y-2"><legend className="text-xs font-semibold text-navy">Projects</legend>{engagement.projects.map((project) => <label key={project.id} className="flex items-center gap-2 text-xs text-navy"><input type="checkbox" className="accent-mint" checked={chosen.includes(project.id)} onChange={() => toggleProject(project.id)}/>Project {project.number}</label>)}</fieldset>
            <div className="flex flex-wrap gap-2">
              <AppButton disabled={!reason.trim() || chosen.length === 0} onClick={openRevision}>Open revision</AppButton>
              <AppButton variant="secondary" onClick={() => notify("Version 5 PDF download ready")}>Download v5</AppButton>
            </div>
          </div> : <button type="button" onClick={() => setAsking(true)} className="text-xs font-bold text-mint">Reopen</button>}
        </div>
      </aside>
    </div>
  </div>;
}

/** In-review editor. Project scope and full-report scope keep separate outlines. */
export function EditorScreen({ path, engagement, locked, go, notify }: { path: string; engagement: Engagement; locked: boolean; go: (target: string) => void; notify: (message: string) => void }) {
  const store = useCSSI();
  const restricted = wagesRestricted(engagement.owner, store.viewAsLee, store.settings.wageAccess);
  const { scope, projectId } = readEditorScope(path, typeof window === "undefined" ? "" : window.location.search);
  const activeProject = engagement.projects.find((project) => project.id === projectId) ?? engagement.projects.find((project) => project.number === "01") ?? engagement.projects[0];
  const included = engagement.projects.filter((project) => draftIncluded(project.verdict, store.confirmed[project.id]?.verdict));
  const includedNumbers = included.map((project) => project.number);
  const outline = editorOutline(scope, activeProject?.number ?? "01", (activeProject?.lines ?? []).map((line) => line.employee), includedNumbers);
  const [mode, setMode] = useState("Edit");
  const [content, setContent] = useState(openingDocument);
  const [assistantInput, setAssistantInput] = useState("");
  const [suggestion, setSuggestion] = useState(openingSuggestion);
  const [showSuggestion, setShowSuggestion] = useState(true);
  const [editingSuggestion, setEditingSuggestion] = useState(false);
  const [reply, setReply] = useState<{ kind: "refused" } | { kind: "proposal"; text: string } | null>(null);
  const [activeSection, setActiveSection] = useState(outline[0] ?? "Executive Summary");
  const [saveTime, setSaveTime] = useState("10:42 AM");
  const [issues, setIssues] = useState<string[]>([...editorIssues]);
  const [reviewed, setReviewed] = useState<Record<string, boolean>>({});
  const [ticks, setTicks] = useState([false, false, false]);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [files, setFiles] = useState<string[]>([]);
  const [sessions, setSessions] = useState(sessionSeed);
  const [note, setNote] = useState<string[]>([]);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  useEffect(() => {
    setActiveSection(scope === "project" ? `Project ${activeProject?.number ?? "01"}` : "Executive Summary");
  }, [scope, projectId, activeProject?.number]);

  /** Stores the previous document so Undo can restore it. */
  const remember = (next: string) => {
    undoStack.current.push(content);
    redoStack.current = [];
    setContent(next);
  };
  /** Restores the document from before the last accepted or formatted change. */
  const undo = () => {
    const previous = undoStack.current.pop();
    if (previous === undefined) {
      notify("Nothing to undo");
      return;
    }
    redoStack.current.push(content);
    setContent(previous);
  };
  /** Reapplies a change that Undo removed. */
  const redo = () => {
    const next = redoStack.current.pop();
    if (next === undefined) {
      notify("Nothing to redo");
      return;
    }
    undoStack.current.push(content);
    setContent(next);
  };
  /** Inserts accepted wording and closes one open issue. */
  const acceptText = (text: string) => {
    remember(`${content.trim()} ${text}`.trim());
    setIssues((current) => issuesAfterAccept(current));
    setSessions((current) => [...current, "Applied, accepted revision"]);
    store.appendTraceRow(engagement.id, { step: "20", tool: "editor", input: activeSection, reasoning: "Accept a supported edit", result: "Accepted" });
  };
  /** Wraps the current selection. Preview leaves the document unchanged. */
  const wrapSelection = (before: string, after = before) => {
    const node = textRef.current;
    if (!node || mode !== "Edit") return;
    const start = node.selectionStart ?? content.length;
    const end = node.selectionEnd ?? start;
    const selected = content.slice(start, end) || "text";
    remember(`${content.slice(0, start)}${before}${selected}${after}${content.slice(end)}`);
  };
  /** Prefixes the current line with a list marker. */
  const insertList = () => {
    const node = textRef.current;
    if (!node || mode !== "Edit") return;
    const start = node.selectionStart ?? content.length;
    const lineStart = content.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    remember(`${content.slice(0, lineStart)}• ${content.slice(lineStart)}`);
  };
  /** Adds the chosen file name. The assistant does not read the file. */
  const addFile = (file: File | undefined) => {
    if (!file) return;
    setFiles((current) => [...current, file.name]);
  };
  /** Sends the composer. An unsupported figure is refused and is not inserted. */
  const ask = () => {
    const text = assistantInput.trim();
    if (!text) return;
    if (refusesUnsupportedFigure(text)) {
      setReply({ kind: "refused" });
      setSessions((current) => [...current, "Refused, efficiency figure"]);
      store.appendTraceRow(engagement.id, { step: "20", tool: "editor", input: activeSection, reasoning: "Refuse a figure that is not in the source", result: "REFUSED" });
    } else {
      setReply({ kind: "proposal", text: proposedSentence });
    }
    setAssistantInput("");
  };
  const selectSection = (item: string) => {
    setActiveSection(item);
    scrollToLabel(item);
  };
  const sectionReady = canMarkSectionReviewed(activeSection, issues);
  const reviewReady = ticks.every(Boolean);
  /** Locks the first review, or publishes v2 and returns to the final report. */
  const finishReview = () => {
    if (!reviewReady) return;
    if (store.revision.active) {
      store.finalizeRevision();
      go(`/engagements/${engagement.id}/report`);
      return;
    }
    store.setLocked(true);
    store.setFinalized(true);
    go(`/engagements/${engagement.id}/verified`);
  };
  if (locked) return <VerifiedLock engagement={engagement} content={content} includedNumbers={includedNumbers} go={go} notify={notify}/>;
  return <div className="min-h-screen bg-canvas p-4 md:p-5">
    <header className="surface mx-auto mb-4 flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => go(store.revision.active ? `/engagements/${engagement.id}/revision` : `/engagements/${engagement.id}/draft`)} className="rounded-full px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary">{store.revision.active ? "‹ Revision" : "‹ Draft"}</button>
        <h1 className="text-sm font-bold text-navy">{scope === "project" ? `Project ${activeProject?.number ?? "01"}` : "Full report"}</h1>
        <span className="text-xs text-muted-foreground">v4 · In review · {saveTime}</span>
      </div>
      <AppButton onClick={() => { setSaveTime("Saved"); notify("Saved"); }}><Check size={15}/>Save</AppButton>
    </header>
    <div className="mx-auto grid max-w-[1500px] gap-4 lg:grid-cols-[210px_minmax(0,1fr)_300px]" data-editor-scope={scope}>
      <EditorOutline items={outline} active={activeSection} onSelect={selectSection} issues={issues} onIssue={(issue) => { setActiveSection(issue === "Employee C unmapped" ? "Employee C" : issue === "Alternatives not cited" ? "4-Part Test" : "Case Study"); scrollToLabel(issue); }}/>
      <section className="surface min-h-[720px] p-5 md:p-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 id={reviewAnchor(scope === "project" ? `Project ${activeProject?.number ?? "01"}` : "Executive Summary")} className="text-lg font-bold text-navy">{engagement.client} · {engagement.years}</h2>
          <span className="flex items-center gap-2 text-xs text-mint"><span className="h-2 w-2 rounded-full bg-mint" aria-hidden="true"/>Autosave</span>
        </div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-navy">{activeSection}</p>
          <button type="button" disabled={!sectionReady} title={sectionReady ? "Mark this section reviewed" : "Resolve the open issue first"} onClick={() => setReviewed((current) => ({ ...current, [activeSection]: true }))} className="text-xs font-bold text-navy disabled:cursor-not-allowed disabled:text-muted-foreground">{reviewed[activeSection] ? "Reviewed" : "Mark reviewed"}</button>
        </div>
        <div className="mb-5 flex flex-wrap items-center gap-1 border-b border-border pb-3">
          <div className="mr-4 flex rounded-full bg-secondary p-1">{["Edit", "Preview"].map((item) => <button key={item} type="button" onClick={() => setMode(item)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${mode === item ? "bg-navy text-white" : "text-muted-foreground"}`}>{item}</button>)}</div>
          {[["Bold", "B", () => wrapSelection("**")], ["Italic", "I", () => wrapSelection("*")], ["List", "•", insertList], ["Undo", "↶", undo], ["Redo", "↷", redo]].map(([label, glyph, action]) => <button key={String(label)} type="button" aria-label={String(label)} title={String(label)} className="h-8 w-8 rounded-lg text-xs font-bold text-muted-foreground hover:bg-secondary" onClick={action as () => void}>{glyph as string}</button>)}
        </div>
        {scope === "report" && included.map((project) => <h3 key={project.id} id={reviewAnchor(`Project ${project.number}`)} className="mb-3 text-sm font-bold text-navy">Project {project.number} · {project.name}</h3>)}
        <div id={reviewAnchor("4-Part Test")}>
          {scope === "project" && <h3 className="mb-3 text-sm font-bold text-navy">4-Part Test</h3>}
          {mode === "Edit" ? <textarea id="draft-editor-text" ref={textRef} className="workspace-input workspace-textarea min-h-[260px] bg-transparent text-sm leading-8" value={content} onChange={(event) => setContent(event.target.value)}/> : <p className="min-h-[260px] text-sm leading-8 text-navy">{content}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-secondary/60 p-3 text-xs text-navy">
            <button type="button" onClick={() => setQuoteOpen((open) => !open)} className="rounded-full bg-card px-3 py-1.5 text-[10px] font-semibold text-mint shadow-sm">Source</button>
            {quoteOpen && <span>“We tried three different approaches before settling on.” · 00:14:22</span>}
          </div>
        </div>
        <div id={reviewAnchor("Case Study")} className="mt-5 rounded-xl border border-warning/40 bg-warning/10 p-4">
          <span className="flex flex-wrap items-center gap-2 text-xs font-bold text-navy">[REVIEW NEEDED]
            <button type="button" onClick={() => { setQuoteOpen(true); setNote(pioneerNotes["Evidence"] ?? []); }} className="font-semibold text-mint">Evidence</button>
            <button type="button" onClick={() => document.getElementById("editor-ask")?.focus()} className="font-semibold text-mint">Ask</button>
            <button type="button" onClick={() => fileRef.current?.click()} className="font-semibold text-mint">Upload</button>
          </span>
          <p className="mt-2 text-xs text-muted-foreground">Outcome unfinished</p>
        </div>
        {scope === "report" && <div id={reviewAnchor("Agent Summary")} className="mt-6"><h3 className="text-sm font-bold text-navy">Agent Summary</h3><p className="mt-2 text-xs leading-6 text-muted-foreground">{agentSummary}</p></div>}
        <ReviewWages verified={store.verified} onToggle={store.toggleVerified} restricted={restricted}/>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <div className="flex flex-wrap items-center gap-3">
            {["Wages", "Selection", "Flags"].map((label, index) => <button type="button" key={label} aria-pressed={ticks[index]} onClick={() => setTicks((current) => current.map((value, position) => position === index ? !value : value))} className="flex items-center gap-1.5 text-xs text-navy"><span className={`grid h-4 w-4 place-items-center rounded-full ${ticks[index] ? "bg-mint text-card" : "bg-secondary text-muted-foreground"}`}>{ticks[index] && <Check size={11}/>}</span>{label}</button>)}
            <IconInfo text="All three are required before the report can be locked."/>
          </div>
          <AppButton disabled={!reviewReady} onClick={finishReview}>{store.revision.active ? "Finalize again" : "Mark review complete"}</AppButton>
        </div>
      </section>
      <aside className="surface flex min-h-[720px] flex-col p-5">
        <div className="flex items-center gap-2"><span className="icon-tile !h-8 !w-8 !basis-8"><Sparkles size={15}/></span><div><p className="text-xs font-bold text-navy">CSSI Agent</p><p className="text-[10px] text-muted-foreground">{activeSection}</p></div></div>
        <div className="mt-6 rounded-2xl bg-secondary/60 p-3">
          <span className="text-[10px] font-bold text-mint">Suggested revision</span>
          {showSuggestion ? editingSuggestion ? <textarea className="workspace-input workspace-textarea mt-2" value={suggestion} onChange={(event) => setSuggestion(event.target.value)} aria-label="Suggested revision"/> : <p className="mt-2 text-xs leading-5 text-navy">{suggestion}</p> : <p className="mt-2 text-xs text-muted-foreground">No pending suggestion.</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <AppButton disabled={!showSuggestion} onClick={() => { acceptText(suggestion); setShowSuggestion(false); setEditingSuggestion(false); }}>Accept</AppButton>
            <AppButton disabled={!showSuggestion} variant="secondary" onClick={() => { setShowSuggestion(false); setEditingSuggestion(false); }}>Reject</AppButton>
            <AppButton disabled={!showSuggestion} variant="ghost" onClick={() => setEditingSuggestion(true)}>Modify</AppButton>
          </div>
          <div className="mt-2 flex justify-end"><IconInfo text="Interview #2 · 00:14:22, 00:18:51."/></div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">{["Evidence", "Gaps", "Changes", "Wages"].map((item) => <AppButton key={item} variant="secondary" className="!text-[11px]" onClick={() => setNote((pioneerNotes[item] ?? []).map((line) => restricted && item === "Wages" && line.includes("$") ? "Restricted" : line))}>{item}</AppButton>)}</div>
        {note.length > 0 && <div className="mt-4 space-y-1">{note.map((line) => <p key={line} className="text-xs leading-5 text-navy">{line}</p>)}</div>}
        <div className="mt-4 space-y-2">{sessions.map((item, index) => <div key={`${item}-${index}`} className="rounded-lg bg-secondary/50 px-3 py-2 text-[10px] text-muted-foreground">{item}</div>)}</div>
        {files.length > 0 && <div className="mt-3 space-y-1">{files.map((name, index) => <p key={`${name}-${index}`} className="text-[10px] font-semibold text-navy">{name}</p>)}</div>}
        <div className="mt-3 flex gap-3">
          <button type="button" className="text-[10px] font-bold text-mint" onClick={undo}>Undo</button>
          <button type="button" className="text-[10px] font-bold text-mint" onClick={() => go(`/engagements/${engagement.id}/trace`)}>Trace</button>
          <button type="button" className="text-[10px] font-bold text-mint" onClick={() => fileRef.current?.click()}>Add file</button>
          <input ref={fileRef} type="file" className="hidden" aria-label="Add file" onChange={(event) => { addFile(event.target.files?.[0]); event.target.value = ""; }}/>
        </div>
        <div className="mt-auto pt-5">
          {reply?.kind === "refused" && <div className="mb-3 rounded-xl border border-negative/30 bg-negative/5 p-3"><p className="text-xs font-bold text-negative">REFUSED</p><p className="mt-1 flex items-center gap-2 text-xs text-navy">That figure is not in the source. <IconInfo text="Enter it yourself and it is stored as human-added."/></p></div>}
          {reply?.kind === "proposal" && <div className="mb-3 rounded-xl bg-secondary/60 p-3"><p className="text-xs leading-5 text-navy">{reply.text}</p><div className="mt-3 flex gap-2"><AppButton onClick={() => { acceptText(reply.text); setReply(null); }}>Accept</AppButton><AppButton variant="secondary" onClick={() => setReply(null)}>Reject</AppButton></div></div>}
          <textarea id="editor-ask" className="workspace-input workspace-textarea !min-h-[86px]" value={assistantInput} onChange={(event) => setAssistantInput(event.target.value)} placeholder="Ask about this section"/>
          <div className="mt-2 flex justify-end"><AppButton onClick={ask}><Send size={14}/>Ask</AppButton></div>
        </div>
      </aside>
    </div>
  </div>;
}

/** Verified route. The document, wages, and assistant actions stay read-only. */
export function VerifiedScreen({ engagement, go, notify }: { engagement: Engagement; go: (target: string) => void; notify: (message: string) => void }) {
  return <EditorScreen path={`/engagements/${engagement.id}/verified`} engagement={engagement} locked go={go} notify={notify}/>;
}
