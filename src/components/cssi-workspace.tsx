import { useMemo, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Activity, AlertCircle, AlertTriangle, ArrowLeft, ArrowRight, BarChart3, Bell, CalendarDays,
  CalendarPlus, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleHelp,
  ClipboardCheck, Clock3, Download, FileCheck, FileText, FileUp, GitBranch, Grid2X2,
  LayoutDashboard, Link2, List, LockKeyhole, LogOut, Menu, MessageSquareText, Pencil,
  Play, Plus, RefreshCw, Search, Send, Settings2, ShieldCheck, SlidersHorizontal,
  Sparkles, Upload, UserRound, Wallet, X, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCSSI } from "@/lib/cssi-store";
import { engagements as seededEngagements, recentActivity, type Engagement, type Project } from "@/lib/cssi-seed-data";
import { calculateVerdict, qualifiedWages, type Verdict } from "@/lib/qualification";

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
const runSteps = ["Read summary", "Parse transcript", "Qualify projects", "Checkpoint", "Write narratives", "Extract wages", "Map QRE", "Assemble draft"];

function IconInfo({ text }: { text: string }) {
  return <span tabIndex={0} className="tooltip-trigger" aria-label={text}><CircleHelp size={15} /><span className="tooltip-content">{text}</span></span>;
}

function Status({ value }: { value: string }) {
  const tone = /Eligible|Ready|Met|Confirmed|Connected|Finalized|Complete|Verified|Included/i.test(value)
    ? "" : /Review|Attention|Pending|held|Draft|Insufficient|Warning|Not linked/i.test(value)
      ? "warning" : /Ineligible|Failed|Blocked|Not met|Refused|Excluded/i.test(value)
        ? "negative" : /Running|Recording|Retrieving|Progress/i.test(value) ? "progress" : "neutral";
  const Icon = tone === "negative" ? X : tone === "warning" ? AlertCircle : tone === "progress" ? Activity : Check;
  return <span className={`status-badge ${tone}`}><Icon size={13} strokeWidth={2.4} />{value}</span>;
}

function AppButton({ children, onClick, variant = "default", className = "", disabled, title }: {
  children: React.ReactNode; onClick?: () => void; variant?: "default" | "secondary" | "outline" | "ghost" | "link"; className?: string; disabled?: boolean; title?: string;
}) {
  return <Button variant={variant} disabled={disabled} title={title} className={`workspace-button ${className}`} onClick={onClick}>{children}</Button>;
}

function fmtDate() { return "Sep 28, 2026"; }

export function SignIn() {
  const { setSignedIn } = useCSSI();
  const [authError, setAuthError] = useState(false);
  const navigate = useNavigate();
  const enter = () => { setAuthError(false); setSignedIn(true); void navigate({ to: "/$", params: { _splat: "dashboard" } }); };
  return <main className="min-h-screen grid place-items-center p-6">
    <section className="login-panel surface">
      <div className="login-brand">
        <div className="relative z-10 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-mint text-xl font-extrabold text-mint-foreground">C</span>
          <span className="text-lg font-bold">CSSI AI Agent</span>
        </div>
        <h1 className="relative z-10 max-w-[290px] text-3xl font-bold leading-tight">R&amp;D tax credit workspace.</h1>
        <span className="relative z-10 text-xs font-medium text-white/75">Internal use only</span>
      </div>
      <div className="login-form">
        <div className="w-full max-w-[340px]">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold text-mint">Welcome back</p>
            <h2 className="mt-2 text-3xl font-bold text-navy">Sign in</h2>
          </div>
          {authError ? <div className="mb-4 flex items-center justify-center gap-2 text-sm text-negative">Sign-in could not be completed. <IconInfo text="Contact the CSSI workspace administrator." /></div> : null}
          <div className="flex items-center gap-3">
            <AppButton onClick={enter} className="h-12 flex-1"><span className="grid h-5 w-5 place-items-center rounded-sm bg-card text-[11px] font-extrabold text-mint">M</span>Continue with Microsoft</AppButton>
            <IconInfo text="Uses your CSSI Microsoft account. Only your tenant can sign in." />
          </div>
          <AppButton variant="link" className="mx-auto mt-5 flex text-xs font-medium text-muted-foreground" onClick={() => setAuthError((current) => !current)}>Show authentication error</AppButton>
        </div>
      </div>
    </section>
  </main>;
}

export function Workspace() {
  const path = useRouterState({ select: (router) => router.location.pathname });
  const store = useCSSI();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [authRedirected, setAuthRedirected] = useState(false);
  const go = (target: string) => {
    const clean = target.replace(/^\/+|\/+$/g, "");
    if (!clean) void navigate({ to: "/" });
    else void navigate({ to: "/$", params: { _splat: clean } });
  };
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2600); };
  const url = (to: string) => ({ to: "/$" as const, params: { _splat: to.replace(/^\/+/, "") } });
  const signedIn = store.signedIn || path === "/dashboard";
  if (path === "/") return <SignIn />;
  if (!signedIn && !authRedirected) {
    setAuthRedirected(true);
    return <SignIn />;
  }

  const isDashboard = path === "/dashboard";
  const title = getPageTitle(path, store.getEngagement);
  const engageMatch = path.match(/^\/engagements\/([^/]+)/);
  const engagement = engageMatch ? store.getEngagement(engageMatch[1] ?? "pioneer") : undefined;
  const focusMode = path.includes("/editor") || path.includes("/verified");
  const filtered = store.records.filter((record) => record.client.toLowerCase().includes(search.toLowerCase()));
  const currentSection = isDashboard ? "Dashboard" : path.startsWith("/admin") ? "Admin" : path.startsWith("/interviews") ? "Interviews" : "Engagements";

  if (focusMode) return <EditorScreen engagement={engagement ?? store.getEngagement("pioneer")} locked={path.includes("verified") || store.locked} go={go} notify={notify} />;

  return <div className={`app-frame ${isDashboard ? "with-rail" : ""}`}>
    <aside className="sidebar">
      <div className={`sidebar-brand flex items-center gap-3 px-5 py-6 ${collapsed ? "justify-center px-2" : ""}`}>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint text-lg font-extrabold text-mint-foreground">C</span>
        <span className="sidebar-brand-text text-[15px] font-bold text-navy">CSSI AI Agent</span>
        <Button variant="ghost" size="icon" aria-label="Collapse navigation" className="ml-auto h-8 w-8 text-muted-foreground" onClick={() => setCollapsed(!collapsed)}><Menu size={17} /></Button>
      </div>
      <nav className={`flex flex-1 flex-col gap-1 px-4 pt-4 ${collapsed ? "items-center px-2" : ""}`}>
        {navItems.map(({ label, icon: Icon, path: target }) => {
          const active = label === "Dashboard" ? path === target : path.startsWith(target) || (label === "Engagements" && path.startsWith("/engagements/"));
          return <Link key={label} to={url(target).to} params={url(target).params} data-active={active} aria-label={label} title={collapsed ? label : undefined} className={`nav-link ${collapsed ? "!w-12 !justify-center !px-0" : ""}`}><Icon size={18} strokeWidth={1.9} />{!collapsed && <span className="sidebar-nav-label">{label}</span>}</Link>;
        })}
      </nav>
      <button type="button" className={`sidebar-footer mx-3 mb-4 mt-auto flex items-center gap-3 rounded-xl px-3 py-4 text-left hover:bg-secondary ${collapsed ? "justify-center px-0" : ""}`} onClick={() => { store.setSignedIn(false); go("/"); }} title="Sign out">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-mint text-xs font-bold text-mint-foreground">JS</span>
        {!collapsed && <span className="sidebar-footer-text min-w-0 flex-1"><span className="block text-[11px] text-muted-foreground">Welcome,</span><span className="block truncate text-xs font-semibold text-navy">{currentSection === "Admin" ? "Administrator" : "J. Smith"}</span></span>}
        {!collapsed && <ChevronDown size={15} className="text-muted-foreground" />}
      </button>
    </aside>

    <main className="app-main min-w-0 overflow-x-hidden">
      <div className="content-width">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-[26px] font-bold leading-tight text-navy">{title}</h1>
          <div className="search-pill order-3 mx-auto md:order-none md:mx-0"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search engagements" aria-label="Search engagements" /><Search size={17} /></div>
          {!isDashboard && <ProfileChip />}
        </header>
        {engagement && !focusMode && <EngagementNav engagement={engagement} path={path} go={go} />}
        {renderScreen({ path, search, records: filtered, engagement, go, notify })}
      </div>
    </main>

    {isDashboard && <DashboardRail go={go} notify={notify} />}
    {toast && <div role="status" className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-card shadow-lg"><Check size={16} />{toast}</div>}
  </div>;
}

function ProfileChip() {
  return <div className="flex items-center gap-2 rounded-full bg-card px-2 py-1.5"><span className="h-2.5 w-2.5 rounded-full bg-mint"/><span className="text-xs font-semibold text-navy">J. Smith</span><span className="grid h-8 w-8 place-items-center rounded-full bg-mint text-[10px] font-bold text-mint-foreground">JS</span></div>;
}

function EngagementNav({ engagement, path, go }: { engagement: Engagement; path: string; go: (target: string) => void }) {
  const base = `/engagements/${engagement.id}`;
  const suffix = path.slice(base.length);
  return <div className="mb-6">
    <div className="flex flex-wrap gap-2 border-b border-border">
      {tabs.map(({ label, icon: Icon, suffix: tabSuffix }) => {
        const active = suffix === tabSuffix || (!suffix && !tabSuffix);
        return <button type="button" className={`engagement-tab ${active ? "active" : ""}`} key={label} onClick={() => go(`${base}${tabSuffix}`)}><Icon size={16} />{label}</button>;
      })}
    </div>
    <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground"><button type="button" className="hover:text-navy" onClick={() => go("/engagements")}>Engagements</button><ChevronRight size={13}/><button type="button" className="hover:text-navy" onClick={() => go(base)}>{engagement.client}</button>{suffix && <><ChevronRight size={13}/><span>{suffix.split("/").filter(Boolean).at(-1)?.replaceAll("-", " ")}</span></>}</div>
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
  if (path.includes("/run/trace")) return "Trace";
  if (path.includes("/run")) return "Run";
  if (path.includes("/draft")) return "Draft";
  if (path.includes("/report")) return "Report";
  if (path.includes("/revision")) return "Revision";
  const id = path.split("/")[2] ?? "pioneer";
  return getEngagement(id).client;
}

