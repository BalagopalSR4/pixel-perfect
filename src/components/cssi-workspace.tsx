import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Activity, AlertCircle, AlertTriangle, ArrowRight, BarChart3, Bell, CalendarDays,
  CalendarPlus, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
  ClipboardCheck, Clock3, Download, FileCheck, FileText, FileUp, GitBranch, Grid2X2,
  LayoutDashboard, Link2, List, LogOut, Menu, MessageSquareText, Pencil,
  Play, Plus, RefreshCw, Search, Settings2, ShieldCheck, SlidersHorizontal,
  Upload, UserRound, Wallet, X, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DraftScreen, EditorScreen, VerifiedScreen } from "@/components/draft-review";
import { AppButton, IconInfo, SectionTitle, Status } from "@/components/workspace-ui";
import { useCSSI } from "@/lib/cssi-store";
import { engagements as seededEngagements, pioneerFollowUps, recentActivity, type Engagement, type FollowUp, type Project } from "@/lib/cssi-seed-data";
import { excludedWageLabel, finalReportAttribution, finalReportFigures, finalReportFileName, projectIncluded, revisionCardState } from "@/lib/final-report";
import { calculateVerdict, criterionMark, draftExists, narrativeReady, overviewActions, projectWageLabel, type CriterionStatus, type Verdict } from "@/lib/qualification";
import { advanceCapture, captureAdvanceLabel, captureBadge, captureLog, captureLogStatus, capturePipeline, captureStepMark, scheduleMissing, scheduledWhen, type CapturePhase } from "@/lib/meeting-capture";
import { activityState, currentActivity, generatedWith, runActivities, runStatusLabel, runTitle, stepCount, visibleTraceRows } from "@/lib/run-trace";
import { connectorSummary, wageFigure, wagesRestricted } from "@/lib/workspace-access";
import type { Interview } from "@/lib/cssi-seed-data";

const navItems = [
  { label: "Dashboard", icon: Grid2X2, path: "/dashboard" },
  { label: "Engagements", icon: List, path: "/engagements" },
  { label: "Interviews", icon: CalendarDays, path: "/interviews" },
  { label: "Admin", icon: SlidersHorizontal, path: "/admin" },
];
const tabs = [
  { label: "Overview", icon: LayoutDashboard, suffix: "" },
  { label: "Qualification", icon: CheckCircle2, suffix: "/qualification" },
  { label: "Run", icon: Activity, suffix: "/run" },
  { label: "Draft", icon: Pencil, suffix: "/draft" },
  { label: "Report", icon: FileCheck, suffix: "/report" },
];
function fmtDate() { return "Sep 28, 2026"; }

const sidebarCollapseKey = "cssi-sidebar-collapsed";

/** Reads whether the sidebar was collapsed earlier in this browser session. */
function readSidebarCollapsed() {
  try {
    return window.sessionStorage.getItem(sidebarCollapseKey) === "1";
  } catch {
    return false;
  }
}

/** Remembers the sidebar collapse choice until the browser session ends. */
function writeSidebarCollapsed(collapsed: boolean) {
  try {
    window.sessionStorage.setItem(sidebarCollapseKey, collapsed ? "1" : "0");
  } catch {
    /* Session storage can be blocked; the choice still applies until reload. */
  }
}

/** Renders the CSSI wordmark, and the mark alone when the sidebar is narrow. */
function BrandMark({ compact = false }: { compact?: boolean }) {
  return <>
    <img src="/logo-icon.png" alt="CSSI" className="sidebar-brand-icon h-8 w-auto shrink-0" />
    <img src="/logo.png" alt="CSSI" className={`sidebar-brand-wordmark h-8 w-auto shrink-0 ${compact ? "hidden" : ""}`} />
  </>;
}

const engagementStatusKey = "cssi-engagement-status";

/** Remembers the status chosen from the dashboard legend until the engagements list opens. */
function rememberEngagementStatus(status: string) {
  try {
    window.sessionStorage.setItem(engagementStatusKey, status);
  } catch {
    /* The list stays unfiltered when storage is blocked. */
  }
}

/** Reads and clears the one-time engagements status filter from the dashboard legend. */
function takeEngagementStatus() {
  try {
    const status = window.sessionStorage.getItem(engagementStatusKey);
    if (status) window.sessionStorage.removeItem(engagementStatusKey);
    return status;
  } catch {
    return null;
  }
}

const failedCaptureKey = "cssi-failed-capture-client";

/** Remembers the client from a failed capture until the new-engagement form opens. */
function rememberFailedCapture(client: string) {
  try {
    window.sessionStorage.setItem(failedCaptureKey, client);
  } catch {
    /* The form opens blank when storage is blocked. */
  }
}

/** Reads and clears the failed-capture client so a later new engagement stays blank. */
function takeFailedCaptureClient() {
  try {
    const client = window.sessionStorage.getItem(failedCaptureKey);
    if (client) window.sessionStorage.removeItem(failedCaptureKey);
    return client;
  } catch {
    return null;
  }
}

/** Search filters the engagement list, so it stays on the dashboard and that list. */
function showsEngagementSearch(path: string) {
  return path === "/dashboard" || path === "/engagements";
}

/** True for an open engagement record. List, create, editor, and the verified lock stay out. */
function showsEngagementChrome(path: string) {
  if (path === "/engagements/new" || path.includes("/editor") || path.includes("/verified")) return false;
  return /^\/engagements\/[^/]+/.test(path);
}

/** Marks the engagement tab that owns this path, including a nested project screen. */
function isEngagementTabActive(suffix: string, tabSuffix: string) {
  if (!tabSuffix) return suffix === "" || suffix === "/";
  return suffix === tabSuffix || suffix.startsWith(`${tabSuffix}/`);
}

/** Names the current engagement screen for the breadcrumb. */
function engagementPlace(suffix: string, engagement: Engagement) {
  const projectId = suffix.match(/^\/qualification\/([^/]+)/)?.[1];
  if (projectId) return engagement.projects.find((project) => project.id === projectId)?.name ?? "Qualification";
  if (suffix.startsWith("/qualification")) return "Qualification";
  if (suffix.startsWith("/trace")) return "Trace";
  if (suffix.startsWith("/run")) return "Run";
  if (suffix.startsWith("/draft")) return "Draft";
  if (suffix.startsWith("/report")) return "Report";
  if (suffix.startsWith("/revision")) return "Revision";
  return "Overview";
}

/** Four-square Microsoft mark shown on the sign-in button. */
function MicrosoftMark() {
  return <svg viewBox="0 0 21 21" aria-hidden="true" className="h-3.5 w-3.5">
    <rect x="1" y="1" width="9" height="9" fill="#f25022" />
    <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
    <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
    <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
  </svg>;
}

/** Sign-in card. Stays on `/` with no sidebar and no workspace records. */
export function SignIn() {
  const { setSignedIn } = useCSSI();
  const [authError, setAuthError] = useState(false);
  const navigate = useNavigate();
  const enter = () => { setAuthError(false); setSignedIn(true); void navigate({ to: "/$", params: { _splat: "dashboard" } }); };
  return <main className="min-h-screen grid place-items-center p-6">
    <div className="login-stack">
    <img src="/logo.png" alt="CSSI" className="login-logo" />
    <section className="login-panel surface">
      <div className="login-brand">
        <h1 className="relative z-10 max-w-[290px] text-3xl font-bold leading-tight">R&amp;D tax credit workspace.</h1>
        <span className="relative z-10 text-xs font-medium text-white/75">Internal use only</span>
      </div>
      <div className="login-form">
        <div className="w-full max-w-[340px]">
          <div className="mb-6 text-center">
            <p className="text-sm font-semibold text-mint">Welcome back</p>
            <h2 className="mt-2 text-3xl font-bold text-navy">Sign in</h2>
          </div>
          {authError ? <p className="flex items-center justify-center gap-2 text-sm text-negative">Sign-in could not be completed. <IconInfo text="Contact the CSSI workspace administrator." /></p> : <div className="flex items-center gap-3">
            <AppButton onClick={enter} className="h-12 flex-1"><span className="grid h-5 w-5 place-items-center rounded-sm"><MicrosoftMark /></span>Continue with Microsoft</AppButton>
            <IconInfo text="Uses your CSSI Microsoft account. Only your tenant can sign in." />
          </div>}
          <AppButton variant="link" className="mx-auto mt-5 flex text-xs font-medium text-muted-foreground" onClick={() => setAuthError((current) => !current)}>Show authentication error</AppButton>
        </div>
      </div>
    </section>
    </div>
  </main>;
}

