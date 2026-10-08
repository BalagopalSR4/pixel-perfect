import { Activity, AlertCircle, Check, CircleHelp, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Help icon. The note shows on hover or keyboard focus. */
export function IconInfo({ text, below = false }: { text: string; below?: boolean }) {
  return <span tabIndex={0} className={`tooltip-trigger${below ? " tooltip-below" : ""}`} aria-label={text}><CircleHelp size={15} /><span className="tooltip-content">{text}</span></span>;
}

/** Status pill. A miss is checked before a pass so "Likely Ineligible" stays negative. */
export function Status({ value }: { value: string }) {
  const negative = /Ineligible|Failed|Blocked|Not met|Refused|Excluded|Not included/i.test(value);
  const warning = !negative && !/^Draft ready$/i.test(value) && /Review|Attention|Pending|held|Paused|Draft|Insufficient|Warning|Not linked|Overridden/i.test(value);
  const progress = !negative && !warning && /Running|Recording|Retrieving|Progress/i.test(value);
  const positive = !negative && !warning && !progress && /Eligible|Ready|Met|Confirmed|Connected|Finalized|Complete|Verified|Included/i.test(value);
  const tone = negative ? "negative" : warning ? "warning" : progress ? "progress" : positive ? "" : "neutral";
  const Icon = tone === "negative" ? X : tone === "warning" ? AlertCircle : tone === "progress" ? Activity : Check;
  return <span className={`status-badge ${tone}`}><Icon size={13} strokeWidth={2.4} />{value}</span>;
}

/** Shared button. Disabled actions stay visible and do not fire. */
export function AppButton({ children, onClick, variant = "default", className = "", disabled, title }: {
  children: React.ReactNode; onClick?: (() => void) | undefined; variant?: "default" | "secondary" | "outline" | "ghost" | "link"; className?: string; disabled?: boolean; title?: string;
}) {
  return <Button variant={variant} disabled={disabled} title={title} className={`workspace-button ${className}`} onClick={onClick}>{children}</Button>;
}

/** Section heading with an optional info tooltip. */
export function SectionTitle({ title, info }: { title: string; info?: string }) {
  return <h2 className="flex items-center gap-2 text-sm font-bold text-navy">{title}{info && <IconInfo text={info}/>}</h2>;
}
