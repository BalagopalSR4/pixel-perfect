export type CapturePhase = "detected" | "recording" | "retrieving" | "complete" | "failed";

export type StepMark = "done" | "current" | "waiting" | "failed";

export type CaptureLogRow = {
  label: string;
  /** How this log line should read. Complete rows say Completed. */
  mark: "current" | "done" | "failed" | "completed";
};

const pipeline = ["Calendar detected", "Zoom meeting started", "Fathom recording", "Transcript + summary", "Engagement created"] as const;

/** Pipeline labels, in order, for the single capture screen. */
export function capturePipeline(): readonly string[] {
  return pipeline;
}

/** Mark for one pipeline step. Failure stops on the transcript and leaves the engagement waiting. */
export function captureStepMark(index: number, phase: CapturePhase): StepMark {
  if (phase === "failed") {
    if (index < 3) return "done";
    if (index === 3) return "failed";
    return "waiting";
  }
  if (phase === "complete") return "done";
  const current = phase === "detected" ? 0 : phase === "recording" ? 2 : 3;
  if (index < current) return "done";
  if (index === current) return "current";
  return "waiting";
}

/** Activity log for the current capture status. Each later status keeps the earlier lines. */
export function captureLog(phase: CapturePhase): CaptureLogRow[] {
  if (phase === "detected") return [{ label: "Waiting for Zoom", mark: "current" }];
  const started: CaptureLogRow[] = [
    { label: "Waiting for Zoom", mark: "done" },
    { label: "Zoom meeting started", mark: "done" },
    { label: "Fathom recording", mark: phase === "recording" ? "current" : "done" },
  ];
  if (phase === "recording") return started;
  if (phase === "retrieving") return [...started, { label: "Fetching transcript", mark: "current" }];
  if (phase === "failed") return [{ label: "Summary", mark: "done" }, { label: "Transcript", mark: "failed" }];
  return [
    { label: "Waiting for Zoom", mark: "completed" },
    { label: "Zoom meeting started", mark: "completed" },
    { label: "Fathom recording", mark: "completed" },
    { label: "Fetching transcript", mark: "completed" },
  ];
}

/** Label beside a log line. Complete uses the word Completed for every row. */
export function captureLogStatus(mark: CaptureLogRow["mark"]): string {
  if (mark === "completed") return "Completed";
  if (mark === "failed") return "Failed";
  if (mark === "done") return "Done";
  return "In progress";
}

/** Button for the prototype's next event. Complete and failed have none. */
export function captureAdvanceLabel(phase: CapturePhase): string | null {
  if (phase === "detected") return "Meeting starts";
  if (phase === "recording") return "Meeting ends";
  if (phase === "retrieving") return "Retrieval completes";
  return null;
}

/** Phase after the next-event control. Failure is a separate control. */
export function advanceCapture(phase: CapturePhase): CapturePhase {
  if (phase === "detected") return "recording";
  if (phase === "recording") return "retrieving";
  if (phase === "retrieving") return "complete";
  return phase;
}

/** Status badge for the capture screen. */
export function captureBadge(phase: CapturePhase): string {
  if (phase === "failed") return "Transcript failed";
  if (phase === "complete") return "Complete";
  if (phase === "recording") return "Recording";
  if (phase === "retrieving") return "Retrieving";
  return "Detected";
}

/** Fields still required before a Zoom meeting can be created. */
export function scheduleMissing(input: { client: string; taxYear: string; start: string; date: string; time: string }): string[] {
  const missing: string[] = [];
  if (!input.client.trim()) missing.push("Client");
  if (!input.taxYear.trim()) missing.push("Tax year");
  if (input.start !== "Start now") {
    if (!input.date.trim()) missing.push("Date");
    if (!input.time.trim()) missing.push("Time");
  }
  return missing;
}

/** Calendar label for a scheduled interview. Start now has no clock time. */
export function scheduledWhen(date: string, time: string, startNow: boolean): string {
  if (startNow) return "Now";
  const parsed = new Date(`${date}T${time}`);
  if (Number.isNaN(parsed.getTime())) return [date, time].filter(Boolean).join(" ");
  const day = parsed.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
  const clock = parsed.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${day} ${clock}`;
}