/** Signed-in application shell. Sign-in stays on `/` and does not use this frame. */
export function Workspace() {
  const path = useRouterState({ select: (router) => router.location.pathname });
  const store = useCSSI();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  useEffect(() => { setCollapsed(readSidebarCollapsed()); }, []);
  const toggleCollapsed = () => setCollapsed((current) => {
    const next = !current;
    writeSidebarCollapsed(next);
    return next;
  });
  const go = (target: string) => {
    const statusTarget = target.match(/^\/engagements\?status=([^&]+)$/);
    if (statusTarget?.[1]) {
      rememberEngagementStatus(decodeURIComponent(statusTarget[1]));
      void navigate({ to: "/$", params: { _splat: "engagements" } });
      return;
    }
    const [pathname = "", query = ""] = target.split("?");
    let clean = pathname.replace(/^\/+|\/+$/g, "");
    const editorScope = new URLSearchParams(query).get("scope");
    const editorProject = new URLSearchParams(query).get("project");
    if (clean.includes("/editor") && editorScope) {
      clean = clean.replace(/\/editor(?:\/.*)?$/, "/editor");
      clean = editorScope === "project" && editorProject ? `${clean}/project/${editorProject}` : `${clean}/report`;
    }
    if (!clean) void navigate({ to: "/" });
    else void navigate({ to: "/$", params: { _splat: clean } });
  };
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2600); };
  const url = (to: string) => ({ to: "/$" as const, params: { _splat: to.replace(/^\/+/, "") } });
  if (path === "/") return <SignIn />;

  const isDashboard = path === "/dashboard";
  const engagementId = path.match(/^\/engagements\/([^/]+)/)?.[1];
  const engagement = engagementId && engagementId !== "new" ? store.getEngagement(engagementId) : undefined;
  const runPage = /^\/engagements\/[^/]+\/run\/?$/.test(path);
  const tracePage = /^\/engagements\/[^/]+\/trace\/?$/.test(path);
  const draftPage = /^\/engagements\/[^/]+\/draft\/?$/.test(path);
  const revisionPage = /^\/engagements\/[^/]+\/revision\/?$/.test(path);
  const title = runPage && engagement ? runTitle(store.runFor(engagement.id)) : getPageTitle(path, store.getEngagement);
  const detailProjectId = path.match(/^\/engagements\/[^/]+\/qualification\/([^/]+)$/)?.[1];
  const detailProject = detailProjectId ? engagement?.projects.find((project) => project.id === detailProjectId) : undefined;
  const detailVerdict = detailProject ? (store.confirmed[detailProject.id]?.verdict ?? calculateVerdict(detailProject.criteria.map((criterion) => criterion.status))) : undefined;
  const checkpointPage = /^\/engagements\/[^/]+\/qualification\/?$/.test(path);
  const focusMode = path.includes("/editor") || path.includes("/verified");
  const filtered = store.records.filter((record) => record.client.toLowerCase().includes(search.toLowerCase()));

  if (focusMode) return <div className="min-h-screen">
    <EditorScreen path={path} engagement={engagement ?? store.getEngagement("pioneer")} locked={path.includes("/verified")} go={go} notify={notify} />
    {toast && <div role="status" className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-card shadow-lg"><Check size={16} />{toast}</div>}
  </div>;

  return <div className={`app-frame ${isDashboard ? "with-rail" : ""} ${collapsed ? "sidebar-collapsed" : ""}`}>
    <aside className="sidebar">
      <div className={`sidebar-brand flex items-center gap-3 px-5 py-6 ${collapsed ? "justify-center px-2" : ""}`}>
        <BrandMark compact={collapsed} />
        <Button variant="ghost" size="icon" aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} className="ml-auto h-8 w-8 text-muted-foreground" onClick={toggleCollapsed}><Menu size={17} /></Button>
      </div>
      <TooltipProvider delayDuration={200}>
        <nav className={`flex flex-1 flex-col gap-1 px-4 pt-4 ${collapsed ? "items-center px-2" : ""}`}>
          {navItems.map(({ label, icon: Icon, path: target }) => {
            const active = label === "Dashboard" ? path === target : path.startsWith(target);
            return <Tooltip key={label}>
              <TooltipTrigger asChild>
                <Link to={url(target).to} params={url(target).params} data-active={active} aria-label={label} title={collapsed ? undefined : label} className={`nav-link ${collapsed ? "!w-12 !justify-center !px-0" : ""}`}><Icon size={18} strokeWidth={1.9} />{!collapsed && <span className="sidebar-nav-label">{label}</span>}</Link>
              </TooltipTrigger>
              {collapsed && <TooltipContent side="right" className="bg-navy text-white">{label}</TooltipContent>}
            </Tooltip>;
          })}
        </nav>
      </TooltipProvider>
      <button type="button" className={`sidebar-footer mx-3 mb-4 mt-auto flex items-center gap-3 rounded-xl px-3 py-4 text-left hover:bg-secondary ${collapsed ? "justify-center px-0" : ""}`} onClick={() => { store.setSignedIn(false); go("/"); }} title="Sign out">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-mint text-xs font-bold text-mint-foreground">JS</span>
        {!collapsed && <span className="sidebar-footer-text min-w-0 flex-1"><span className="block text-[11px] text-muted-foreground">Welcome,</span><span className="block truncate text-xs font-semibold text-navy">J. Smith</span></span>}
        {!collapsed && <ChevronDown size={15} className="text-muted-foreground" />}
      </button>
    </aside>

    <main className="app-main min-w-0">
      <div className="content-width">
        <header className="app-header">
          <h1 className="app-header-title flex min-w-0 items-center gap-2 text-[26px] font-bold leading-tight text-navy"><span className="truncate">{title}</span>{detailVerdict && <Status value={detailVerdict} />}{detailVerdict && <IconInfo below text="All four met = Eligible. Any not met = Likely Ineligible. A gap = Needs Review." />}{checkpointPage && <IconInfo below text="Confirm each project before a draft is written." />}{path === "/engagements/new" && <IconInfo below text="Use this when capture failed or there is no recording." />}{path === "/interviews" && <IconInfo below text="Meetings from your calendar. Schedule one, or attach one already booked." />}{path.startsWith("/interviews/schedule") && <IconInfo below text="Creates the Zoom meeting and links the engagement now." />}{tracePage && <IconInfo below text="Each step, tool, and refusal is kept for audit." />}{draftPage && <IconInfo below text="[DRAFT] is generated. [REVIEW NEEDED] still needs a person. Not client-ready." />}{revisionPage && <IconInfo below text="v1 stays available until v2 is finalized." />}</h1>
          {showsEngagementSearch(path) && <div className="search-pill"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search engagements" aria-label="Search engagements" /><Search size={17} /></div>}
          {isDashboard && <div className="header-end dashboard-header-end"><ProfileChip /></div>}
        </header>
        {showsEngagementChrome(path) && engagement && <EngagementNav engagement={engagement} path={path} go={go} />}
        {renderScreen({ path, search, records: filtered, engagement, go, notify })}
      </div>
    </main>

    {isDashboard && <DashboardRail go={go} notify={notify} />}
    {toast && <div role="status" className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-card shadow-lg"><Check size={16} />{toast}</div>}
  </div>;
}

/** Signed-in profile shown in the header when the page has no right rail. */
function ProfileChip() {
  return <div className="flex items-center gap-2 rounded-full bg-card px-2 py-1.5"><span className="h-2.5 w-2.5 rounded-full bg-mint"/><span className="text-xs font-semibold text-navy">J. Smith</span><span className="grid h-8 w-8 place-items-center rounded-full bg-mint text-[10px] font-bold text-mint-foreground">JS</span></div>;
}

/** Record tabs and breadcrumb for an open engagement. */
function EngagementNav({ engagement, path, go }: { engagement: Engagement; path: string; go: (target: string) => void }) {
  const base = `/engagements/${engagement.id}`;
  const suffix = path.startsWith(base) ? path.slice(base.length) : "";
  const place = engagementPlace(suffix, engagement);
  return <div className="mb-6">
    <div className="flex flex-wrap gap-2 border-b border-border">
      {tabs.map(({ label, icon: Icon, suffix: tabSuffix }) => {
        const active = isEngagementTabActive(suffix, tabSuffix);
        return <button type="button" className={`engagement-tab ${active ? "active" : ""}`} key={label} onClick={() => go(`${base}${tabSuffix}`)}><Icon size={16} />{label}</button>;
      })}
    </div>
    <nav aria-label="Breadcrumb" className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground"><button type="button" className="hover:text-navy" onClick={() => go("/engagements")}>Engagements</button><ChevronRight size={13}/><button type="button" className="hover:text-navy" onClick={() => go(base)}>{engagement.client}</button><ChevronRight size={13}/><span>{place}</span></nav>
  </div>;
}

function getPageTitle(path: string, getEngagement: (id: string) => Engagement): string {
  if (path === "/dashboard") return "Overview";
  if (path === "/engagements") return "Engagements";
  if (path === "/engagements/new") return "New engagement";
  if (path.startsWith("/interviews/schedule")) return "Schedule";
  if (path.startsWith("/interviews/")) return "Capture";
  if (path.startsWith("/interviews")) return "Interviews";
  if (path.startsWith("/admin")) return "Admin";
  if (path.includes("/qualification/")) {
    const id = path.split("/")[2] ?? "pioneer"; const projectId = path.split("/")[4] ?? "thermal";
    return getEngagement(id).projects.find((project) => project.id === projectId)?.name ?? "Qualification";
  }
  if (path.includes("/qualification")) return "Qualification";
  if (path.includes("/trace")) return "Trace";
  if (path.includes("/run")) return "Run";
  if (path.includes("/draft")) return "Draft";
  if (path.includes("/report")) return "Report";
  if (path.includes("/revision")) return "Revision";
  const id = path.split("/")[2] ?? "pioneer";
  return getEngagement(id).client;
}

function renderScreen(props: { path: string; search: string; records: Engagement[]; engagement?: Engagement | undefined; go: (target: string) => void; notify: (message: string) => void }) {
  const { path, records, engagement, go, notify } = props;
  if (path === "/dashboard") return <Dashboard go={go} notify={notify} />;
  if (path === "/engagements") return <EngagementList records={records} go={go} notify={notify} />;
  if (path === "/engagements/new") return <NewEngagement go={go} notify={notify} />;
  if (path.startsWith("/interviews/schedule")) return <ScheduleInterview go={go} notify={notify} />;
  if (path.startsWith("/interviews")) return <InterviewsPage path={path} go={go} notify={notify} />;
  if (path.startsWith("/admin")) return <AdminPage notify={notify} />;
  if (!engagement) return <EngagementList records={records} go={go} notify={notify} />;
  if (/\/qualification\/[^/]+\/confirm\/?$/.test(path)) return <ProjectConfirmation key={path} engagement={engagement} path={path} go={go} notify={notify} />;
  if (/\/qualification\/[^/]+\/?$/.test(path)) return <QualificationDetail engagement={engagement} path={path} go={go} />;
  if (path.includes("/qualification")) return <QualificationCheckpoint engagement={engagement} go={go} notify={notify} />;
  if (path.includes("/trace")) return <TraceScreen engagement={engagement} go={go} />;
  if (path.includes("/run")) return <RunScreen engagement={engagement} go={go} />;
  if (path.includes("/draft")) return <DraftScreen engagement={engagement} go={go} notify={notify} />;
  if (path.includes("/verified")) return <VerifiedScreen engagement={engagement} go={go} notify={notify} />;
  if (path.includes("/revision")) return <RevisionScreen engagement={engagement} go={go} notify={notify} />;
  if (path.includes("/report")) return <ReportScreen engagement={engagement} go={go} notify={notify} />;
  return <EngagementOverview engagement={engagement} go={go} notify={notify} />;
}

/** Overview: stat tiles, status donut, open-engagements card, and the weekly chart. */
function Dashboard({ go }: { go: (target: string) => void; notify: (message: string) => void }) {
  const cards = [
    { label: "Interviews today", value: "1", icon: CalendarDays, tone: "" as const, target: "/interviews" },
    { label: "Needs attention", value: "1", icon: AlertCircle, tone: "warning" as const, target: "/interviews/delta-call" },
    { label: "Awaiting review", value: "1", icon: ClipboardCheck, tone: "" as const, target: "/engagements/acme/draft" },
  ];
  const statuses = ["Ready to run", "Running", "Review required", "Needs attention", "Finalized"];
  return <div className="space-y-5">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map(({ label, value, icon: Icon, tone, target }) => <button type="button" onClick={() => go(target)} key={label} className="surface surface-hover stat-tile text-left"><span className={`icon-tile ${tone}`}><Icon size={19}/></span><span><span className="block text-xs text-muted-foreground">{label}</span><span className="mt-1 block text-[26px] font-bold leading-none text-navy">{value}</span></span></button>)}
    </div>
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.4fr_0.82fr]">
      <section className="surface min-h-[266px] p-5">
        <div className="mb-5 flex items-center justify-between"><h2 className="text-[15px] font-bold text-navy">Engagements by status</h2><button type="button" aria-label="More status options" className="text-muted-foreground"><ChevronDown size={16}/></button></div>
        <div className="flex flex-wrap items-center justify-center gap-8">
          <div className="relative"><div className="donut"/><div className="absolute inset-0 grid place-items-center"><span className="text-lg font-bold text-navy">{seededEngagements.length}</span></div><span className="absolute -right-2 top-4 rounded-lg bg-card px-2 py-1 text-[10px] text-navy shadow-md">Ready · 1</span></div>
          <div className="grid gap-3 text-xs text-muted-foreground">
            {statuses.map((label, index) => <button type="button" key={label} className="flex items-center gap-2 text-left hover:text-navy" onClick={() => go(`/engagements?status=${encodeURIComponent(label)}`)}><span className={`h-2.5 w-2.5 rounded-sm ${["bg-purple-500", "bg-teal", "bg-mint", "bg-warning", "bg-sky-500"][index]}`}/>{label}<span className="ml-auto font-semibold text-navy">{seededEngagements.filter((record) => record.status === label).length}</span></button>)}
          </div>
        </div>
      </section>
      <button type="button" onClick={() => go("/engagements")} className="surface surface-hover primary-highlight min-h-[266px] p-6 text-left">
        <span className="relative z-10 text-xs text-white/75">Open engagements</span><span className="relative z-10 mt-3 block text-4xl font-bold">4</span>
        <span className="relative z-10 mt-6 grid grid-cols-2 gap-4 border-t border-white/15 pt-4 text-xs"><span><span className="block text-white/65">Tax years</span><b className="mt-1 block text-sm">2024–2025</b></span><span><span className="block text-white/65">Interviews this week</span><b className="mt-1 block text-sm">3</b></span></span>
      </button>
    </div>
    <section className="surface p-5">
      <div className="mb-3 flex items-center justify-between"><h2 className="text-[15px] font-bold text-navy">Interviews &amp; reviews</h2><button className="rounded-full bg-secondary px-3 py-1.5 text-[11px] font-semibold text-navy">7 days <ChevronDown size={13} className="ml-1 inline"/></button></div>
      <Chart />
    </section>
  </div>;
}