function renderScreen(props: { path: string; search: string; records: Engagement[]; engagement?: Engagement; go: (target: string) => void; notify: (message: string) => void }) {
  const { path, records, engagement, go, notify } = props;
  if (path === "/dashboard") return <Dashboard go={go} notify={notify} />;
  if (path === "/engagements") return <EngagementList records={records} go={go} notify={notify} />;
  if (path === "/engagements/new") return <NewEngagement go={go} notify={notify} />;
  if (path.startsWith("/interviews/schedule")) return <ScheduleInterview go={go} notify={notify} />;
  if (path.startsWith("/interviews")) return <InterviewsPage path={path} go={go} notify={notify} />;
  if (path.startsWith("/admin")) return <AdminPage notify={notify} />;
  if (!engagement) return <EngagementList records={records} go={go} notify={notify} />;
  if (path.includes("/qualification/") && path.includes("/qualification/")) return <ProjectConfirmation engagement={engagement} path={path} go={go} notify={notify} />;
  if (path.includes("/qualification")) return <QualificationCheckpoint engagement={engagement} go={go} notify={notify} />;
  if (path.includes("/run/trace")) return <TraceScreen engagement={engagement} go={go} />;
  if (path.includes("/run")) return <RunScreen engagement={engagement} go={go} notify={notify} />;
  if (path.includes("/draft")) return <DraftScreen engagement={engagement} go={go} notify={notify} />;
  if (path.includes("/verified")) return <VerifiedScreen engagement={engagement} go={go} notify={notify} />;
  if (path.includes("/revision")) return <RevisionScreen engagement={engagement} go={go} notify={notify} />;
  if (path.includes("/report")) return <ReportScreen engagement={engagement} go={go} notify={notify} />;
  return <EngagementOverview engagement={engagement} go={go} notify={notify} />;
}