function Chart() {
  return <svg viewBox="0 0 760 190" role="img" aria-label="Interviews and reviews over seven days" className="h-[180px] w-full overflow-visible">
    {[30, 68, 106, 144].map((y) => <line key={y} x1="45" y1={y} x2="738" y2={y} className="chart-grid"/>)}
    <polyline points="45,112 145,89 245,128 345,77 445,111 545,144 645,112 738,132" className="chart-line-mint"/>
    <polyline points="45,64 145,93 245,66 345,132 445,123 545,140 645,75 738,110" className="chart-line-pink"/>
    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => <text key={day} x={46 + index * 115} y="174" fill="var(--lavender)" fontSize="10">{day}</text>)}
  </svg>;
}

function DashboardRail({ go, notify }: { go: (target: string) => void; notify: (message: string) => void }) {
  const { viewAsLee, settings } = useCSSI();
  const pioneerWages = wageFigure("$70,300", wagesRestricted("J. Smith", viewAsLee, settings.wageAccess));
  return <aside className="app-rail">
    <div className="mb-5 flex justify-end"><ProfileChip/></div>
    <button type="button" onClick={() => go("/engagements/pioneer/draft")} className="highlight-card surface surface-hover mb-7 w-full rounded-[20px] p-5 text-left">
      <span className="relative z-10 text-[11px] text-white/75">Draft QRE</span><span className="relative z-10 mt-3 block text-3xl font-bold">{pioneerWages}</span><span className="relative z-10 mt-2 block text-[11px] text-white/75">Pioneer Systems · not yet verified</span>
    </button>
    <div className="mb-7">
      <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-bold text-navy">Needs attention</h2><button type="button" className="text-xs font-semibold text-orange-500" onClick={() => go("/engagements")}>See all</button></div>
      {recentActivity.map((item, index) => <button type="button" key={item.title} className="activity-row w-full text-left" onClick={() => go(index === 0 ? "/interviews/delta-call" : index === 1 ? "/engagements/pioneer/qualification" : "/engagements/acme/draft")}><span className={`activity-icon ${item.tone === "negative" ? "negative" : "warning"}`}><AlertCircle size={16}/></span><span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-semibold text-navy">{item.title}</span><span className="mt-1 block truncate text-[10px] text-muted-foreground">{item.subtitle}</span></span><span className="text-[10px] text-muted-foreground">{item.date}</span></button>)}
    </div>
    <div>
      <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-bold text-navy">Upcoming interviews</h2><button type="button" className="text-xs font-semibold text-orange-500" onClick={() => go("/interviews")}>See all</button></div>
      {[
        ["Today · 10:00 AM", "Acme Manufacturing", "Zoom · J. Smith · Detected", "/interviews/acme-call"],
        ["Sep 26 · 2:00 PM", "Northstar Labs", "Zoom · Linked", "/engagements/northstar"],
        ["Oct 01 · 11:30 AM", "Delta Fabrication", "Zoom · Not linked", "/interviews"],
      ].map(([date, client, detail, target]) => <button key={client} type="button" className="activity-row w-full text-left" onClick={() => go(target ?? "/interviews")}><span className="activity-icon"><CalendarDays size={15}/></span><span className="min-w-0 flex-1"><span className="block text-[10px] text-muted-foreground">{date}</span><span className="block truncate text-[11px] font-semibold text-navy">{client}</span><span className="block text-[10px] text-muted-foreground">{detail}</span></span></button>)}
    </div>
  </aside>;
}

/** Opens the screen for an engagement row. A finalized report also shows a download toast. */
function engagementRowAction(record: Engagement) {
  if (record.id === "northstar") return { label: "View run", target: `/engagements/${record.id}/run`, download: false };
  if (record.id === "delta") return { label: "Fix inputs", target: "/interviews/delta-call", download: false };
  if (record.id === "cronus") return { label: "Download PDF", target: `/engagements/${record.id}/report`, download: true };
  if (record.id === "acme") return { label: "Open", target: `/engagements/${record.id}/draft`, download: false };
  return { label: "Open", target: `/engagements/${record.id}`, download: false };
}

/** True when the engagement tax years include the selected year. */
function matchesTaxYear(years: string, year: string) {
  if (year === "All tax years") return true;
  return years.split(/[^\d]+/).filter(Boolean).includes(year);
}

/** Month and day for the engagements table. */
function listDate(date: string) {
  return date.replace(/, \d{4}$/, "");
}

/** Engagement table. Status, client, and tax year filters apply together. */
function EngagementList({ records, go, notify }: { records: Engagement[]; go: (target: string) => void; notify: (message: string) => void }) {
  const [status, setStatus] = useState(() => takeEngagementStatus() ?? "All statuses");
  const [client, setClient] = useState("All clients");
  const [year, setYear] = useState("All tax years");
  useEffect(() => {
    const next = takeEngagementStatus();
    if (next) setStatus(next);
  }, []);
  const clients = [...new Set(records.map((record) => record.client))];
  const filtered = records.filter((record) => {
    const statusMatches = status === "All statuses" || record.status === status;
    const clientMatches = client === "All clients" || record.client === client;
    return statusMatches && clientMatches && matchesTaxYear(record.years, year);
  });
  const clearFilters = () => {
    setStatus("All statuses");
    setClient("All clients");
    setYear("All tax years");
  };
  const openRow = (record: Engagement) => {
    const action = engagementRowAction(record);
    if (action.download) notify("Download ready");
    go(action.target);
  };
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Status" className="workspace-input !h-10 !min-h-10 !w-auto pr-8" value={status} onChange={(event) => setStatus(event.target.value)}><option>All statuses</option>{seededEngagements.map((record) => <option key={record.id}>{record.status}</option>)}</select>
        <select aria-label="Client" className="workspace-input !h-10 !min-h-10 !w-auto pr-8" value={client} onChange={(event) => setClient(event.target.value)}><option>All clients</option>{clients.map((name) => <option key={name}>{name}</option>)}</select>
        <select aria-label="Tax year" className="workspace-input !h-10 !min-h-10 !w-auto pr-8" value={year} onChange={(event) => setYear(event.target.value)}><option>All tax years</option><option>2025</option><option>2024</option></select>
      </div>
      <div className="flex gap-2">
        <AppButton variant="secondary" onClick={() => go("/interviews/schedule")}><CalendarPlus size={16}/>Schedule</AppButton>
        <AppButton onClick={() => go("/engagements/new")}><Plus size={17}/>New</AppButton>
      </div>
    </div>
    {filtered.length ? <section className="surface overflow-auto p-2"><table className="workspace-table min-w-[860px]"><thead><tr>{["Client", "Tax year", "Capture", "Status", "Date", "Owner", ""].map((heading) => <th key={heading || "action"}>{heading}</th>)}</tr></thead><tbody>{filtered.map((record) => <tr key={record.id}><td className="font-semibold text-navy">{record.client}</td><td>{record.years}</td><td>{record.capture}</td><td><Status value={record.status}/></td><td>{listDate(record.date)}</td><td>{record.owner}</td><td className="text-right"><button type="button" className="inline-flex items-center gap-1 font-bold text-mint" onClick={() => openRow(record)}>{engagementRowAction(record).label}<ArrowRight size={14}/></button></td></tr>)}</tbody></table></section> : <EmptyState text="No engagements match these filters." action="Clear filters" onClick={clearFilters}/>}
  </div>;
}

function EmptyState({ text, action, onClick }: { text: string; action?: string; onClick?: () => void }) {
  return <div className="surface flex min-h-52 flex-col items-center justify-center gap-3 p-8 text-center"><span className="icon-tile neutral"><Search size={18}/></span><p className="text-sm text-muted-foreground">{text}</p>{action && <AppButton variant="link" className="text-mint" onClick={onClick}>{action}</AppButton>}</div>;
}

/** Manual engagement. A failed capture prefills the client and still requires transcript and summary. */
function NewEngagement({ go, notify }: { go: (target: string) => void; notify: (message: string) => void }) {
  const { records, setRecords } = useCSSI();
  const [failedClient] = useState(() => takeFailedCaptureClient() ?? "");
  const [client, setClient] = useState(failedClient);
  const [taxYear, setTaxYear] = useState("");
  const [transcript, setTranscript] = useState("");
  const [summary, setSummary] = useState("");
  const [prior, setPrior] = useState("");
  const [mode, setMode] = useState({ transcript: "Upload", summary: "Upload", prior: "Upload" });
  const [wageSource, setWageSource] = useState("Spreadsheet");
  const [profile, setProfile] = useState(false);
  const [profileData, setProfileData] = useState(["Pioneer Systems, Inc.", "Industrial equipment manufacturing", "S Corporation", "Thermal control assemblies", "Founder-owned"]);
  const complete = Boolean(client.trim() && taxYear.trim() && transcript && summary);
  const fileChange = (event: React.ChangeEvent<HTMLInputElement>, setter: (value: string) => void) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/\.(txt|pdf|docx|doc)$/i.test(file.name)) {
      notify("This file type is not supported.");
      event.target.value = "";
      return;
    }
    setter(file.name);
  };
  const create = () => {
    if (!complete) return;
    const id = `manual-${Date.now()}`;
    const record: Engagement = { id, client: client.trim(), years: taxYear.trim(), capture: "Manual", status: "Ready to run", stage: "Inputs validated", date: fmtDate(), owner: "J. Smith", projects: [] };
    setRecords([record, ...records]);
    go(`/engagements/${id}`);
  };
  const wageClass = (selected: boolean) => `choice-button inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold ${selected ? "bg-navy text-white" : "bg-secondary text-navy"}`;
  return <div className="space-y-5">
    <button type="button" onClick={() => go("/engagements")} className="flex items-center gap-1 text-xs text-muted-foreground"><ChevronLeft size={15}/>Engagements</button>
    <section className="surface space-y-5 p-6">
      {failedClient ? <p className="text-xs text-negative">Transcript retrieval failed.</p> : null}
      <div className="grid gap-4 md:grid-cols-2"><Field label="Client name *"><input className="workspace-input" value={client} onChange={(event) => setClient(event.target.value)} placeholder="Client name"/></Field><Field label="Tax year *"><input className="workspace-input" value={taxYear} onChange={(event) => setTaxYear(event.target.value)} placeholder="2025"/></Field></div>
      <div className="grid gap-5 md:grid-cols-2">
        <UploadField label="Transcript *" mode={mode.transcript} setMode={(value) => setMode({ ...mode, transcript: value })} file={transcript} setFile={setTranscript} fileChange={fileChange} checks warn="38 min · meeting was 1 h 12 m."/>
        <UploadField label="Summary *" mode={mode.summary} setMode={(value) => setMode({ ...mode, summary: value })} file={summary} setFile={setSummary} fileChange={fileChange} checks/>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <UploadField label="Prior report" mode={mode.prior} setMode={(value) => setMode({ ...mode, prior: value })} file={prior} setFile={setPrior} fileChange={fileChange} optional/>
        <Field label="Wage source"><div className="flex flex-wrap items-center gap-2"><button type="button" className={wageClass(wageSource === "Spreadsheet")} onClick={() => setWageSource("Spreadsheet")}>Spreadsheet</button><span className="inline-flex items-center gap-1.5"><button type="button" className={wageClass(wageSource === "PDF")} onClick={() => setWageSource("PDF")}>PDF</button><IconInfo text="Figures are read from the scan and flagged if uncertain."/></span></div></Field>
      </div>
      <div><button type="button" className="flex items-center gap-2 text-sm font-semibold text-navy" onClick={() => setProfile(!profile)}><ChevronRight size={15} className={profile ? "rotate-90" : ""}/>Add company profile</button>{profile && <div className="mt-4 grid gap-3 md:grid-cols-2">{["Legal entity", "Industry", "Entity type", "Product lines", "Ownership"].map((label, index) => <Field key={label} label={label}><input className="workspace-input" value={profileData[index]} onChange={(event) => setProfileData(profileData.map((value, i) => i === index ? event.target.value : value))}/></Field>)}</div>}</div>
      <label className="flex items-center gap-2 text-xs font-medium text-navy"><input type="checkbox" defaultChecked className="accent-mint"/>Pause after qualification <IconInfo text="The run waits until you confirm each project."/></label>
      <div className="flex justify-end gap-2 border-t border-border pt-4"><AppButton variant="secondary" onClick={() => go("/engagements")}>Cancel</AppButton><AppButton disabled={!complete} onClick={create}><Plus size={16}/>Create</AppButton></div>
    </section>
  </div>;
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return <label className="block space-y-2"><span className="block text-xs font-semibold text-navy">{label}</span>{children}</label>;
}

/** Upload or paste field. The selected tab is navy, and passing checks are mint ticks only. */
function UploadField({ label, mode, setMode, file, setFile, fileChange, optional, checks, warn }: { label: string; mode: string; setMode: (value: string) => void; file: string; setFile: (value: string) => void; fileChange: (event: React.ChangeEvent<HTMLInputElement>, setter: (value: string) => void) => void; optional?: boolean; checks?: boolean; warn?: string }) {
  const [paste, setPaste] = useState("");
  const shownFile = file && file !== "Pasted content" ? file : "";
  return <div className="space-y-2">
    <div className="flex items-center justify-between"><span className="text-xs font-semibold text-navy">{label}{optional ? <span className="ml-1 font-medium text-muted-foreground">Optional</span> : null}</span><div className="flex rounded-full bg-secondary p-1">{["Upload", "Paste"].map((tab) => <button type="button" key={tab} className={`rounded-full px-3 py-1 text-[10px] font-semibold ${mode === tab ? "bg-navy text-white" : "text-muted-foreground"}`} onClick={() => setMode(tab)}>{tab}</button>)}</div></div>
    {mode === "Paste" ? <textarea className="workspace-input workspace-textarea" value={paste} onChange={(event) => { const value = event.target.value; setPaste(value); setFile(value.trim() ? "Pasted content" : ""); }} placeholder="Paste text"/> : <label className="flex min-h-[88px] cursor-pointer items-center justify-center gap-2 rounded-2xl bg-secondary/70 text-xs text-muted-foreground hover:bg-secondary"><Upload size={16}/>{shownFile || "Choose a file"}<input type="file" className="sr-only" onChange={(event) => fileChange(event, setFile)}/></label>}
    {checks && file ? <p className="flex items-center gap-1 text-mint" aria-label="Passing checks"><Check size={14}/><Check size={14}/></p> : null}
    {warn && file ? <p className="flex items-center gap-2 text-xs text-amber-700"><AlertTriangle size={14}/>{warn}</p> : null}
  </div>;
}

/** Files ready for this engagement. Pioneer uses the captured source set. */
function inputFiles(engagement: Engagement): string[] {
  if (engagement.id === "pioneer") return ["fathom-transcript.txt", "fathom-summary.txt", "company-profile.pdf", "2025-wages.pdf"];
  return ["Transcript", "Summary"];
}

/** Wage file and extraction state shown on the overview. */
function wageExtraction(engagement: Engagement): { file: string; state: string } {
  if (engagement.id === "pioneer") return { file: "2025-wages.pdf", state: "OCR required" };
  return { file: "Wages", state: "Pending" };
}

/** Follow-ups recorded for this client. Other clients start with none. */
function seedFollowUps(id: string): FollowUp[] {
  if (id !== "pioneer") return [];
  return pioneerFollowUps.map((item) => ({ ...item }));
}

/** One follow-up row: project, date, source, and note or file. */
function followUpLabel(item: FollowUp): string {
  return [item.project, item.date, item.source, item.note].filter(Boolean).join(" · ");
}

/** Agent verdict taken from the four criteria. */
function agentVerdict(project: Project): Verdict {
  return calculateVerdict(project.criteria.map((criterion) => criterion.status));
}

const verdictChoices: Verdict[] = ["Eligible", "Likely Ineligible", "Needs Review"];
const comparisonCriteria = [
  ["Business Component", "BC"],
  ["Elimination of Uncertainty", "EU"],
  ["Process of Experimentation", "PE"],
  ["Technological in Nature", "TN"],
] as const;