function Dashboard({ go, notify }: { go: (target: string) => void; notify: (message: string) => void }) {
  const cards = [
    { label: "Interviews today", value: "1", icon: CalendarDays, tone: "" as const, target: "/interviews" },
    { label: "Needs attention", value: "1", icon: AlertCircle, tone: "warning" as const, target: "/interviews/delta-call" },
    { label: "Awaiting review", value: "1", icon: ClipboardCheck, tone: "" as const, target: "/engagements/acme/draft" },
  ];
  const [filter, setFilter] = useState("");
  return <div className="space-y-5">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map(({ label, value, icon: Icon, tone, target }) => <button type="button" onClick={() => go(target)} key={label} className="surface surface-hover stat-tile text-left"><span className={`icon-tile ${tone}`}><Icon size={19}/></span><span><span className="block text-xs text-muted-foreground">{label}</span><span className="mt-1 block text-[26px] font-bold leading-none text-navy">{value}</span></span></button>)}
    </div>
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.4fr_0.82fr]">
      <section className="surface min-h-[266px] p-5">
        <div className="mb-5 flex items-center justify-between"><h2 className="text-[15px] font-bold text-navy">Engagements by status</h2><button type="button" aria-label="More status options" className="text-muted-foreground"><ChevronDown size={16}/></button></div>
        <div className="flex flex-wrap items-center justify-center gap-8">
          <div className="relative"><div className="donut"/><div className="absolute inset-0 grid place-items-center"><span className="text-lg font-bold text-navy">5</span></div><span className="absolute -right-2 top-4 rounded-lg bg-card px-2 py-1 text-[10px] text-navy shadow-md">Ready · 1</span></div>
          <div className="grid gap-3 text-xs text-muted-foreground">
            {["Ready to run", "Running", "Review required", "Needs attention", "Finalized"].map((label, index) => <button type="button" key={label} className="flex items-center gap-2 text-left hover:text-navy" onClick={() => { setFilter(label); go(`/engagements?status=${encodeURIComponent(label)}`); }}><span className={`h-2.5 w-2.5 rounded-sm ${["bg-purple-500", "bg-teal", "bg-mint", "bg-warning", "bg-sky-500"][index]}`}/>{label}<span className="ml-auto font-semibold text-navy">1</span></button>)}
          </div>
        </div>
      </section>
      <button type="button" onClick={() => go("/engagements")} className="surface surface-hover teal-card min-h-[266px] p-6 text-left">
        <span className="text-xs text-white/75">Open engagements</span><span className="mt-3 block text-4xl font-bold">4</span>
        <span className="mt-6 grid grid-cols-2 gap-4 border-t border-white/15 pt-4 text-xs"><span><span className="block text-white/65">Tax years</span><b className="mt-1 block text-sm">2024–2025</b></span><span><span className="block text-white/65">Interviews this week</span><b className="mt-1 block text-sm">3</b></span></span>
      </button>
    </div>
    <section className="surface p-5">
      <div className="mb-3 flex items-center justify-between"><h2 className="text-[15px] font-bold text-navy">Interviews &amp; reviews</h2><button className="rounded-full bg-secondary px-3 py-1.5 text-[11px] font-semibold text-navy">7 days <ChevronDown size={13} className="ml-1 inline"/></button></div>
      <Chart />
    </section>
    {filter && <span className="sr-only">{filter}</span>}
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
  return <aside className="app-rail">
    <div className="mb-5 flex justify-end"><ProfileChip/></div>
    <button type="button" onClick={() => go("/engagements/pioneer/draft")} className="highlight-card surface surface-hover mb-7 w-full rounded-[20px] p-5 text-left">
      <span className="relative z-10 text-[11px] text-white/75">Draft QRE</span><span className="relative z-10 mt-3 block text-3xl font-bold">$70,300</span><span className="relative z-10 mt-2 block text-[11px] text-white/75">Pioneer Systems · not yet verified</span>
    </button>
    <div className="mb-7">
      <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-bold text-navy">Needs attention</h2><button type="button" className="text-xs font-semibold text-orange-500" onClick={() => go("/engagements")}>See all</button></div>
      {recentActivity.map((item, index) => <button type="button" key={item.title} className="activity-row w-full text-left" onClick={() => go(index === 0 ? "/interviews/delta-call" : index === 1 ? "/engagements/pioneer/qualification" : "/engagements/acme/draft")}><span className={`activity-icon ${item.tone === "negative" ? "negative" : "warning"}`}><AlertCircle size={16}/></span><span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-semibold text-navy">{item.title}</span><span className="mt-1 block truncate text-[10px] text-muted-foreground">{item.subtitle}</span></span><span className="text-[10px] text-muted-foreground">{item.date}</span></button>)}
    </div>
    <div>
      <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-bold text-navy">Upcoming interviews</h2><button type="button" className="text-xs font-semibold text-orange-500" onClick={() => go("/interviews")}>See all</button></div>
      {[
        ["Today · 10:00 AM", "Acme Manufacturing", "Zoom · Detected", "/interviews/acme-call"],
        ["Sep 26 · 2:00 PM", "Northstar Labs", "Zoom · Linked", "/interviews/northstar-call"],
        ["Oct 01 · 11:30 AM", "Delta Fabrication", "Zoom · Not linked", "/interviews/delta-call"],
      ].map(([date, client, detail, target]) => <button key={client} type="button" className="activity-row w-full text-left" onClick={() => go(target ?? "/interviews")}><span className="activity-icon"><CalendarDays size={15}/></span><span className="min-w-0 flex-1"><span className="block text-[10px] text-muted-foreground">{date}</span><span className="block truncate text-[11px] font-semibold text-navy">{client}</span><span className="block text-[10px] text-muted-foreground">{detail}</span></span></button>)}
    </div>
  </aside>;
}

function EngagementList({ records, go, notify }: { records: Engagement[]; go: (target: string) => void; notify: (message: string) => void }) {
  const [status, setStatus] = useState("All statuses");
  const filtered = status === "All statuses" ? records : records.filter((record) => record.status === status);
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><select className="workspace-input !h-10 !min-h-10 w-auto pr-8" value={status} onChange={(event) => setStatus(event.target.value)}><option>All statuses</option>{seededEngagements.map((record) => <option key={record.id}>{record.status}</option>)}</select><select className="workspace-input !h-10 !min-h-10 w-auto pr-8" defaultValue="All tax years"><option>All tax years</option><option>2025</option><option>2024</option></select></div><div className="flex gap-2"><AppButton variant="secondary" onClick={() => go("/interviews/schedule")}><CalendarPlus size={16}/>Schedule interview</AppButton><AppButton onClick={() => go("/engagements/new")}><Plus size={17}/>New manual engagement</AppButton></div></div>
    {filtered.length ? filtered.map((record) => <EngagementCard key={record.id} record={record} go={go} notify={notify}/>) : <EmptyState text="No engagements match these filters." action="Clear filters" onClick={() => setStatus("All statuses")}/>}
  </div>;
}

function EngagementCard({ record, go, notify }: { record: Engagement; go: (target: string) => void; notify: (message: string) => void }) {
  const tone = record.status === "Needs attention" ? "negative" : /Review/.test(record.status) ? "warning" : "";
  const action = record.id === "northstar" ? "View run" : record.id === "delta" ? "Fix inputs" : record.id === "cronus" ? "Download PDF" : "Open project";
  const target = record.id === "northstar" ? `/engagements/${record.id}/run` : record.id === "delta" ? "/interviews/delta-call" : record.id === "acme" ? `/engagements/${record.id}/draft` : record.id === "cronus" ? `/engagements/${record.id}/report` : `/engagements/${record.id}`;
  return <article className={`surface surface-hover engagement-card ${tone}`}>
    <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex min-w-0 items-start gap-3"><span className="rounded-lg bg-secondary px-2.5 py-1.5 text-xs font-bold text-navy">{record.id === "pioneer" ? "03" : record.id === "acme" ? "01" : record.id === "northstar" ? "02" : "04"}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="text-[15px] font-bold text-navy">{record.client}</h2><Status value={record.status}/></div><p className="mt-2 text-xs text-muted-foreground">{record.years} · {record.capture} · {record.owner}</p></div></div><div className="flex items-center gap-5"><span className="text-xs text-muted-foreground">{record.date}</span><button type="button" onClick={() => record.id === "cronus" ? (go(target), notify("Download ready")) : go(target)} className="flex items-center gap-1 text-xs font-bold text-mint">{action}<ArrowRight size={14}/></button></div></div>
    <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><Activity size={15}/>{record.stage}</div>
  </article>;
}

function EmptyState({ text, action, onClick }: { text: string; action?: string; onClick?: () => void }) {
  return <div className="surface flex min-h-52 flex-col items-center justify-center gap-3 p-8 text-center"><span className="icon-tile neutral"><Search size={18}/></span><p className="text-sm text-muted-foreground">{text}</p>{action && <AppButton variant="link" className="text-mint" onClick={onClick}>{action}</AppButton>}</div>;
}

function NewEngagement({ go, notify }: { go: (target: string) => void; notify: (message: string) => void }) {
  const { records, setRecords } = useCSSI();
  const [client, setClient] = useState(""); const [taxYear, setTaxYear] = useState("");
  const [transcript, setTranscript] = useState(""); const [summary, setSummary] = useState("");
  const [mode, setMode] = useState({ transcript: "Upload", summary: "Upload" });
  const [profile, setProfile] = useState(false); const [profileData, setProfileData] = useState(["Pioneer Systems, Inc.", "Industrial equipment manufacturing", "S Corporation", "Thermal control assemblies", "Founder-owned"]);
  const complete = client.trim() && taxYear.trim() && transcript && summary;
  const fileChange = (event: React.ChangeEvent<HTMLInputElement>, setter: (value: string) => void) => { const file = event.target.files?.[0]; if (!file) return; if (!/\.(txt|pdf|docx|doc)$/i.test(file.name)) { notify("This file type is not supported."); return; } setter(file.name); };
  const create = () => { if (!complete) return; const id = `manual-${Date.now()}`; const record: Engagement = { id, client, years: taxYear, capture: "Manual", status: "Ready to run", stage: "Inputs validated", date: fmtDate(), owner: "J. Smith", projects: [] }; setRecords([record, ...records]); go(`/engagements/${id}`); };
  return <div className="space-y-5">
    <button type="button" onClick={() => go("/engagements")} className="flex items-center gap-1 text-xs text-muted-foreground"><ChevronLeft size={15}/>Engagements</button>
    <section className="surface space-y-5 p-6">
      <div className="grid gap-4 md:grid-cols-2"><Field label="Client name *"><input className="workspace-input" value={client} onChange={(event) => setClient(event.target.value)} placeholder="Client name"/></Field><Field label="Tax year(s) *"><input className="workspace-input" value={taxYear} onChange={(event) => setTaxYear(event.target.value)} placeholder="2025"/></Field></div>
      <div className="grid gap-5 md:grid-cols-2"><UploadField label="Transcript *" mode={mode.transcript} setMode={(value) => setMode({ ...mode, transcript: value })} file={transcript} setFile={setTranscript} fileChange={fileChange}/><UploadField label="Summary *" mode={mode.summary} setMode={(value) => setMode({ ...mode, summary: value })} file={summary} setFile={setSummary} fileChange={fileChange}/></div>
      {transcript && <p className="flex items-center gap-2 text-xs text-negative"><AlertTriangle size={14}/>38 min · meeting was 1 h 12 m.</p>}
      {summary && <p className="flex items-center gap-2 text-xs text-mint"><Check size={14}/><Check size={14}/>Summary checked</p>}
      <div className="grid gap-3 md:grid-cols-2"><UploadField label="Prior report" mode="Upload" setMode={() => undefined} file="" setFile={() => undefined} fileChange={fileChange} optional/><Field label={<span className="flex items-center gap-2">Wage source <IconInfo text="Figures are read from the scan and flagged if uncertain."/></span>}><div className="flex gap-2"><button className="choice-button selected" type="button">Spreadsheet</button><button className="choice-button" type="button">PDF</button></div></Field></div>
      <div><button type="button" className="flex items-center gap-2 text-sm font-semibold text-navy" onClick={() => setProfile(!profile)}><ChevronRight size={15} className={profile ? "rotate-90" : ""}/>Add company profile</button>{profile && <div className="mt-4 grid gap-3 md:grid-cols-2">{["Legal entity", "Industry", "Entity type", "Product lines", "Ownership"].map((label, index) => <Field key={label} label={label}><input className="workspace-input" value={profileData[index]} onChange={(event) => setProfileData(profileData.map((value, i) => i === index ? event.target.value : value))}/></Field>)}</div>}</div>
      <label className="flex items-center gap-2 text-xs font-medium text-navy"><input type="checkbox" defaultChecked className="accent-mint"/>Pause after qualification <IconInfo text="The run waits until you confirm each project."/></label>
      <div className="flex justify-end gap-2 border-t border-border pt-4"><AppButton variant="secondary" onClick={() => go("/engagements")}>Cancel</AppButton><AppButton disabled={!complete} onClick={create}><Plus size={16}/>Create</AppButton></div>
    </section>
  </div>;
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return <label className="block space-y-2"><span className="block text-xs font-semibold text-navy">{label}</span>{children}</label>;
}

function UploadField({ label, mode, setMode, file, setFile, fileChange, optional }: { label: string; mode: string; setMode: (value: string) => void; file: string; setFile: (value: string) => void; fileChange: (event: React.ChangeEvent<HTMLInputElement>, setter: (value: string) => void) => void; optional?: boolean }) {
  const [paste, setPaste] = useState("");
  return <div className="space-y-2"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-navy">{label}{optional && <span className="ml-1 text-muted-foreground">Optional</span>}</span><div className="flex rounded-full bg-secondary p-1">{["Upload", "Paste"].map((tab) => <button type="button" key={tab} className={`rounded-full px-3 py-1 text-[10px] font-semibold ${mode === tab ? "bg-card text-navy shadow-sm" : "text-muted-foreground"}`} onClick={() => setMode(tab)}>{tab}</button>)}</div></div>
    {mode === "Paste" ? <textarea className="workspace-input workspace-textarea" value={paste} onChange={(event) => { setPaste(event.target.value); if (event.target.value) setFile("Pasted content"); }} placeholder="Paste text"/> : <label className="flex min-h-[88px] cursor-pointer items-center justify-center gap-2 rounded-2xl bg-secondary/70 text-xs text-muted-foreground hover:bg-secondary"><Upload size={16}/>{file || "Choose a file"}<input type="file" className="sr-only" onChange={(event) => fileChange(event, setFile)}/></label>}
  </div>;
}

function EngagementOverview({ engagement, go, notify }: { engagement: Engagement; go: (target: string) => void; notify: (message: string) => void }) {
  const store = useCSSI();
  const [adding, setAdding] = useState(false); const [followup, setFollowup] = useState("");
  const [followups, setFollowups] = useState(["#3 · Sep 28, 2026 · Fathom transcript · Clarified alternatives evaluated · Transcript + 2 files · Processed · Re-analysis needed", "#2 · Sep 22, 2026 · Supporting documents · Additional technical drawings · 3 files · Included in Draft v2", "#1 · Sep 15, 2026 · Manual notes · Outcome clarification · Included in Draft v2"]);
  const isPioneer = engagement.id === "pioneer"; const base = `/engagements/${engagement.id}`;
  const action = engagement.status === "Ready to run" ? "Start Agent" : engagement.status === "Running" ? "View run" : engagement.status === "Finalized" ? "View report" : "View draft";
  const actionRoute = engagement.status === "Ready to run" ? `${base}/run` : engagement.status === "Running" ? `${base}/run` : engagement.status === "Finalized" ? `${base}/report` : `${base}/draft`;
  const primary = () => { if (engagement.status === "Ready to run") store.setRunStage("ready"); go(actionRoute); };
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-muted-foreground">{engagement.years} · {engagement.capture} · Created {engagement.date} · {engagement.owner}</p></div><div className="flex gap-2"><AppButton onClick={primary}><Play size={16}/>{action}</AppButton>{engagement.status === "Finalized" && <AppButton variant="secondary" onClick={() => go(`${base}/run/trace`)}><GitBranch size={15}/>View trace</AppButton>}</div></div>
    <section className="surface grid grid-cols-2 gap-y-4 p-5 md:grid-cols-4"><Metric label="Status" value={engagement.status}/><Metric label="Capture" value={engagement.capture}/><Metric label="Inputs" value={isPioneer ? "4 ready" : engagement.stage}/><Metric label="Checkpoint" value="Enabled"/></section>
    <section className="surface p-5"><SectionTitle title="Files"/><div className="mt-3 grid gap-2 sm:grid-cols-2">{(isPioneer ? ["fathom-transcript.txt", "fathom-summary.txt", "company-profile.pdf", "2025-wages.pdf"] : ["Transcript", "Summary"]).map((file) => <div className="flex items-center gap-2 rounded-xl bg-secondary/60 px-3 py-3 text-xs text-navy" key={file}><FileText size={15} className="text-muted-foreground"/>{file}<Check size={15} className="ml-auto text-mint"/></div>)}</div></section>
    <section className="surface p-5"><SectionTitle title="Projects"/>{engagement.projects.length ? <div className="mt-3 space-y-3">{engagement.projects.map((project) => <div key={project.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-secondary/40 px-4 py-3"><div className="flex min-w-0 items-center gap-3"><span className="rounded-lg bg-card px-2 py-1 text-xs font-bold text-navy">{project.number}</span><span className="truncate text-sm font-semibold text-navy">{project.name}</span><Status value={store.confirmed[project.id] ?? project.verdict}/></div><div className="flex items-center gap-4 text-xs text-muted-foreground"><span>{project.wages}</span><button type="button" className="font-bold text-mint" onClick={() => go(`${base}/${project.verdict === "Eligible" ? "draft" : "qualification"}/${project.id}`)}>{project.verdict === "Eligible" ? "Open report ›" : "Qualification ›"}</button></div></div>)}</div> : <EmptyState text="No projects added" action="Add project" onClick={() => notify("Project added")}/>}</section>
    <section className="surface p-5"><div className="flex items-center justify-between"><SectionTitle title="Follow-ups"/><AppButton variant="ghost" className="text-mint" onClick={() => setAdding(!adding)}><Plus size={15}/>Add</AppButton></div>{adding && <div className="my-3 flex gap-2"><input className="workspace-input" value={followup} onChange={(event) => setFollowup(event.target.value)} placeholder="Project · source · note"/><AppButton disabled={!followup} onClick={() => { setFollowups([`#${followups.length + 1} · ${fmtDate()} · ${followup} · Processed`, ...followups]); setFollowup(""); setAdding(false); store.setNewFollowup(followup); }}>Save</AppButton></div>}<div className="mt-3 divide-y divide-border">{followups.map((row) => <p key={row} className="py-3 text-xs text-muted-foreground">{row}</p>)}</div>{isPioneer && <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-amber-50 px-3 py-3 text-xs text-amber-700"><AlertCircle size={15}/>New evidence <IconInfo text="The current draft is kept until you re-analyze."/><AppButton variant="ghost" className="ml-auto text-mint" onClick={() => notify("Project analysis queued")}>Re-analyze</AppButton></div>}</section>
    <section className="surface flex flex-wrap items-center justify-between gap-3 p-5"><div><SectionTitle title="Wages"/><p className="mt-2 text-xs text-muted-foreground">2025-wages.pdf · OCR required</p></div><button type="button" onClick={() => go(`${base}/verified`)} className="flex items-center gap-1 text-xs font-bold text-mint">Review <ArrowRight size={14}/></button></section>
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><span className="block text-[10px] text-muted-foreground">{label}</span><span className="mt-1 block text-sm font-semibold text-navy">{value}</span></div>;
}
function SectionTitle({ title, info }: { title: string; info?: string }) {
  return <h2 className="flex items-center gap-2 text-sm font-bold text-navy">{title}{info && <IconInfo text={info}/>}</h2>;
}

function QualificationCheckpoint({ engagement, go, notify }: { engagement: Engagement; go: (target: string) => void; notify: (message: string) => void }) {
  const { confirmed } = useCSSI();
  const allConfirmed = engagement.projects.length > 0 && engagement.projects.every((project) => confirmed[project.id]);
  return <div className="space-y-5"><div className="flex items-center gap-2"><IconInfo text="Confirm each project before a draft is written."/><span className="text-xs text-muted-foreground">Checkpoint</span></div><section className="surface overflow-hidden p-2"><table className="workspace-table"><thead><tr><th>Project</th><th>Assessment</th><th>Confirmation</th><th></th></tr></thead><tbody>{engagement.projects.map((project) => <tr key={project.id}><td className="font-semibold text-navy">{project.number} · {project.name}</td><td><Status value={confirmed[project.id] ?? project.verdict}/></td><td>{confirmed[project.id] ? <Status value="Confirmed"/> : <span className="text-xs text-muted-foreground">Awaiting decision</span>}</td><td className="text-right"><button type="button" className="font-bold text-mint" onClick={() => go(`/engagements/${engagement.id}/qualification/${project.id}`)}>Review ›</button></td></tr>)}</tbody></table></section><div className="flex justify-between"><AppButton variant="secondary" onClick={() => go(`/engagements/${engagement.id}/run`)}><ArrowLeft size={15}/>Run</AppButton><div className="flex items-center gap-2"><AppButton disabled={!allConfirmed} onClick={() => { const { setRunStage } = useCSSI(); setRunStage("complete"); go(`/engagements/${engagement.id}/draft`); }}>Continue</AppButton>{!allConfirmed && <IconInfo text="Confirm each project first."/>}</div></div>{engagement.projects.length === 0 && <p className="text-xs text-muted-foreground">No projects match this engagement.</p>}</div>;
}

function ProjectConfirmation({ engagement, path, go, notify }: { engagement: Engagement; path: string; go: (target: string) => void; notify: (message: string) => void }) {
  const projectId = path.split("/")[4] ?? "thermal";
  const project = engagement.projects.find((item) => item.id === projectId);
  const { confirmProject, confirmed } = useCSSI();
  const [selected, setSelected] = useState<Verdict>(project ? (confirmed[project.id] ?? project.verdict) : "Needs Review");
  const [reason, setReason] = useState(""); const [expanded, setExpanded] = useState<string | null>(null);
  if (!project) return <EmptyState text="Project not found" action="Return to qualification" onClick={() => go(`/engagements/${engagement.id}/qualification`)}/>;
  const changed = selected !== project.verdict; const canConfirm = !changed || reason.trim();
  const finish = () => { if (canConfirm) { confirmProject(project.id, selected); if (changed) notify(`Overridden by J. Smith · ${reason}`); go(`/engagements/${engagement.id}/qualification`); } };
  return <div className="space-y-5"><button type="button" className="flex items-center gap-1 text-xs text-muted-foreground" onClick={() => go(`/engagements/${engagement.id}`)}><ChevronLeft size={15}/>{engagement.client}</button><div className="flex items-center gap-2"><Status value={`AI: ${project.verdict}`}/><IconInfo text="All four met = Eligible. Any not met = Likely Ineligible. A gap = Needs Review."/></div><p className="text-sm text-muted-foreground">{project.objective}</p>
    <section className="surface overflow-hidden p-2"><table className="workspace-table"><thead><tr><th>Criterion</th><th>Assessment</th><th></th></tr></thead><tbody>{project.criteria.map((criterion) => <tr key={criterion.name}><td className="font-semibold text-navy">{criterion.name}</td><td><Status value={criterion.status}/></td><td className="text-right"><button type="button" className="font-bold text-mint" onClick={() => setExpanded(expanded === criterion.name ? null : criterion.name)}>{expanded === criterion.name ? "Hide quote" : "View quote ›"}</button>{expanded === criterion.name && <div className="mt-2 max-w-lg text-left text-xs text-muted-foreground">“{criterion.quote}” <IconInfo text={criterion.attribution}/></div>}</td></tr>)}</tbody></table></section>
    <section className="surface space-y-5 p-5"><div className="flex flex-wrap gap-2">{(["Eligible", "Likely Ineligible", "Needs Review"] as Verdict[]).map((verdict) => <button key={verdict} type="button" className={`choice-button ${selected === verdict ? "selected" : ""}`} onClick={() => setSelected(verdict)}>{verdict}{verdict === "Needs Review" && <IconInfo text="Nothing is generated until this is resolved."/>}</button>)}</div><p className="text-xs text-muted-foreground">Agent: {project.verdict}</p>{changed && <Field label="Reason for override *"><textarea className="workspace-input workspace-textarea" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason"/></Field>}<div className="flex justify-end gap-2"><AppButton variant="secondary" onClick={() => go(`/engagements/${engagement.id}/qualification`)}>Save</AppButton><AppButton disabled={!canConfirm} onClick={finish}><Check size={15}/>Confirm</AppButton></div></section>
  </div>;
}

function RunScreen({ engagement, go, notify }: { engagement: Engagement; go: (target: string) => void; notify: (message: string) => void }) {
  const { runStage, setRunStage } = useCSSI();
  const count = runStage === "ready" ? 3 : runStage === "checkpoint" ? 6 : 40;
  const currentStep = runStage === "ready" ? 2 : runStage === "checkpoint" ? 3 : 7;
  return <div className="space-y-5"><section className="surface p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Status value={runStage === "checkpoint" ? "Paused" : runStage === "complete" ? "Run complete" : "Ready to run"}/><span className="text-xs text-muted-foreground">{count} / 40 steps</span><span className="text-xs text-muted-foreground">Within budget</span><IconInfo text="Stops at 40 steps."/></div><button type="button" className="flex items-center gap-1 text-xs font-bold text-mint" onClick={() => go(`/engagements/${engagement.id}/run/trace`)}><GitBranch size={14}/>Trace ›</button></div><p className="mt-5 text-sm font-semibold text-navy">{runStage === "ready" ? "Qualify projects" : runStage === "checkpoint" ? "Checkpoint" : "Assemble draft"}</p>
    <div className="mt-3 grid gap-x-8 md:grid-cols-2">{runSteps.map((step, index) => { const state = runStage === "complete" || index < currentStep ? "done" : index === currentStep ? "current" : ""; return <div className={`progress-step ${state}`} key={step}><span className="progress-dot">{state === "done" ? <Check size={14}/> : index + 1}</span><span>{step}</span>{step === "Checkpoint" && runStage === "checkpoint" && <button type="button" className="ml-auto text-xs font-bold text-mint" onClick={() => go(`/engagements/${engagement.id}/qualification`)}>Open ›</button>}</div>; })}</div>
    <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-border pt-4">{runStage === "ready" && <><AppButton variant="secondary" onClick={() => { setRunStage("ready"); go(`/engagements/${engagement.id}`); }}>Cancel</AppButton><AppButton onClick={() => setRunStage("checkpoint")}><Play size={15}/>Start Agent</AppButton></>}{runStage === "checkpoint" && <><AppButton variant="secondary" onClick={() => { setRunStage("ready"); go(`/engagements/${engagement.id}`); }}>Cancel</AppButton><AppButton onClick={() => go(`/engagements/${engagement.id}/qualification`)}><ClipboardCheck size={15}/>Open checkpoint</AppButton></>}{runStage === "complete" && <AppButton onClick={() => go(`/engagements/${engagement.id}/draft`)}>View draft</AppButton>}</div>
  </section><AppButton variant="ghost" className="text-mint" onClick={() => go(`/engagements/${engagement.id}/run/trace`)}><GitBranch size={15}/>Trace ›</AppButton><span className="ml-2 text-xs text-muted-foreground">{runStage === "checkpoint" ? "Continue after all decisions are confirmed." : ""}</span></div>;
}

function TraceScreen({ engagement, go }: { engagement: Engagement; go: (target: string) => void }) {
  const rows = [
    ["1", "transcript_parser", "Fathom summary", "Build interview context", "High-level interview context built"],
    ["2", "transcript_parser", "Full transcript", "Identify every project", "3 projects identified"],
    ["3–5", "qualification_evaluator", "Projects 01–03", "Apply the 4-Part Test", "Eligible / Likely Ineligible / Needs Review"],
    ["6", "request_human_input", "Checkpoint 1", "Optional checkpoint enabled", "Decisions confirmed by J. Smith"],
    ["7–10", "narrative_writer", "Project 01", "Only qualifying projects", "4-Part Test and case study generated"],
    ["11", "ocr_w2_extractor", "2025-wages.pdf", "Scanned PDF", "Wage fields extracted"],
    ["12", "wage_data_processor", "Wage data + projects", "Map allocations", "QRE table populated; unmatched allocations called out"],
    ["13", "narrative_writer", "Project 03 outcome", "Attempt to complete an outcome absent from the source", "REFUSED. No supporting passage"],
    ["14–17", "confidence_flagging", "Generated content", "Check each section against the source", "Items flagged [REVIEW NEEDED]"],
    ["18", "document_assembler", "All sections", "CSSI report template", "Word draft assembled"],
    ["19", "Termination", "Successful completion", "Agent summary produced", "Completed"],
  ];
  return <div className="space-y-5"><div className="flex items-center gap-2"><IconInfo text="Each step, tool, and refusal is kept for audit."/><span className="text-xs text-muted-foreground">Audit trace</span></div><section className="surface grid gap-4 p-5 sm:grid-cols-4"><Metric label="Run" value="Completed"/><Metric label="Terminal state" value="Successful"/><Metric label="Steps" value="19"/><Metric label="Guardrail refusals" value="1"/></section><section className="surface overflow-auto p-2"><table className="workspace-table min-w-[900px]"><thead><tr>{["Step", "Tool", "Input", "Reasoning summary", "Result"].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row[0]}>{row.map((cell, index) => <td key={cell} className={index === 4 ? "text-navy" : "text-muted-foreground"}>{cell}</td>)}</tr>)}</tbody></table></section><section className="surface p-5"><SectionTitle title="Generated with"/><p className="mt-3 text-xs text-muted-foreground">transcript_parser v1.2 · qualification_evaluator v1.4 · narrative_writer v2.0 · Knowledge base v1.1 · Reasoning model pinned version</p></section><button type="button" className="text-xs font-bold text-mint" onClick={() => go(`/engagements/${engagement.id}`)}>‹ {engagement.client}</button></div>;
}

function DraftScreen({ engagement, go, notify }: { engagement: Engagement; go: (target: string) => void; notify: (message: string) => void }) {
  const { verified, toggleVerified, confirmed } = useCSSI();
  const qre = engagement.projects.reduce((total, project) => {
    const verdict = confirmed[project.id] ?? project.verdict;
    if (verdict !== "Eligible") return total;
    if (project.id === "thermal") return total + 70300;
    if (project.id === "calibration") return total + 18400;
    return total;
  }, 0);
  const employees = qre >= 88700 ? ["Employee A", "Employee B", "Employee C"] : ["Employee A", "Employee B"];
  return <div className="space-y-5"><div className="flex items-center gap-2 text-xs text-muted-foreground"><IconInfo text="[DRAFT] is generated. [REVIEW NEEDED] still needs a person. Not client-ready."/>Draft results</div><section className="surface p-5"><p className="text-sm text-navy">Analyzed 3 projects. Selected Project 01 as Eligible, Project 02 as Likely Ineligible, and Project 03 as Needs Review. Generated qualifying narratives, processed the supplied wage PDF, populated the QRE table, and flagged 4 items requiring human review.</p></section>
    {engagement.projects.map((project) => {
      const verdict = confirmed[project.id] ?? project.verdict;
      const included = verdict === "Eligible";
      return <section className={`surface engagement-card ${verdict === "Needs Review" ? "warning" : verdict === "Likely Ineligible" ? "negative" : ""}`} key={project.id}>
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="rounded-lg bg-secondary px-2 py-1 text-xs font-bold">{project.number}</span><h2 className="text-sm font-bold text-navy">{project.name}</h2><Status value={verdict}/></div><div className="flex gap-2">{included ? <><AppButton variant="secondary" onClick={() => go(`/engagements/${engagement.id}/editor?scope=project&project=${project.id}`)}><Pencil size={14}/>Edit</AppButton><AppButton variant="ghost" className="text-mint" onClick={() => notify("Word download ready")}><Download size={14}/>Word</AppButton><AppButton variant="ghost" className="text-mint" onClick={() => notify("PDF download ready")}><Download size={14}/>PDF</AppButton></> : verdict === "Needs Review" ? <AppButton onClick={() => go(`/engagements/${engagement.id}/qualification/${project.id}`)}>Resolve ›</AppButton> : <AppButton variant="ghost" className="text-mint" onClick={() => go(`/engagements/${engagement.id}/qualification/${project.id}`)}>View assessment ›</AppButton>}</div></div>
        {included && <div className="mt-5 grid gap-5 lg:grid-cols-2"><div><div className="flex gap-2"><Status value="[DRAFT]"/><span className="text-sm font-semibold text-navy">4-Part Test</span></div><p className="mt-3 text-xs leading-6 text-muted-foreground">During the 2025 tax year, the Company undertook the redesign of its thermal control process with the objective of improving production stability and reducing variation in finished output.</p><details className="mt-2"><summary className="cursor-pointer text-xs font-bold text-mint">Show excerpt</summary><p className="mt-2 text-xs leading-6 text-muted-foreground">The business component under development was an internal manufacturing process intended to hold operating temperature within a narrower band than the existing configuration was able to sustain across the range of conditions encountered on the production floor.</p></details><div className="mt-4 flex items-center gap-2"><Status value="[DRAFT]"/><span className="text-sm font-semibold text-navy">Case Study</span><Status value="[REVIEW NEEDED]"/></div><p className="mt-2 text-xs text-muted-foreground">Outcome statement is incomplete.</p></div>
          <div className="rounded-2xl bg-secondary/50 p-4"><h3 className="mb-2 text-xs font-bold text-navy">QRE wages</h3>{employees.map((employee) => <label key={employee} className="flex items-center gap-2 border-b border-border py-2 text-xs"><input type="checkbox" checked={Boolean(verified[employee])} onChange={() => toggleVerified(employee)} className="accent-mint"/><span className="text-navy">{employee}</span><span className="ml-auto font-semibold text-navy">{employee === "Employee A" ? "$42,500" : employee === "Employee B" ? "$27,800" : "$18,400"}</span></label>)}<div className="mt-3 flex items-center justify-between text-xs font-bold text-navy">Total <span>${qre.toLocaleString()}</span><IconInfo text="Each line is verified before finalizing."/></div></div></div>}
        {verdict === "Needs Review" && <div className="mt-4 flex items-center gap-2 text-xs text-negative"><AlertTriangle size={14}/>[REVIEW NEEDED] · {project.note}</div>}
        {!included && <p className="mt-4 text-xs text-muted-foreground">{project.wages === "Excluded" ? "Employee D $31,200 · Excluded" : "Employee C · Not allocated"}</p>}
      </section>;
    })}
    <section className="surface p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><SectionTitle title="Full report" info="Opens every included project, not just this one."/><p className="mt-3 text-xs text-muted-foreground">Qualified total ${qre.toLocaleString()} · Employees {employees.length} of 4 · Wage lines verified {Object.values(verified).filter(Boolean).length} of {employees.length}</p><p className="mt-2 text-xs text-muted-foreground">01 included · 02 excluded · 03 {confirmed.calibration === "Eligible" ? "included" : "pending"}</p></div><div className="flex gap-2"><AppButton onClick={() => go(`/engagements/${engagement.id}/editor?scope=engagement`)}><Pencil size={14}/>Edit report</AppButton><AppButton variant="ghost" className="text-mint" onClick={() => notify("Word download ready")}><Download size={14}/>Word</AppButton><AppButton variant="ghost" className="text-mint" onClick={() => notify("PDF download ready")}><Download size={14}/>PDF</AppButton></div></div></section>
  </div>;
}

function EditorScreen({ engagement, locked, go, notify }: { engagement: Engagement; locked: boolean; go: (target: string) => void; notify: (message: string) => void }) {
  const store = useCSSI();
  const [mode, setMode] = useState("Edit"); const [content, setContent] = useState("During the 2025 tax year, the Company undertook the redesign of its thermal control process with the objective of improving production stability and reducing variation in finished output. The team compared three configurations and measured deviation across a full drift cycle.");
  const [assistantInput, setAssistantInput] = useState(""); const [suggestion, setSuggestion] = useState("The team compared three architectural approaches and used repeated load testing to identify the option that met the target response time.");
  const [showSuggestion, setShowSuggestion] = useState(true); const [activeSection, setActiveSection] = useState("Executive Summary"); const [saveTime, setSaveTime] = useState("10:42 AM");
  const refuse = /efficiency|30%|percent/i.test(assistantInput);
  const flagsDone = store.reviewFlags.every(Boolean);
  const scope = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search).get("scope");
  const outline = scope === "project" ? ["Project 01", "4-Part Test", "Case Study", "Wage lines"] : ["Executive Summary", "Project 01", "QRE", "Agent Summary"];
  const finalise = () => { if (store.verified["Employee A"] && store.verified["Employee B"] && flagsDone) { store.setLocked(true); go(`/engagements/${engagement.id}/verified`); } };
  if (locked) return <div className="min-h-screen bg-canvas p-5"><div className="mx-auto max-w-6xl"><div className="surface mb-4 flex items-center justify-between p-4"><div className="flex items-center gap-3"><LockKeyhole size={18}/><b className="text-sm">v5 · Verified · Julie · Sep 26, 10:35 AM</b><IconInfo text="Locked. Reopen to correct it. This version stays available."/></div><AppButton onClick={() => notify("Final PDF download ready")}><Download size={15}/>Export PDF</AppButton></div><div className="grid gap-4 lg:grid-cols-[220px_1fr_280px]"><EditorOutline items={outline} active={activeSection} setActive={setActiveSection}/><section className="surface min-h-[600px] p-7"><h1 className="mb-6 text-xl font-bold text-navy">{engagement.client} · {engagement.years}</h1><p className="text-sm leading-8 text-navy">{content}</p><hr className="my-6 border-border"/><h2 className="text-sm font-bold text-navy">Wage verification</h2><WageTable verified locked/></section><aside className="surface p-5"><SectionTitle title="Read only"/><div className="mt-4 space-y-2"><AppButton variant="secondary" onClick={() => notify("Evidence: Interview #2 · 00:14:22")}>Evidence</AppButton><AppButton variant="secondary" onClick={() => notify("No additional changes")}>Changes since v4</AppButton></div><button type="button" onClick={() => go(`/engagements/${engagement.id}/revision`)} className="mt-5 flex items-center gap-1 text-xs font-bold text-mint">Reopen <ArrowRight size={14}/></button></aside></div></div></div>;
  return <div className="min-h-screen bg-canvas p-4 md:p-5">
    <header className="surface mx-auto mb-4 flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-4 py-3"><div className="flex items-center gap-3"><button type="button" onClick={() => go(`/engagements/${engagement.id}/draft`)} aria-label="Back to draft" className="rounded-full p-2 text-muted-foreground hover:bg-secondary"><ChevronLeft size={18}/></button><h1 className="text-sm font-bold text-navy">{scope === "project" ? "Project 01" : "Full report"}</h1><span className="text-xs text-muted-foreground">v4 · In review · {saveTime}</span></div><AppButton onClick={() => { setSaveTime("Saved"); notify("Saved"); }}><Check size={15}/>Save</AppButton></header>
    <div className="mx-auto grid max-w-[1500px] gap-4 lg:grid-cols-[210px_minmax(0,1fr)_300px]">
      <EditorOutline items={outline} active={activeSection} setActive={setActiveSection} issues onIssue={(issue) => { setActiveSection(issue); document.getElementById("editor-issue")?.scrollIntoView({ behavior: "smooth" }); }}/>
      <section className="surface min-h-[720px] p-5 md:p-7"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-bold text-navy">{engagement.client} · {engagement.years}</h2><span className="flex items-center gap-2 text-xs text-mint"><span className="h-2 w-2 rounded-full bg-mint"/>Autosave</span></div>
        <div className="mb-5 flex flex-wrap items-center gap-1 border-b border-border pb-3"><div className="mr-4 flex rounded-full bg-secondary p-1">{["Edit", "Preview"].map((item) => <button key={item} type="button" onClick={() => setMode(item)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${mode === item ? "bg-card text-navy shadow-sm" : "text-muted-foreground"}`}>{item}</button>)}</div>{["B", "I", "•", "↶", "↷"].map((item) => <button key={item} type="button" aria-label={item} title={item} className="h-8 w-8 rounded-lg text-xs font-bold text-muted-foreground hover:bg-secondary" onClick={() => notify("Formatting applied")}>{item}</button>)}</div>
        {mode === "Edit" ? <textarea className="workspace-input workspace-textarea min-h-[260px] bg-transparent text-sm leading-8" value={content} onChange={(event) => setContent(event.target.value)} readOnly={locked}/> : <p className="min-h-[260px] text-sm leading-8 text-navy">{content}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-secondary/60 p-3 text-xs text-navy"><button type="button" onClick={() => notify("Source: We tried three different approaches before settling on · 00:14:22")} className="rounded-full bg-card px-3 py-1.5 text-[10px] font-semibold text-mint shadow-sm">Source · 00:14:22</button><span>“We tried three different approaches before settling on.”</span></div>
        <div id="editor-issue" className="mt-5 rounded-xl border border-warning/40 bg-warning/10 p-4"><span className="flex items-center gap-2 text-xs font-bold text-navy">[REVIEW NEEDED] <button type="button" onClick={() => notify("Source evidence opened")} className="font-semibold text-mint">Evidence</button><button type="button" onClick={() => setAssistantInput("What source supports this?")} className="font-semibold text-mint">Ask</button><button type="button" onClick={() => notify("File selected")} className="font-semibold text-mint">Upload</button></span><p className="mt-2 text-xs text-muted-foreground">Outcome statement is incomplete.</p></div>
        <div className="mt-6"><SectionTitle title="QRE wages" info="The agent can propose a figure. Only you can accept it."/><WageTable verified={store.verified}/></div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><div className="flex flex-wrap gap-3">{["Wages", "Selection", "Flags"].map((label, index) => <button type="button" key={label} onClick={() => store.setReviewFlag(index)} className="flex items-center gap-1.5 text-xs text-navy"><span className={`grid h-4 w-4 place-items-center rounded-full ${index === 0 ? store.verified["Employee A"] && store.verified["Employee B"] ? "bg-mint text-card" : "bg-secondary text-muted-foreground" : store.reviewFlags[index] ? "bg-mint text-card" : "bg-secondary text-muted-foreground"}`}>{(index === 0 ? store.verified["Employee A"] && store.verified["Employee B"] : store.reviewFlags[index]) && <Check size={11}/>}</span>{label}</button>)}<IconInfo text="All three are required before the report can be locked."/></div><AppButton disabled={!(store.verified["Employee A"] && store.verified["Employee B"] && flagsDone)} onClick={finalise}>Mark review complete</AppButton></div>
      </section>
      <aside className="surface flex min-h-[720px] flex-col p-5"><div className="flex items-center gap-2"><span className="icon-tile !h-8 !w-8 !basis-8"><Sparkles size={15}/></span><div><p className="text-xs font-bold text-navy">CSSI Agent</p><p className="text-[10px] text-muted-foreground">{activeSection}</p></div></div><div className="mt-6 rounded-2xl bg-secondary/60 p-3"><span className="text-[10px] font-bold text-mint">Suggested revision</span>{showSuggestion ? <p className="mt-2 text-xs leading-5 text-navy">{suggestion}</p> : <p className="mt-2 text-xs text-muted-foreground">No pending suggestion.</p>}<div className="mt-3 flex items-center gap-2"><AppButton disabled={!showSuggestion} onClick={() => { setContent(`${content} ${suggestion}`); setShowSuggestion(false); store.setReviewFlag(1); notify("Suggestion accepted"); }}>Accept</AppButton><AppButton disabled={!showSuggestion} variant="secondary" onClick={() => setShowSuggestion(false)}>Reject</AppButton><AppButton disabled={!showSuggestion} variant="ghost" onClick={() => setSuggestion(`${suggestion} Please review this wording.`)}>Modify</AppButton></div><div className="mt-2 flex justify-end"><IconInfo text="Interview #2 · 00:14:22, 00:18:51."/></div></div>
        <div className="mt-4 grid grid-cols-2 gap-2">{["Evidence", "Gaps", "Changes", "Wages"].map((item) => <AppButton key={item} variant="secondary" className="!text-[11px]" onClick={() => notify(item === "Evidence" ? "Interview #2 · 00:14:22" : item === "Gaps" ? "Outcome unfinished" : item === "Changes" ? "2 applied · 1 refused" : "Wages verified by reviewer")}>{item}</AppButton>)}</div>
        <div className="mt-4 space-y-2">{["Applied · Removed unsupported cause", "Applied · Added testing sentence", "Refused · Efficiency figure"].map((item) => <div key={item} className="rounded-lg bg-secondary/50 px-3 py-2 text-[10px] text-muted-foreground">{item}</div>)}<button type="button" className="text-[10px] font-bold text-mint" onClick={() => notify("Last change undone")}>Undo · Trace ›</button></div>
        <div className="mt-auto pt-5"><textarea className="workspace-input workspace-textarea !min-h-[86px]" value={assistantInput} onChange={(event) => setAssistantInput(event.target.value)} placeholder="Ask about this section"/><div className="mt-2 flex justify-end"><AppButton onClick={() => { if (!assistantInput.trim()) return; if (refuse) { setSuggestion("That figure is not in the source."); notify("REFUSED · That figure is not in the source."); } else { setSuggestion(`The source supports: ${assistantInput.trim()}.`); setShowSuggestion(true); } setAssistantInput(""); }}><Send size={14}/>Ask</AppButton></div>{refuse && <p className="mt-2 text-xs text-negative">REFUSED · That figure is not in the source. <IconInfo text="Enter it yourself and it is stored as human-added."/></p>}</div>
      </aside>
    </div>
  </div>;
}

function EditorOutline({ items, active, setActive, issues = false, onIssue }: { items: string[]; active: string; setActive: (item: string) => void; issues?: boolean; onIssue?: (issue: string) => void }) {
  return <aside className="surface h-fit p-4"><nav className="space-y-1">{items.map((item) => <button type="button" key={item} onClick={() => setActive(item)} className={`block w-full rounded-lg px-3 py-2 text-left text-xs ${active === item ? "bg-card font-bold text-navy shadow-sm" : "text-muted-foreground hover:bg-secondary"}`}>{item}</button>)}</nav>{issues && <div className="mt-6 border-t border-border pt-4"><h3 className="mb-2 text-xs font-bold text-navy">Issues · 3</h3>{["Employee C unmapped", "Alternatives not cited", "Outcome unfinished"].map((item) => <button type="button" key={item} onClick={() => onIssue?.(item)} className="block py-2 text-left text-[10px] text-negative">{item}</button>)}</div>}</aside>;
}

function WageTable({ verified, locked = false }: { verified: Record<string, boolean> | boolean; locked?: boolean }) {
  const store = useCSSI();
  const isVerified = (employee: string) => typeof verified === "boolean" ? verified : Boolean(verified[employee]);
  const rows = [["Employee A", "$125,000", "34%", "$42,500"], ["Employee B", "$69,500", "40%", "$27,800"], ["Employee C", "$88,000", "25%", "$22,000"]];
  return <div className="mt-3 overflow-auto"><table className="workspace-table min-w-[520px]"><thead><tr><th>Employee</th><th>Annual</th><th>Qualified</th><th>QRE</th><th>Verified by</th></tr></thead><tbody>{rows.map(([employee, annual, percent, amount]) => <tr key={employee}><td className="font-semibold text-navy">{employee}</td><td>{annual}</td><td>{percent}</td><td className="font-semibold text-navy">{amount}</td><td>{locked ? "Julie" : <label className="flex items-center gap-2"><input type="checkbox" checked={isVerified(employee)} onChange={() => store.toggleVerified(employee)} className="accent-mint"/>Verified</label>}</td></tr>)}</tbody></table><p className="mt-3 flex items-center justify-end gap-2 text-xs font-bold text-navy">Total qualified $92,300 <IconInfo text="Employee C was allocated during review."/></p></div>;
}

function VerifiedScreen({ engagement, go, notify }: { engagement: Engagement; go: (target: string) => void; notify: (message: string) => void }) {
  return <div className="min-h-[calc(100vh-120px)] bg-canvas"><div className="surface flex items-center justify-between p-5"><span className="flex items-center gap-2 text-sm font-semibold text-navy"><LockKeyhole size={17}/>v5 · Verified · Julie · Sep 26, 10:35 AM <IconInfo text="Locked. Reopen to correct it. This version stays available."/></span><AppButton onClick={() => notify("Final PDF download ready")}><Download size={15}/>Export PDF</AppButton></div><section className="surface mt-5 p-6"><h2 className="mb-5 text-xl font-bold text-navy">{engagement.client} · {engagement.years}</h2><p className="text-sm leading-7 text-navy">During the 2025 tax year, the Company undertook the redesign of its thermal control process with the objective of improving production stability and reducing variation in finished output.</p><h3 className="mt-8 text-sm font-bold text-navy">Wage verification</h3><WageTable verified locked/></section><div className="mt-4 flex justify-end"><AppButton onClick={() => go(`/engagements/${engagement.id}/revision`)}><RefreshCw size={15}/>Reopen</AppButton></div></div>;
}

function ReportScreen({ engagement, go, notify }: { engagement: Engagement; go: (target: string) => void; notify: (message: string) => void }) {
  const { finalized, setFinalized, confirmed } = useCSSI();
  const isCronus = engagement.id === "cronus";
  if (!finalized && !isCronus) return <div className="surface flex flex-wrap items-center justify-between gap-4 p-6"><span className="text-sm text-muted-foreground">Not finalized</span><AppButton onClick={() => go(`/engagements/${engagement.id}/draft`)}>Continue review</AppButton></div>;
  return <div className="space-y-5"><div className="flex flex-wrap items-center justify-between"><div><h2 className="text-xl font-bold text-navy">{engagement.client} · {engagement.years}</h2><p className="mt-2 text-xs text-muted-foreground">Julie · Sep 25, 2026 · 10:35 AM <Status value="Finalized"/></p></div><AppButton variant="secondary" onClick={() => go(`/engagements/${engagement.id}/revision`)}><RefreshCw size={14}/>Reopen report</AppButton></div><section className="surface grid gap-4 p-5 sm:grid-cols-4"><Metric label="Qualified total" value={confirmed.calibration === "Eligible" ? "$88,700" : "$70,300"}/><Metric label="Projects" value="2 of 3"/><Metric label="Employees" value="3 of 4"/><Metric label="Wage lines" value="3 of 3"/></section><section className="surface flex flex-wrap items-center justify-between gap-3 p-5"><div><p className="text-sm font-semibold text-navy">Pioneer_Systems_2025_Final.pdf</p><p className="mt-1 text-xs text-muted-foreground">One file · Included projects can also be downloaded separately <IconInfo text="One file for the engagement. Included projects can also be downloaded separately."/></p></div><AppButton onClick={() => notify("PDF download ready")}><Download size={15}/>Download PDF</AppButton></section><div className="grid gap-3 md:grid-cols-3">{engagement.projects.map((project) => <div className="project-card" key={project.id}><div className="flex items-start justify-between gap-2"><b className="text-xs text-navy">{project.number} · {project.name}</b><Status value={project.verdict === "Eligible" ? "Included" : "Not included"}/></div><p className="mt-3 text-xs text-muted-foreground">{project.wages}</p><div className="mt-4 flex gap-3"><button type="button" className="text-xs font-bold text-mint" onClick={() => notify("Project extract ready")}>Extract</button><button type="button" className="text-xs font-bold text-mint" onClick={() => go(`/engagements/${engagement.id}/revision`)}>Reopen</button></div></div>)}</div></div>;
}

function RevisionScreen({ engagement, go, notify }: { engagement: Engagement; go: (target: string) => void; notify: (message: string) => void }) {
  return <div className="space-y-5"><div className="flex items-center gap-2"><IconInfo text="v1 stays available until v2 is finalized."/><span className="text-xs text-muted-foreground">Reopened Sep 28 · v2 draft · Last final v1 · Sep 25</span></div><div className="grid gap-3 md:grid-cols-3">{engagement.projects.map((project, index) => <div key={project.id} className="project-card"><b className="text-xs text-navy">{project.number} · {project.name}</b><div className="mt-3 flex items-center justify-between"><Status value={index === 0 ? "Being revised" : index === 1 ? "Not included" : "Unchanged"}/>{index === 0 && <button type="button" onClick={() => go(`/engagements/${engagement.id}/editor?scope=project&project=${project.id}`)} className="text-xs font-bold text-mint">Edit</button>}</div></div>)}</div><section className="surface p-5"><SectionTitle title="Version history"/><div className="mt-3 flex flex-wrap items-center justify-between gap-4 border-b border-border py-3 text-xs text-muted-foreground"><span>v1 · Sep 25 · Julie</span><button type="button" className="font-bold text-mint" onClick={() => notify("Version 1 PDF ready")}>Download</button></div><div className="flex flex-wrap items-center justify-between gap-4 py-3 text-xs text-muted-foreground"><span>Reopened · Reviewer requested a correction</span><button type="button" className="font-bold text-mint" onClick={() => go(`/engagements/${engagement.id}/editor?scope=engagement`)}>Edit</button></div></section><div className="flex justify-end"><AppButton onClick={() => go(`/engagements/${engagement.id}/editor?scope=engagement`)}>Continue revision</AppButton></div></div>;
}

function InterviewsPage({ path, go, notify }: { path: string; go: (target: string) => void; notify: (message: string) => void }) {
  const store = useCSSI();
  const [syncing, setSyncing] = useState(false); const [syncLabel, setSyncLabel] = useState("");
  const [attached, setAttached] = useState(false); const [client, setClient] = useState(""); const [year, setYear] = useState("");
  const callId = path.split("/")[2];
  const call = store.interviews.find((item) => item.id === callId);
  if (callId && callId !== "schedule" && call) return <CaptureScreen call={call} go={go}/>;
  return <div className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex gap-2"><AppButton onClick={() => go("/interviews/schedule")}><CalendarPlus size={15}/>Schedule</AppButton><AppButton variant="secondary" onClick={() => { setSyncing(true); window.setTimeout(() => { setSyncing(false); setSyncLabel("Synced just now"); store.setSyncLabel("just now"); }, 900); }}><RefreshCw size={15} className={syncing ? "animate-spin" : ""}/>{syncing ? "Syncing" : "Sync"}</AppButton></div><span className="text-xs text-muted-foreground">Outlook · Next 14 days · Last synced {syncLabel || store.syncLabel}</span></div><section className="surface overflow-auto p-2"><table className="workspace-table min-w-[730px]"><thead><tr>{["Meeting", "Client", "Date", "Interviewer", "Platform", "Status", ""].map((item) => <th key={item}>{item}</th>)}</tr></thead><tbody>{store.interviews.map((meeting) => <tr key={meeting.id}><td className="font-semibold text-navy">{meeting.title}</td><td>{meeting.client}</td><td>{meeting.when}</td><td>{meeting.owner}</td><td>{meeting.platform}</td><td><Status value={meeting.status}/></td><td className="text-right"><button type="button" className="font-bold text-mint" onClick={() => meeting.status === "Linked" ? go(`/engagements/${meeting.client === "Northstar Labs" ? "northstar" : "pioneer"}`) : (setAttached(true), setClient(meeting.client))}>{meeting.status === "Linked" ? "Open ›" : "Attach ›"}</button></td></tr>)}</tbody></table></section>{attached && <div className="fixed inset-0 z-40 grid place-items-center bg-navy/20 p-4"><div className="surface w-full max-w-md space-y-4 p-6"><div className="flex items-center justify-between"><h2 className="text-base font-bold text-navy">Attach interview</h2><button type="button" onClick={() => setAttached(false)} aria-label="Close"><X size={17}/></button></div><Field label="Client name"><input className="workspace-input" value={client} onChange={(event) => setClient(event.target.value)}/></Field><Field label="Tax year"><input className="workspace-input" value={year} onChange={(event) => setYear(event.target.value)} placeholder="2025"/></Field><div className="flex justify-end gap-2"><AppButton variant="secondary" onClick={() => setAttached(false)}>Cancel</AppButton><AppButton onClick={() => { setAttached(false); go(`/interviews/${client.toLowerCase().startsWith("delta") ? "delta-call" : "acme-call"}`); }}>Attach</AppButton></div></div></div>}</div>;
}

function ScheduleInterview({ go, notify }: { go: (target: string) => void; notify: (message: string) => void }) {
  const [client, setClient] = useState(""); const [year, setYear] = useState(""); const [start, setStart] = useState("Later");
  return <div className="space-y-5"><button type="button" onClick={() => go("/interviews")} className="flex items-center gap-1 text-xs text-muted-foreground"><ChevronLeft size={15}/>Interviews</button><div className="flex flex-wrap gap-2"><Status value="Calendar Connected"/><Status value="Zoom Connected"/><span className="flex items-center gap-1"><Status value="Fathom Check"/><IconInfo text="If Fathom is not on this calendar, the interview is not recorded."/></span></div><section className="surface space-y-5 p-6"><div className="grid gap-4 md:grid-cols-2"><Field label="Client *"><input className="workspace-input" value={client} onChange={(event) => setClient(event.target.value)}/></Field><Field label="Tax year *"><input className="workspace-input" value={year} onChange={(event) => setYear(event.target.value)}/></Field><Field label="Interviewer"><input className="workspace-input" defaultValue="J. Smith"/></Field><Field label="Owner"><input className="workspace-input" defaultValue="J. Smith"/></Field></div><div><span className="text-xs font-semibold text-navy">Meeting</span><div className="mt-2 flex gap-2">{["Later", "Start now"].map((value) => <button type="button" key={value} onClick={() => setStart(value)} className={`choice-button ${start === value ? "selected" : ""}`}>{value}</button>)}</div></div><div className="grid gap-4 md:grid-cols-3"><Field label="Date"><input className="workspace-input" type="date" defaultValue="2026-09-24"/></Field><Field label="Time"><input className="workspace-input" type="time" defaultValue="10:00"/></Field><Field label="Duration"><select className="workspace-input" defaultValue="90 minutes"><option>90 minutes</option><option>60 minutes</option></select></Field></div><Field label="Attendees"><input className="workspace-input" placeholder="Add attendees"/></Field><p className="flex items-center gap-2 text-xs text-navy"><input type="checkbox" defaultChecked className="accent-mint"/>Pause after qualification</p><div className="flex justify-end gap-2 border-t border-border pt-4"><AppButton variant="secondary" onClick={() => go("/interviews")}>Use calendar instead</AppButton><AppButton disabled={!client || !year} onClick={() => { notify("Interview scheduled"); go("/interviews/acme-call"); }}><CalendarPlus size={15}/>Create <IconInfo text="Creates the Zoom meeting and calendar event. The agent does not join."/></AppButton></div></section></div>;
}

function CaptureScreen({ call, go }: { call: { id: string; title: string; client: string; when: string; owner: string; platform: string; status: string }; go: (target: string) => void }) {
  const [step, setStep] = useState(call.id === "delta-call" ? 4 : call.status === "Linked" ? 3 : 0);
  const [failed, setFailed] = useState(call.id === "delta-call");
  const [engagementId, setEngagementId] = useState(call.id === "northstar-call" ? "northstar" : "acme");
  const { setRecords, records } = useCSSI();
  const labels = ["Calendar detected", "Zoom meeting started", "Fathom recording", "Transcript + summary", "Engagement created"];
  const state = failed ? 4 : step;
  const next = () => { if (state === 0) setStep(1); else if (state === 1) setStep(2); else if (state === 2) setStep(3); else if (state === 3) { const id = `captured-${call.id}`; setEngagementId(id); setRecords([{ id, client: call.client, years: "2025", capture: "Automatic", status: "Ready to run", stage: "Inputs validated", date: fmtDate(), owner: call.owner, projects: [] }, ...records]); setStep(4); } };
  return <div className="space-y-5"><section className="surface p-5"><div className="flex flex-wrap items-center gap-2"><Status value={failed ? "Transcript failed" : state === 4 ? "Ready" : state === 2 ? "Recording" : state === 3 ? "Retrieving" : "Detected"}/>{state === 4 && !failed && <h2 className="text-sm font-bold text-navy">Engagement created</h2>}</div><h3 className="mt-4 text-lg font-bold text-navy">{failed ? "Capture" : state === 4 ? `${call.client} engagement` : "Capture"}</h3><p className="mt-2 text-xs text-muted-foreground">{call.title} · {call.when} · {call.owner} · {call.platform}</p><div className="mt-7 grid gap-2 sm:grid-cols-5">{labels.map((label, index) => <div key={label} className="flex items-center gap-2 text-[10px]"><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${failed && index === 3 ? "bg-negative text-card" : index < state ? "bg-mint text-card" : index === state ? "bg-teal text-card" : "bg-secondary text-muted-foreground"}`}>{failed && index === 3 ? <X size={13}/> : index < state ? <Check size={13}/> : index + 1}</span><span className={index <= state ? "font-semibold text-navy" : "text-muted-foreground"}>{label}</span></div>)}</div><div className="mt-6 rounded-xl bg-secondary/50 p-4"><div className="flex items-center gap-2 text-xs font-semibold text-navy"><Clock3 size={15}/>{failed ? "Summary completed" : state === 0 ? "Waiting for Zoom" : state === 1 ? "Zoom meeting started" : state === 2 ? "Fathom recording" : state === 3 ? "Fetching transcript" : "Transcript · Summary"}{state < 4 && !failed && <IconInfo text={state < 2 ? "Fathom records when Zoom starts. This tool does not join." : "The engagement waits until the transcript and summary are both in."}/>}</div>{failed && <p className="mt-2 text-xs text-negative">Transcript retrieval failed.</p>}{state === 4 && !failed && <p className="mt-2 text-xs text-muted-foreground">{engagementId} · Automated · Transcript · Summary</p>}</div><div className="mt-5 flex flex-wrap justify-end gap-2">{failed ? <AppButton onClick={() => go("/engagements/new")}>Continue manually</AppButton> : state < 4 ? <><AppButton variant="secondary" onClick={() => setFailed(true)}>Simulate retrieval failure</AppButton><AppButton onClick={next}>{["Meeting starts", "Meeting ends", "Retrieval completes"][state]} ›</AppButton></> : <AppButton onClick={() => go(`/engagements/${engagementId}`)}>Open engagement</AppButton>}</div></section></div>;
}

function AdminPage({ notify }: { notify: (message: string) => void }) {
  const [selected, setSelected] = useState(""); const [role, setRole] = useState("Team member"); const [viewAs, setViewAs] = useState(false);
  const users = [["J. Smith", "Team member", "Calendar, Zoom, and Fathom Connected"], ["R. Lee", "Team member", "Fathom Not connected"], ["M. Jones", "Team member", "Zoom Not connected"], ["Admin", "Administrator", "No connectors"]];
  return <div className="space-y-5"><section className="surface overflow-auto p-2"><table className="workspace-table min-w-[650px]"><thead><tr><th>User</th><th>Role</th><th>Connectors</th><th></th></tr></thead><tbody>{users.map(([name, userRole, connectors]) => <tr key={name}><td className="font-semibold text-navy">{name}</td><td>{userRole}</td><td>{connectors}</td><td className="text-right"><button type="button" className="font-bold text-mint" onClick={() => { setSelected(name); setRole(userRole ?? "Team member"); }}>Manage ›</button></td></tr>)}</tbody></table></section>
    <section className="surface p-5"><div className="flex items-center gap-2"><SectionTitle title="Connectors"/><IconInfo text="Microsoft and Zoom are per person. Fathom can be team or individual."/></div><div className="mt-4 flex flex-wrap gap-2">{["Microsoft 365 · Connected", "Zoom · Connected", "Fathom · Connected"].map((item) => <Status value={item} key={item}/>)}</div></section>
    <section className="surface p-5"><SectionTitle title="Run settings"/><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[["Confidence", "0.85"], ["Flagging", "Evidence rules"], ["Checkpoint", "On"], ["Retention", "60 days"], ["Max steps", "40"], ["Cost budget", "On"]].map(([label, value]) => <Field key={label} label={<span className="flex items-center gap-2">{label}{label === "Flagging" && <IconInfo text="Flags missing evidence. It is not a confidence score."/>}{label === "Retention" && <IconInfo text="Generated files expire. The trace remains."/>}</span>}><input className="workspace-input" defaultValue={value}/></Field>)}</div></section>
    <section className="surface flex flex-wrap items-center justify-between gap-4 p-5"><Field label={<span className="flex items-center gap-2">Wage access <IconInfo text="Others still see the engagement and the narrative. Wage files and the QRE stay with the owner."/></span>}><select className="workspace-input" defaultValue="Engagement lead only"><option>Engagement lead only</option><option>All team members</option></select></Field><label className="flex items-center gap-2 text-xs font-semibold text-navy"><input type="checkbox" checked={viewAs} onChange={() => setViewAs(!viewAs)} className="accent-mint"/>View as R. Lee</label></section>
    {selected && <div className="fixed inset-0 z-40 flex justify-end bg-navy/20"><aside className="surface h-full w-full max-w-sm space-y-5 rounded-none p-6"><div className="flex justify-between"><h2 className="text-lg font-bold text-navy">{selected}</h2><button type="button" aria-label="Close" onClick={() => setSelected("")}><X size={18}/></button></div><Field label="Role"><select className="workspace-input" value={role} onChange={(event) => setRole(event.target.value)}><option>Team member</option><option>Administrator</option></select></Field><IconInfo text="Without Fathom, interviews are not captured. Manual engagements still work."/>{["Calendar", "Zoom", "Fathom"].map((service) => <div className="flex items-center justify-between border-b border-border py-3 text-sm" key={service}>{service}<AppButton variant="secondary" onClick={() => notify(`${service} connection updated`)}>Connect / Disconnect</AppButton></div>)}</aside></div>}
  </div>;
}