/** Engagement overview. Actions follow the record's own status. */
function EngagementOverview({ engagement, go, notify }: { engagement: Engagement; go: (target: string) => void; notify: (message: string) => void }) {
  const store = useCSSI();
  const [adding, setAdding] = useState(false);
  const [followDraft, setFollowDraft] = useState({ project: "", date: "", source: "", note: "" });
  const [followClient, setFollowClient] = useState(engagement.id);
  const followups = store.followUps[engagement.id] ?? seedFollowUps(engagement.id);
  if (followClient !== engagement.id) {
    setFollowClient(engagement.id);
    setAdding(false);
    setFollowDraft({ project: "", date: "", source: "", note: "" });
  }
  const base = `/engagements/${engagement.id}`;
  const files = inputFiles(engagement);
  const wages = wageExtraction(engagement);
  const restricted = wagesRestricted(engagement.owner, store.viewAsLee, store.settings.wageAccess);
  const actions = overviewActions(engagement.status);
  const hasDraft = draftExists(engagement.status);
  const newEvidence = hasDraft && followups.some((item) => item.reanalysis);
  const canSaveFollowUp = Object.values(followDraft).some((value) => value.trim());
  const saveFollowUp = () => {
    if (!canSaveFollowUp) return;
    const row: FollowUp = {
      id: `fu-${Date.now()}`,
      project: followDraft.project.trim(),
      date: followDraft.date.trim(),
      source: followDraft.source.trim(),
      note: followDraft.note.trim(),
      reanalysis: hasDraft,
    };
    store.setFollowUps(engagement.id, [row, ...followups]);
    setFollowDraft({ project: "", date: "", source: "", note: "" });
    setAdding(false);
    store.setNewFollowup(followUpLabel(row));
  };
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-muted-foreground">{engagement.years} · {engagement.capture} · Created {engagement.date}</p>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => <AppButton key={action.label} variant={action.to === "trace" ? "secondary" : "default"} onClick={() => { if (action.label === "Start Agent") store.startRun(engagement.id); go(`${base}/${action.to}`); }}>{action.label === "Start Agent" && <Play size={16} />}{action.to === "trace" && <GitBranch size={15} />}{action.label}</AppButton>)}
      </div>
    </div>
    <section className="surface grid grid-cols-2 gap-y-4 p-5 md:grid-cols-4">
      <Metric label="Status" value={engagement.status} />
      <Metric label="Capture" value={engagement.capture} />
      <Metric label="Inputs" value={`${files.length} ready`} />
      <Metric label="Checkpoint" value="Enabled" />
    </section>
    <section className="surface p-5">
      <SectionTitle title="Files" />
      <div className="mt-3 space-y-2">
        {files.map((file) => {
          const hiddenWage = restricted && /wage/i.test(file);
          return <div className="flex items-center gap-2 rounded-xl bg-secondary/60 px-3 py-3 text-xs text-navy" key={file}><FileText size={15} className="text-muted-foreground" /><span className="min-w-0 flex-1 truncate">{hiddenWage ? "Restricted" : file}</span>{!hiddenWage && <Status value="Ready" />}</div>;
        })}
      </div>
    </section>
    <section className="surface p-5">
      <SectionTitle title="Projects" />
      {engagement.projects.length ? <div className="mt-3 space-y-3">{engagement.projects.map((project) => {
        const decision = store.confirmed[project.id];
        const verdict = decision?.verdict ?? agentVerdict(project);
        const openEditor = narrativeReady(decision?.verdict, hasDraft, agentVerdict(project));
        return <div key={project.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-secondary/40 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3"><span className="truncate text-sm font-semibold text-navy">{project.name}</span><Status value={verdict} /></div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{wageFigure(projectWageLabel(verdict, project.amount), restricted)}</span>
            <button type="button" className="font-bold text-mint" onClick={() => go(openEditor ? `${base}/editor?scope=project&project=${project.id}` : `${base}/qualification/${project.id}`)}>{openEditor ? "Edit" : "Qualification"}</button>
          </div>
        </div>;
      })}</div> : <EmptyState text="No projects added" action="Add project" onClick={() => notify("Project added")} />}
    </section>
    <section className="surface p-5">
      <div className="flex items-center justify-between"><SectionTitle title="Follow-ups" /><AppButton variant="ghost" className="text-mint" onClick={() => setAdding(!adding)}>+ Add</AppButton></div>
      {adding && <div className="my-3 grid gap-2 md:grid-cols-4">
        <input aria-label="Project" className="workspace-input" value={followDraft.project} onChange={(event) => setFollowDraft({ ...followDraft, project: event.target.value })} placeholder="Project" />
        <input aria-label="Date" className="workspace-input" value={followDraft.date} onChange={(event) => setFollowDraft({ ...followDraft, date: event.target.value })} placeholder="Date" />
        <input aria-label="Source" className="workspace-input" value={followDraft.source} onChange={(event) => setFollowDraft({ ...followDraft, source: event.target.value })} placeholder="Source" />
        <input aria-label="Note or file" className="workspace-input" value={followDraft.note} onChange={(event) => setFollowDraft({ ...followDraft, note: event.target.value })} placeholder="Note or file" />
        <AppButton disabled={!canSaveFollowUp} onClick={saveFollowUp}>Save</AppButton>
      </div>}
      <div className="mt-3 divide-y divide-border">{followups.map((row) => <p key={row.id} className="py-3 text-xs text-muted-foreground">{followUpLabel(row)}</p>)}</div>
      {newEvidence && <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-amber-50 px-3 py-3 text-xs text-amber-700"><AlertCircle size={15} />New evidence <IconInfo text="The current draft is kept until you re-analyze." /><AppButton variant="ghost" className="ml-auto text-mint" onClick={() => notify("Project analysis queued")}>Re-analyze</AppButton></div>}
    </section>
    <section className="surface flex flex-wrap items-center justify-between gap-3 p-5">
      <div><SectionTitle title="Wages" /><p className="mt-2 text-xs text-muted-foreground">{restricted ? "Restricted" : `${wages.file} · ${wages.state}`}</p></div>
      <button type="button" onClick={() => go(`${base}/draft`)} className="flex items-center gap-1 text-xs font-bold text-mint">Review <ArrowRight size={14} /></button>
    </section>
  </div>;
}

/** One figure on a summary row. An optional note sits on the info icon. */
function Metric({ label, value, info }: { label: string; value: string; info?: string | undefined }) {
  return <div><span className="block text-[10px] text-muted-foreground">{label}</span><span className="mt-1 flex items-center gap-1 text-sm font-semibold text-navy">{value}{info && <IconInfo text={info} />}</span></div>;
}
/** Qualification checkpoint. Continue stays off until every project has a decision. */
function QualificationCheckpoint({ engagement, go }: { engagement: Engagement; go: (target: string) => void; notify: (message: string) => void }) {
  const { confirmed, continueRun } = useCSSI();
  const allConfirmed = engagement.projects.length > 0 && engagement.projects.every((project) => confirmed[project.id]);
  const resume = () => {
    if (!allConfirmed) return;
    continueRun(engagement.id);
    go(`/engagements/${engagement.id}/run`);
  };
  return <div className="space-y-5">
    <section className="surface overflow-hidden p-2">
      <table className="workspace-table">
        <thead><tr><th>Project</th><th>Assessment</th><th>Confirmation</th><th>Review</th></tr></thead>
        <tbody>{engagement.projects.map((project) => {
          const decision = confirmed[project.id];
          const verdict = decision?.verdict ?? agentVerdict(project);
          return <tr key={project.id}>
            <td className="font-semibold text-navy">{project.number} · {project.name}</td>
            <td><Status value={verdict} /></td>
            <td>{decision ? <Status value={decision.overridden ? "Overridden" : "Confirmed"} /> : <span className="text-xs text-muted-foreground">Awaiting decision</span>}</td>
            <td className="text-right"><button type="button" className="font-bold text-mint" onClick={() => go(`/engagements/${engagement.id}/qualification/${project.id}/confirm`)}>Review</button></td>
          </tr>;
        })}</tbody>
      </table>
    </section>
    {engagement.projects.length === 0 && <p className="text-xs text-muted-foreground">No projects match this engagement.</p>}
    <div className="flex justify-between">
      <AppButton variant="secondary" onClick={() => go(`/engagements/${engagement.id}/run`)}>‹ Run</AppButton>
      <div className="flex items-center gap-2">
        <AppButton disabled={!allConfirmed} onClick={resume}>Continue</AppButton>
        {!allConfirmed && <IconInfo text="Confirm each project first." />}
      </div>
    </div>
  </div>;
}

/** Read-only qualification. Quotes stay on one line. Speaker and time sit on the info icon. */
function QualificationDetail({ engagement, path, go }: { engagement: Engagement; path: string; go: (target: string) => void }) {
  const { confirmed } = useCSSI();
  const projectId = path.split("/")[4] ?? "";
  const project = engagement.projects.find((item) => item.id === projectId);
  if (!project) return <EmptyState text="Project not found" action="Return to qualification" onClick={() => go(`/engagements/${engagement.id}/qualification`)} />;
  const decision = confirmed[project.id];
  const recordedBy = decision ? (decision.overridden ? "Overridden by J. Smith" : "Confirmed by J. Smith") : "";
  return <div className="space-y-5">
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span>qualification_evaluator v1.4 · Run 3 · Sep 21, 9:42 AM{recordedBy ? ` · ${recordedBy}` : ""}</span>
      <button type="button" className="font-bold text-mint" onClick={() => go(`/engagements/${engagement.id}/trace`)}>Trace</button>
    </p>
    <section className="surface divide-y divide-border px-4">
      {project.criteria.map((criterion) => <div key={criterion.name} className="flex items-center gap-3 py-3">
        <span className="w-48 shrink-0 text-sm font-semibold text-navy">{criterion.name}</span>
        <Status value={criterion.status} />
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground" title={criterion.quote}>“{criterion.quote}”</span>
        <IconInfo text={`${criterion.speaker}, ${criterion.time}`} />
      </div>)}
    </section>
    {project.note && <p className="text-xs text-muted-foreground">{project.note}</p>}
    <section className="surface px-4 py-3">
      <div className="flex items-center gap-2 py-1 text-[10px] text-muted-foreground">
        <span className="w-48 shrink-0">Project</span>
        {comparisonCriteria.map(([name, short]) => <span key={name} className="inline-grid w-8 place-items-center" title={name}>{short}</span>)}
      </div>
      {engagement.projects.map((item) => <div key={item.id} className="flex items-center gap-2 py-1">
        <span className="w-48 shrink-0 truncate text-xs font-semibold text-navy">{item.number} {item.name}</span>
        {comparisonCriteria.map(([name, short]) => {
          const status = item.criteria.find((criterion) => criterion.name === name)?.status;
          return <CriterionGlyph key={short} status={status} label={`${item.name} ${name}`} />;
        })}
      </div>)}
    </section>
    <div className="flex flex-wrap gap-4">
      <button type="button" className="text-xs font-bold text-mint" onClick={() => go(`/engagements/${engagement.id}`)}>‹ {engagement.client}</button>
      <button type="button" className="text-xs font-bold text-mint" onClick={() => go(`/engagements/${engagement.id}/qualification`)}>‹ Qualification</button>
    </div>
  </div>;
}

/** Tick, cross, or question mark for one cell of the project comparison. */
function CriterionGlyph({ status, label }: { status: CriterionStatus | undefined; label: string }) {
  const mark = status ? criterionMark(status) : "–";
  const tone = mark === "✓" ? "text-mint" : mark === "✗" ? "text-negative" : "text-amber-700";
  return <span className={`inline-grid w-8 place-items-center text-sm font-bold ${tone}`} aria-label={status ? `${label} ${status}` : label}>{mark}</span>;
}

/** Confirm one project. The agent's verdict starts selected. A different choice needs a reason. */
function ProjectConfirmation({ engagement, path, go, notify }: { engagement: Engagement; path: string; go: (target: string) => void; notify: (message: string) => void }) {
  const projectId = path.split("/")[4] ?? "";
  const project = engagement.projects.find((item) => item.id === projectId);
  const { confirmProject, confirmed } = useCSSI();
  const agent = project ? agentVerdict(project) : "Needs Review";
  const existing = project ? confirmed[project.id] : undefined;
  const [selected, setSelected] = useState<Verdict>(existing?.verdict ?? agent);
  const [reason, setReason] = useState(existing?.reason ?? "");
  const [expanded, setExpanded] = useState<string | null>(null);
  if (!project) return <EmptyState text="Project not found" action="Return to qualification" onClick={() => go(`/engagements/${engagement.id}/qualification`)} />;
  const changed = selected !== agent;
  const canConfirm = !changed || Boolean(reason.trim());
  const finish = () => {
    if (!canConfirm) return;
    confirmProject(project.id, { verdict: selected, overridden: changed, reason: changed ? reason.trim() : "" });
    if (changed) notify("Overridden by J. Smith");
    go(`/engagements/${engagement.id}/qualification`);
  };
  return <div className="space-y-5">
    <div className="flex items-center gap-2"><Status value={`AI: ${agent}`} /></div>
    <p className="truncate text-sm text-muted-foreground" title={project.objective}>{project.objective}</p>
    <section className="surface overflow-hidden p-2">
      <table className="workspace-table">
        <thead><tr><th>Criterion</th><th>Assessment</th><th></th></tr></thead>
        <tbody>{project.criteria.map((criterion) => <tr key={criterion.name}>
          <td className="font-semibold text-navy">{criterion.name}</td>
          <td><Status value={criterion.status} /></td>
          <td className="text-right">
            <button type="button" className="font-bold text-mint" aria-expanded={expanded === criterion.name} onClick={() => setExpanded(expanded === criterion.name ? null : criterion.name)}>{expanded === criterion.name ? "Hide quote" : "View quote"}</button>
            {expanded === criterion.name && <div className="mt-2 max-w-lg text-left text-xs text-muted-foreground">“{criterion.quote}” <IconInfo text={`${criterion.speaker}, ${criterion.time}`} /></div>}
          </td>
        </tr>)}</tbody>
      </table>
    </section>
    <section className="surface space-y-5 p-5">
      <div className="flex flex-wrap gap-2">{verdictChoices.map((verdict) => <button key={verdict} type="button" aria-pressed={selected === verdict} className={`choice-button ${selected === verdict ? "selected bg-navy text-white" : "bg-secondary text-navy"}`} onClick={() => setSelected(verdict)}>{verdict}{verdict === "Needs Review" && <IconInfo text="Nothing is generated until this is resolved." />}</button>)}</div>
      <p className="text-xs text-muted-foreground">Agent: {agent}</p>
      {changed && <Field label="Reason for override *"><textarea className="workspace-input workspace-textarea" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason" /></Field>}
      <div className="flex justify-end gap-2">
        <AppButton variant="secondary" onClick={() => go(`/engagements/${engagement.id}/qualification`)}>Save</AppButton>
        <AppButton disabled={!canConfirm} onClick={finish}><Check size={15} />Confirm</AppButton>
      </div>
    </section>
  </div>;
}

const runStepMs = 700;

/** Simulated run. Start Agent animates the first three activities, then pauses on the checkpoint. */
function RunScreen({ engagement, go }: { engagement: Engagement; go: (target: string) => void }) {
  const { runFor, cancelRun, tickRun } = useCSSI();
  const snapshot = runFor(engagement.id);
  const goRef = useRef(go);
  const tickRef = useRef(tickRun);
  goRef.current = go;
  tickRef.current = tickRun;
  useEffect(() => {
    if (snapshot.phase !== "starting" && snapshot.phase !== "finishing") return;
    const timer = window.setTimeout(() => {
      const event = tickRef.current(engagement.id);
      if (event === "draft") goRef.current(`/engagements/${engagement.id}/draft`);
    }, runStepMs);
    return () => window.clearTimeout(timer);
  }, [snapshot.phase, snapshot.current, engagement.id]);
  const activity = currentActivity(snapshot);
  const canCancel = snapshot.phase === "starting" || snapshot.phase === "checkpoint" || snapshot.phase === "finishing";
  return <div className="space-y-5">
    <section className="surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Status value={runStatusLabel(snapshot)} />
          <span className="text-xs text-muted-foreground">{stepCount(snapshot)}</span>
          <span className="text-xs text-muted-foreground">Within budget</span>
          <IconInfo text="Stops at 40 steps." />
        </div>
        <button type="button" className="flex items-center gap-1 text-xs font-bold text-mint" onClick={() => go(`/engagements/${engagement.id}/trace`)}><GitBranch size={14} />Trace</button>
      </div>
      {activity && <p className="mt-5 text-sm font-semibold text-navy" aria-live="polite">{activity}</p>}
      <div className="mt-3 grid gap-x-8 md:grid-cols-2">
        {runActivities.map((step, index) => {
          const state = activityState(index, snapshot);
          return <div className={`progress-step ${state}`} key={step} aria-label={`${step}, ${state}`}>
            <span className="progress-dot">{state === "done" ? <Check size={14} /> : index + 1}</span>
            <span>{step}</span>
            {step === "Write narratives" && <IconInfo text="Only Eligible projects get a narrative." />}
            {step === "Checkpoint" && state === "current" && <button type="button" className="ml-auto text-xs font-bold text-mint" onClick={() => go(`/engagements/${engagement.id}/qualification`)}>Open</button>}
          </div>;
        })}
      </div>
      {(canCancel || snapshot.phase === "complete") && <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        {canCancel && <AppButton variant="secondary" onClick={() => cancelRun(engagement.id)}>Cancel</AppButton>}
        {snapshot.phase === "complete" && <AppButton onClick={() => go(`/engagements/${engagement.id}/draft`)}>View draft</AppButton>}
      </div>}
    </section>
  </div>;
}

/** Audit trace for the simulated run. A pause shows steps 1–6. A finished run shows the full table. */
function TraceScreen({ engagement, go }: { engagement: Engagement; go: (target: string) => void }) {
  const { runFor, confirmed, traceExtrasFor } = useCSSI();
  const snapshot = runFor(engagement.id);
  const projects = engagement.projects.map((project) => ({ number: project.number, verdict: confirmed[project.id]?.verdict ?? project.verdict }));
  const rows = visibleTraceRows(snapshot, projects, traceExtrasFor(engagement.id));
  return <div className="space-y-5">
    <Status value={runStatusLabel(snapshot)} />
    <section className="surface overflow-auto p-2">
      <table className="workspace-table min-w-[900px]">
        <thead><tr>{["Step", "Tool", "Input", "Reasoning summary", "Result"].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead>
        <tbody>{rows.map((row, rowIndex) => <tr key={`${row.step}-${rowIndex}`}>{[row.step, row.tool, row.input, row.reasoning, row.result].map((cell, index) => <td key={`${row.step}-${index}`} className={cell.startsWith("REFUSED") ? "font-semibold text-negative" : index === 4 ? "text-navy" : "text-muted-foreground"}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </section>
    {rows.length > 0 && <section className="surface overflow-auto p-2">
      <table className="workspace-table">
        <caption className="px-3 py-3 text-left text-sm font-bold text-navy">Generated with</caption>
        <tbody>{generatedWith.map((item) => <tr key={item.name}><td className="font-semibold text-navy">{item.name}</td><td className="text-muted-foreground">{item.version}</td></tr>)}</tbody>
      </table>
    </section>}
    <button type="button" className="text-xs font-bold text-mint" onClick={() => go(`/engagements/${engagement.id}`)}>‹ {engagement.client}</button>
  </div>;
}


/** Editor path for a revision. One chosen project opens that project; the whole report opens the report editor. */
function revisionEditorPath(engagementId: string, projectIds: string[], wholeReport: boolean) {
  const onlyProject = projectIds.length === 1 ? projectIds[0] : "";
  if (!wholeReport && onlyProject) return `/engagements/${engagementId}/editor?scope=project&project=${onlyProject}`;
  return `/engagements/${engagementId}/editor?scope=engagement`;
}

/** Final report. Pioneer stays on Continue review until the verified lock finalizes it. Cronus is already final. */
function ReportScreen({ engagement, go, notify }: { engagement: Engagement; go: (target: string) => void; notify: (message: string) => void }) {
  const { finalized, confirmed, openRevision, viewAsLee, settings } = useCSSI();
  const restricted = wagesRestricted(engagement.owner, viewAsLee, settings.wageAccess);
  const [reopenIds, setReopenIds] = useState<string[] | null>(null);
  const [wholeReport, setWholeReport] = useState(false);
  const [reason, setReason] = useState("");
  const isFinal = finalized || engagement.status === "Finalized";
  const includedIds = engagement.projects.filter((project) => projectIncluded(project.verdict, confirmed[project.id]?.verdict)).map((project) => project.id);
  const figures = finalReportFigures(engagement.projects, confirmed);
  /** Remembers which projects this reopen will include and asks for the reason. */
  const beginReopen = (ids: string[], whole: boolean) => {
    setReopenIds(ids);
    setWholeReport(whole);
    setReason("");
  };
  /** Stores the typed reason and opens the revision. Version 1 stays in history. */
  const confirmReopen = () => {
    if (!reason.trim() || !reopenIds) return;
    openRevision(reason.trim(), reopenIds, wholeReport);
    go(`/engagements/${engagement.id}/revision`);
  };
  if (!isFinal) return <div className="surface flex flex-wrap items-center justify-between gap-4 p-6"><span className="text-sm text-muted-foreground">Not finalized</span><AppButton onClick={() => go(`/engagements/${engagement.id}/draft`)}>Continue review</AppButton></div>;
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-bold text-navy">{engagement.client} · {engagement.years}</h2><Status value="Finalized" /></div>
        <p className="mt-2 text-xs text-muted-foreground">{finalReportAttribution(engagement)}</p>
      </div>
      <AppButton variant="secondary" onClick={() => beginReopen(includedIds, true)}><RefreshCw size={14} />Reopen report</AppButton>
    </div>
    {reopenIds && <section className="surface space-y-3 p-5">
      <label className="block text-xs font-semibold text-navy">Reason<textarea className="workspace-input workspace-textarea mt-2" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason for reopening" /></label>
      <div className="flex flex-wrap gap-2">
        <AppButton disabled={!reason.trim()} onClick={confirmReopen}>Open revision</AppButton>
        <AppButton variant="secondary" onClick={() => setReopenIds(null)}>Cancel</AppButton>
      </div>
    </section>}
    {engagement.projects.length > 0 && <section className="surface grid gap-4 p-5 sm:grid-cols-4">
      <Metric label="Qualified total" value={wageFigure(figures.total, restricted)} info={figures.higherBecauseProject03 ? "Higher than the draft because Project 03 was confirmed." : undefined} />
      <Metric label="Projects" value={figures.projects} />
      <Metric label="Employees" value={figures.employees} />
      <Metric label="Wage lines" value={figures.wageLines} />
    </section>}
    <section className="surface flex flex-wrap items-center justify-between gap-3 p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-navy">{finalReportFileName(engagement.id, engagement.client, engagement.years)}<IconInfo text="One file for the engagement. Included projects can also be downloaded separately." /></p>
      <AppButton onClick={() => notify("PDF download ready")}><Download size={15} />Download PDF</AppButton>
    </section>
    {engagement.projects.length > 0 && <div className="grid gap-3 md:grid-cols-3">{engagement.projects.map((project) => {
      const included = projectIncluded(project.verdict, confirmed[project.id]?.verdict);
      return <div className="project-card" key={project.id}>
        <div className="flex items-start justify-between gap-2"><b className="text-xs text-navy">{project.number} · {project.name}</b><Status value={included ? "Included" : "Not included"} /></div>
        {!included && <p className="mt-3 text-xs text-muted-foreground">{wageFigure(excludedWageLabel(project.amount), restricted)}</p>}
        {included && <div className="mt-4 flex gap-3">
          <button type="button" className="text-xs font-bold text-mint" onClick={() => notify("Project extract ready")}>Extract</button>
          <button type="button" className="text-xs font-bold text-mint" onClick={() => beginReopen([project.id], false)}>Reopen</button>
        </div>}
      </div>;
    })}</div>}
  </div>;
}

/** Revision for a reopened report. Version 1 stays downloadable while v2 is still a draft. */
function RevisionScreen({ engagement, go, notify }: { engagement: Engagement; go: (target: string) => void; notify: (message: string) => void }) {
  const { revision, confirmed } = useCSSI();
  const editTarget = revisionEditorPath(engagement.id, revision.projectIds, revision.wholeReport);
  return <div className="space-y-5">
    {revision.active && <p className="text-xs text-muted-foreground">Reopened Sep 28 · v2 draft · last final v1 Sep 25</p>}
    <div className="grid gap-3 md:grid-cols-3">{engagement.projects.map((project) => {
      const included = projectIncluded(project.verdict, confirmed[project.id]?.verdict);
      const state = revisionCardState(included, revision.projectIds.includes(project.id));
      return <div key={project.id} className="project-card">
        <b className="text-xs text-navy">{project.number} · {project.name}</b>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1"><Status value={state} />{state === "Not included" && <IconInfo text="Reopening does not change a qualification decision." />}</span>
          {state === "Being revised" && <button type="button" onClick={() => go(`/engagements/${engagement.id}/editor?scope=project&project=${project.id}`)} className="text-xs font-bold text-mint">Edit</button>}
        </div>
      </div>;
    })}</div>
    <section className="surface p-5">
      <SectionTitle title="Version history" />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4 border-b border-border py-3 text-xs text-muted-foreground"><span>v1 · Sep 25 · Julie</span><button type="button" className="font-bold text-mint" onClick={() => notify("Version 1 PDF ready")}>Download</button></div>
      {revision.reason && <div className="flex flex-wrap items-center justify-between gap-4 py-3 text-xs text-muted-foreground"><span>Reopened · {revision.reason}</span>{revision.active && <button type="button" className="font-bold text-mint" onClick={() => go(editTarget)}>Edit</button>}</div>}
    </section>
  </div>;
}

/** Interviews list. A row opens that meeting's capture screen. Attach asks for the client first. */
function InterviewsPage({ path, go }: { path: string; go: (target: string) => void; notify: (message: string) => void }) {
  const store = useCSSI();
  const [syncing, setSyncing] = useState(false);
  const [attachId, setAttachId] = useState("");
  const [client, setClient] = useState("");
  const [year, setYear] = useState("");
  const callId = path.split("/")[2];
  const call = store.interviews.find((item) => item.id === callId);
  if (callId && callId !== "schedule" && call) return <CaptureScreen call={call} go={go} />;
  const attached = store.interviews.find((item) => item.id === attachId);
  /** Syncs the calendar, shows progress, then replaces the last-synced time. */
  const sync = () => {
    if (syncing) return;
    setSyncing(true);
    window.setTimeout(() => {
      setSyncing(false);
      store.setSyncLabel("Synced just now");
    }, 900);
  };
  /** Opens the attach form for this meeting. Linked rows use Open instead. */
  const beginAttach = (meeting: Interview) => {
    setAttachId(meeting.id);
    setClient(meeting.client);
    setYear(meeting.taxYear ?? "");
  };
  /** Saves the client and tax year, then opens that meeting's capture status. */
  const confirmAttach = () => {
    if (!attached || !client.trim() || !year.trim()) return;
    store.updateInterview(attached.id, { client: client.trim(), taxYear: year.trim() });
    setAttachId("");
    go(`/interviews/${attached.id}`);
  };
  const lastSynced = store.syncLabel === "Synced just now" ? "Synced just now" : `Last synced ${store.syncLabel}`;
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex gap-2">
        <AppButton onClick={() => go("/interviews/schedule")}><CalendarPlus size={15} />Schedule</AppButton>
        <AppButton variant="secondary" onClick={sync}><RefreshCw size={15} className={syncing ? "animate-spin" : ""} />{syncing ? "Syncing" : "Sync"}</AppButton>
      </div>
      <p className="text-xs text-muted-foreground">Outlook · Next 14 days · {lastSynced}</p>
    </div>
    {syncing && <progress aria-label="Sync progress" className="h-1.5 w-full" />}
    <section className="surface overflow-auto p-2">
      <table className="workspace-table min-w-[730px]">
        <thead><tr>{["Meeting", "Client", "Date", "Interviewer", "Platform", "Status", ""].map((item) => <th key={item || "action"}>{item}</th>)}</tr></thead>
        <tbody>{store.interviews.map((meeting) => <tr key={meeting.id} className="cursor-pointer" onClick={() => go(`/interviews/${meeting.id}`)}>
          <td className="font-semibold text-navy">{meeting.title}</td>
          <td>{meeting.client}</td>
          <td>{meeting.when}</td>
          <td>{meeting.owner}</td>
          <td>{meeting.platform}</td>
          <td><Status value={meeting.status} /></td>
          <td className="text-right">{meeting.status === "Linked" && meeting.engagementId
            ? <button type="button" className="font-bold text-mint" onClick={(event) => { event.stopPropagation(); go(`/engagements/${meeting.engagementId}`); }}>Open ›</button>
            : <button type="button" className="font-bold text-mint" onClick={(event) => { event.stopPropagation(); beginAttach(meeting); }}>Attach ›</button>}
          </td>
        </tr>)}</tbody>
      </table>
    </section>
    {attached && <div className="fixed inset-0 z-40 grid place-items-center bg-navy/20 p-4">
      <div className="surface w-full max-w-md space-y-4 p-6">
        <div className="flex items-center justify-between"><h2 className="text-base font-bold text-navy">Attach interview</h2><button type="button" onClick={() => setAttachId("")} aria-label="Close"><X size={17} /></button></div>
        <Field label="Client"><input className="workspace-input" value={client} onChange={(event) => setClient(event.target.value)} /></Field>
        <Field label="Tax year"><input className="workspace-input" value={year} onChange={(event) => setYear(event.target.value)} placeholder="2025" /></Field>
        <div className="flex justify-end gap-2">
          <AppButton variant="secondary" onClick={() => setAttachId("")}>Cancel</AppButton>
          <AppButton disabled={!client.trim() || !year.trim()} onClick={confirmAttach}>Attach</AppButton>
        </div>
      </div>
    </div>}
  </div>;
}

/** Schedule form. Create books Zoom, links a Scheduled engagement, and opens Detected capture. */
function ScheduleInterview({ go, notify }: { go: (target: string) => void; notify: (message: string) => void }) {
  const { records, setRecords, addInterview } = useCSSI();
  const [client, setClient] = useState("");
  const [year, setYear] = useState("");
  const [interviewer, setInterviewer] = useState("J. Smith");
  const [owner, setOwner] = useState("J. Smith");
  const [start, setStart] = useState("Later");
  const [date, setDate] = useState("2026-09-24");
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState("90 minutes");
  const [attendees, setAttendees] = useState("");
  const [pause, setPause] = useState(true);
  const [error, setError] = useState("");
  /** Checks the required fields, then stores the engagement and the detected meeting together. */
  const create = () => {
    const missing = scheduleMissing({ client, taxYear: year, start, date, time });
    if (missing.length) {
      setError(`${missing.join(" and ")} ${missing.length === 1 ? "is" : "are"} required.`);
      return;
    }
    const engagementId = `sched-${Date.now()}`;
    const meetingId = `meet-${Date.now()}`;
    const meeting: Interview = {
      id: meetingId,
      title: "R&D Interview",
      client: client.trim(),
      when: scheduledWhen(date, time, start === "Start now"),
      owner: interviewer.trim() || "J. Smith",
      platform: "Zoom",
      status: "Linked",
      phase: "detected",
      engagementId,
      taxYear: year.trim(),
    };
    setRecords([{ id: engagementId, client: client.trim(), years: year.trim(), capture: "Automatic", status: "Scheduled", stage: "Scheduled", date: fmtDate(), owner: owner.trim() || "J. Smith", projects: [] }, ...records]);
    addInterview(meeting);
    notify("Interview scheduled");
    go(`/interviews/${meetingId}`);
  };
  return <div className="space-y-5">
    <button type="button" onClick={() => go("/interviews")} className="text-xs text-muted-foreground">‹ Interviews</button>
    <div className="flex flex-wrap gap-2">
      <Status value="Calendar Connected" />
      <Status value="Zoom Connected" />
      <span className="flex items-center gap-1"><Status value="Fathom Check" /><IconInfo text="If Fathom is not on this calendar, the interview is not recorded." /></span>
    </div>
    <section className="surface space-y-5 p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Client *"><input className="workspace-input" value={client} onChange={(event) => setClient(event.target.value)} /></Field>
        <Field label="Tax year *"><input className="workspace-input" value={year} onChange={(event) => setYear(event.target.value)} /></Field>
        <Field label="Interviewer"><input className="workspace-input" value={interviewer} onChange={(event) => setInterviewer(event.target.value)} /></Field>
        <Field label="Owner"><input className="workspace-input" value={owner} onChange={(event) => setOwner(event.target.value)} /></Field>
      </div>
      <div>
        <span className="text-xs font-semibold text-navy">Meeting</span>
        <div className="mt-2 flex gap-2">{["Later", "Start now"].map((value) => <button type="button" key={value} onClick={() => setStart(value)} className={`choice-button ${start === value ? "selected" : ""}`}>{value}</button>)}</div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Date"><input className="workspace-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></Field>
        <Field label="Time"><input className="workspace-input" type="time" value={time} onChange={(event) => setTime(event.target.value)} /></Field>
        <Field label="Duration"><select className="workspace-input" value={duration} onChange={(event) => setDuration(event.target.value)}><option>90 minutes</option><option>60 minutes</option></select></Field>
      </div>
      <Field label="Attendees"><input className="workspace-input" value={attendees} onChange={(event) => setAttendees(event.target.value)} placeholder="Add attendees" /></Field>
      <Field label="Platform"><input className="workspace-input" value="Zoom" readOnly aria-readonly="true" /></Field>
      <label className="flex items-center gap-2 text-xs text-navy"><input type="checkbox" checked={pause} onChange={() => setPause((current) => !current)} className="accent-mint" />Pause after qualification</label>
      {error && <p className="text-xs text-negative">{error}</p>}
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
        <AppButton variant="secondary" onClick={() => go("/interviews")}>Use calendar instead</AppButton>
        <AppButton variant="secondary" onClick={() => go("/interviews")}>Cancel</AppButton>
        <AppButton onClick={create}><CalendarPlus size={15} />Create</AppButton>
        <IconInfo text="Creates the Zoom meeting and the calendar event. The agent does not join." />
      </div>
    </section>
  </div>;
}

/** One capture screen. The status changes; the agent never joins the meeting. */
function CaptureScreen({ call, go }: { call: Interview; go: (target: string) => void }) {
  const { records, setRecords, updateInterview } = useCSSI();
  const phase = call.phase;
  const logs = captureLog(phase);
  const advance = captureAdvanceLabel(phase);
  /** Moves the same screen to the next capture status. */
  const goNext = () => {
    const next = advanceCapture(phase);
    if (next === "complete") finish();
    else updateInterview(call.id, { phase: next });
  };
  /** Creates the engagement, or promotes the scheduled one, once both files are in. */
  const finish = () => {
    const existing = call.engagementId ? records.find((record) => record.id === call.engagementId) : undefined;
    if (existing?.status === "Scheduled") {
      setRecords(records.map((record) => record.id === existing.id ? { ...record, status: "Ready to run", stage: "Inputs validated", capture: "Automated" } : record));
      updateInterview(call.id, { phase: "complete", engagementId: existing.id, status: "Linked" });
      return;
    }
    const id = `captured-${call.id}`;
    if (!records.some((record) => record.id === id)) {
      setRecords([{ id, client: call.client, years: call.taxYear || "2025", capture: "Automated", status: "Ready to run", stage: "Inputs validated", date: fmtDate(), owner: call.owner, projects: [] }, ...records]);
    }
    updateInterview(call.id, { phase: "complete", engagementId: id, status: "Linked" });
  };
  const engagementId = call.engagementId ?? "";
  return <div className="space-y-5">
    <section className="surface p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Status value={captureBadge(phase)} />
        {phase === "complete" && <h2 className="text-sm font-bold text-navy">Engagement created</h2>}
      </div>
      <h3 className="mt-4 text-lg font-bold text-navy">{phase === "complete" ? `${call.client} engagement` : "Capture"}</h3>
      <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-4">
        <div><dt className="text-muted-foreground">Meeting</dt><dd className="mt-1 font-semibold text-navy">{call.title}</dd></div>
        <div><dt className="text-muted-foreground">Time</dt><dd className="mt-1 font-semibold text-navy">{call.when}</dd></div>
        <div><dt className="text-muted-foreground">Organizer</dt><dd className="mt-1 font-semibold text-navy">{call.owner}</dd></div>
        <div><dt className="text-muted-foreground">Platform</dt><dd className="mt-1 font-semibold text-navy">{call.platform}</dd></div>
      </dl>
      <div className="mt-7 grid gap-2 sm:grid-cols-5">{capturePipeline().map((label, index) => {
        const mark = captureStepMark(index, phase);
        const circle = mark === "failed" ? "bg-negative text-card" : mark === "done" ? "bg-mint text-card" : mark === "current" ? "bg-teal text-card" : "bg-secondary text-muted-foreground";
        return <div key={label} className="flex items-center gap-2 text-[10px]" aria-label={`${label}, ${mark}`}>
          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${circle}`}>{mark === "failed" ? <X size={13} /> : mark === "done" ? <Check size={13} /> : index + 1}</span>
          <span className={mark === "waiting" ? "text-muted-foreground" : "font-semibold text-navy"}>{label}</span>
        </div>;
      })}</div>
      <div className="mt-6 space-y-2 rounded-xl bg-secondary/50 p-4">
        {logs.map((row) => <div key={row.label} className="flex items-center gap-2 text-xs">
          <Clock3 size={15} className={row.mark === "failed" ? "text-negative" : "text-navy"} />
          <span className={row.mark === "failed" ? "font-semibold text-negative" : "font-semibold text-navy"}>{row.label}</span>
          <span className="text-muted-foreground">{captureLogStatus(row.mark)}</span>
          {phase === "detected" && row.label === "Waiting for Zoom" && <IconInfo text="Fathom records when Zoom starts. This tool does not join." />}
          {phase === "retrieving" && row.label === "Fetching transcript" && <IconInfo text="The engagement waits until the transcript and summary are both in." />}
        </div>)}
        {phase === "complete" && <p className="pt-2 text-xs text-muted-foreground">{engagementId} · Automated · Transcript · Summary</p>}
        {phase === "complete" && <p className="text-xs text-muted-foreground">Fallback · Not used</p>}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
        {phase === "failed" && <AppButton onClick={() => { rememberFailedCapture(call.client); go("/engagements/new"); }}>Continue manually</AppButton>}
        {phase === "complete" && <AppButton onClick={() => go(`/engagements/${engagementId}`)}>Open engagement</AppButton>}
        {advance && <div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Next event</span>
          {phase === "retrieving" && <AppButton variant="secondary" onClick={() => updateInterview(call.id, { phase: "failed" satisfies CapturePhase })}>Simulate retrieval failure</AppButton>}
          <AppButton onClick={goNext}>{advance}</AppButton>
        </div>}
      </div>
    </section>
  </div>;
}

/** Admin. Connector toggles, run settings, and the R. Lee wage preview stay for this session. */
function AdminPage(_props: { notify: (message: string) => void }) {
  const { users, updateUser, settings, setSettings, viewAsLee, setViewAsLee } = useCSSI();
  const [selected, setSelected] = useState("");
  const member = users.find((user) => user.name === selected);
  const connectors = [
    ["Microsoft 365", "Connected"],
    ["Zoom", "Connected"],
    ["Fathom", "Connected"],
  ] as const;
  return <div className="space-y-5">
    <section className="surface overflow-auto p-2">
      <table className="workspace-table min-w-[650px]">
        <thead><tr><th>User</th><th>Role</th><th>Connectors</th><th></th></tr></thead>
        <tbody>{users.map((user) => <tr key={user.name}>
          <td className="font-semibold text-navy">{user.name}</td>
          <td>{user.role}</td>
          <td>{connectorSummary(user)}</td>
          <td className="text-right"><button type="button" className="font-bold text-mint" onClick={() => setSelected(user.name)}>Manage ›</button></td>
        </tr>)}</tbody>
      </table>
    </section>
    <section className="surface p-5">
      <div className="flex items-center gap-2"><SectionTitle title="Connectors" /><IconInfo text="Microsoft and Zoom are per person. Fathom can be team or individual." /></div>
      <div className="mt-4 flex flex-wrap gap-2">{connectors.map(([name, status]) => <span key={name} className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-navy">{name}<Status value={status} /></span>)}</div>
    </section>
    <section className="surface p-5">
      <SectionTitle title="Run settings" />
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Confidence"><input className="workspace-input" value={settings.confidence} onChange={(event) => setSettings({ confidence: event.target.value })} /></Field>
        <Field label={<span className="flex items-center gap-2">Flagging<IconInfo text="Flags missing evidence. It is not a confidence score." /></span>}><input className="workspace-input" value={settings.flagging} onChange={(event) => setSettings({ flagging: event.target.value })} /></Field>
        <Field label="Checkpoint"><input className="workspace-input" value={settings.checkpoint} onChange={(event) => setSettings({ checkpoint: event.target.value })} /></Field>
        <Field label={<span className="flex items-center gap-2">Retention<IconInfo text="Generated files expire. The trace remains." /></span>}><input className="workspace-input" value={settings.retention} onChange={(event) => setSettings({ retention: event.target.value })} /></Field>
        <Field label="Max steps"><input className="workspace-input" value={settings.maxSteps} onChange={(event) => setSettings({ maxSteps: event.target.value })} /></Field>
        <Field label="Cost budget"><input className="workspace-input" value={settings.costBudget} onChange={(event) => setSettings({ costBudget: event.target.value })} /></Field>
      </div>
    </section>
    <section className="surface flex flex-wrap items-center justify-between gap-4 p-5">
      <Field label={<span className="flex items-center gap-2">Wage access <IconInfo text="Others still see the engagement and the narrative. Wage files and the QRE stay with the owner." /></span>}>
        <select className="workspace-input" value={settings.wageAccess} onChange={(event) => setSettings({ wageAccess: event.target.value })}>
          <option>Engagement lead only</option>
          <option>All team members</option>
        </select>
      </Field>
      <label className="flex items-center gap-2 text-xs font-semibold text-navy"><input type="checkbox" checked={viewAsLee} onChange={() => setViewAsLee(!viewAsLee)} className="accent-mint" />View as R. Lee</label>
    </section>
    {member && <div className="fixed inset-0 z-40 flex justify-end bg-navy/20">
      <aside className="surface h-full w-full max-w-sm space-y-5 overflow-auto rounded-none p-6">
        <div className="flex justify-between"><h2 className="text-lg font-bold text-navy">{member.name}</h2><button type="button" aria-label="Close" onClick={() => setSelected("")}><X size={18} /></button></div>
        <Field label="Role">
          <select className="workspace-input" value={member.role} onChange={(event) => updateUser(member.name, { role: event.target.value })}>
            <option>Team member</option>
            <option>Administrator</option>
          </select>
        </Field>
        <IconInfo text="Without Fathom, interviews are not captured. Manual engagements still work." />
        {(["calendar", "zoom", "fathom"] as const).map((service) => <div className="flex items-center justify-between border-b border-border py-3 text-sm" key={service}>
          <span className="capitalize">{service}</span>
          <span className="flex items-center gap-3 text-xs text-muted-foreground">{member[service] ? "Connected" : "Not connected"}<Switch checked={member[service]} onCheckedChange={(checked) => updateUser(member.name, { [service]: checked })} aria-label={`${service} for ${member.name}`} /></span>
        </div>)}
      </aside>
    </div>}
  </div>;
}
