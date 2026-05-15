"use client";

import React, { useMemo, useState } from "react";
import {
  CURRENT_USERS,
  calculateFinalGrade,
  type Project,
  type Application,
  type MilestoneStatus,
} from "@/lib/mock-data";
import { useNotificationStore } from "@/lib/notification-store";
import { useDataStore } from "@/lib/data-store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  MessageSquareText,
  Star,
  TrendingUp,
  Upload,
} from "lucide-react";
import { cn, makeId } from "@/lib/utils";
import { toast } from "sonner";
import { StatCard } from "./stat-card";

interface StatusConfigItem {
  label: string;
  badge: string;
  ring: string;
  icon: React.ElementType;
}

const STATUS_CONFIG: Record<MilestoneStatus, StatusConfigItem> = {
  not_started: {
    label: "Not Started",
    badge: "bg-muted text-muted-foreground",
    ring: "border-border text-muted-foreground",
    icon: Clock,
  },
  submitted: {
    label: "Submitted",
    badge: "bg-warning/20 text-warning",
    ring: "border-warning text-warning",
    icon: FileText,
  },
  approved_mentor: {
    label: "Approved by Mentor",
    badge: "bg-primary/15 text-primary",
    ring: "border-primary text-primary",
    icon: CheckCircle2,
  },
  approved_coordinator: {
    label: "Coordinator Approved",
    badge: "bg-success/20 text-success",
    ring: "border-success text-success",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Needs Revision",
    badge: "bg-destructive/20 text-destructive",
    ring: "border-destructive text-destructive",
    icon: AlertCircle,
  },
};

interface StudentDashboardProps {
  view: string;
}

export function StudentDashboard({ view }: StudentDashboardProps) {
  const student = CURRENT_USERS.student;
  const { projects, applications, addApplication, updateSubmission } =
    useDataStore();
  const { addNotification } = useNotificationStore();

  const myApps = useMemo(
    () => applications.filter((a) => a.studentId === student.id),
    [applications, student.id]
  );
  const approvedProjectIds = useMemo(
    () =>
      myApps.filter((a) => a.status === "approved").map((a) => a.projectId),
    [myApps]
  );
  const myProjects = useMemo(
    () => projects.filter((p) => approvedProjectIds.includes(p.id)),
    [projects, approvedProjectIds]
  );

  const [applyDialog, setApplyDialog] = useState<Project | null>(null);
  const [submitDialog, setSubmitDialog] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );

  function handleApply(project: Project) {
    const alreadyApplied = myApps.some(
      (a) => a.projectId === project.id && a.status !== "rejected"
    );
    if (alreadyApplied) {
      toast.error("You already have an active application for this project.");
      setApplyDialog(null);
      return;
    }

    const newApp: Application = {
      id: makeId("a_"),
      projectId: project.id,
      projectTitle: project.title,
      studentId: student.id,
      studentName: student.name,
      studentEmail: student.email,
      status: "pending",
      appliedAt: new Date().toISOString(),
      gpa: (student as { gpa?: number }).gpa ?? 0,
    };
    addApplication(newApp);
    toast.success(`Application submitted for "${project.title}"`, {
      description: "The mentor will review your application shortly.",
    });
    addNotification({
      type: "submission",
      message: `${student.name} applied to project "${project.title}".`,
      timestamp: new Date().toISOString(),
      read: false,
      targetRole: "mentor",
    });
    setApplyDialog(null);
  }

  function handleSubmitMilestone(milestoneId: string) {
    const activeProject =
      myProjects.find((p) => p.id === selectedProjectId) ?? myProjects[0];
    if (!activeProject) {
      toast.error("No active project to submit to.");
      setSubmitDialog(null);
      return;
    }

    const milestone = activeProject.milestones.find((m) => m.id === milestoneId);
    if (!milestone) {
      toast.error("That milestone no longer exists on this project.");
      setSubmitDialog(null);
      return;
    }

    const existing = activeProject.submissions.find(
      (s) => s.milestoneId === milestoneId
    );
    if (
      existing &&
      (existing.status === "approved_mentor" ||
        existing.status === "approved_coordinator")
    ) {
      toast.error("This milestone has already been approved.");
      setSubmitDialog(null);
      return;
    }

    const safeName = milestone.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const firstName =
      student.name.trim().split(/\s+/)[0]?.toLowerCase() || "student";

    updateSubmission(
      activeProject.id,
      milestoneId,
      {
        status: "submitted",
        submittedAt: new Date().toISOString(),
        fileUrl: `${safeName}-${firstName}.pdf`,
      },
      { allowCreate: true }
    );
    toast.success("Milestone submitted successfully!", {
      description: "Your mentor will review and grade it.",
    });
    addNotification({
      type: "submission",
      message: `${student.name} submitted "${milestone.name}" for review.`,
      timestamp: new Date().toISOString(),
      read: false,
      targetRole: "mentor",
    });
    setSubmitDialog(null);
  }

  if (view === "dashboard") {
    return <StudentOverview myProjects={myProjects} myApps={myApps} />;
  }

  if (view === "browse") {
    return (
      <>
        <BrowseProjects
          projects={projects}
          onApply={(p) => setApplyDialog(p)}
          myApps={myApps}
        />
        <ApplyDialog
          project={applyDialog}
          onClose={() => setApplyDialog(null)}
          onSubmit={handleApply}
        />
      </>
    );
  }

  if (view === "applications") {
    return <MyApplications myApps={myApps} />;
  }

  if (view === "milestones") {
    return (
      <>
        <MilestoneTracker
          projects={myProjects}
          selectedProjectId={
            selectedProjectId ?? myProjects[0]?.id ?? null
          }
          onSelectProject={setSelectedProjectId}
          onSubmit={(id) => setSubmitDialog(id)}
        />
        <SubmitMilestoneDialog
          open={!!submitDialog}
          onClose={() => setSubmitDialog(null)}
          onSubmit={() => submitDialog && handleSubmitMilestone(submitDialog)}
        />
      </>
    );
  }

  return null;
}

// ── Dialogs ──────────────────────────────────────────────────────────────

function ApplyDialog({
  project,
  onClose,
  onSubmit,
}: {
  project: Project | null;
  onClose: () => void;
  onSubmit: (project: Project) => void;
}) {
  return (
    <Dialog open={!!project} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Apply to Project</DialogTitle>
          <DialogDescription className="line-clamp-2">
            {project?.title}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="apply-cv" className="text-sm font-medium">
              Upload CV (PDF)
            </label>
            <Input id="apply-cv" type="file" accept=".pdf" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="apply-transcripts" className="text-sm font-medium">
              Upload Transcripts (PDF)
            </label>
            <Input id="apply-transcripts" type="file" accept=".pdf" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => project && onSubmit(project)}>
            <Upload />
            Submit Application
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SubmitMilestoneDialog({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Milestone</DialogTitle>
          <DialogDescription>
            Upload your work for this milestone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ms-doc" className="text-sm font-medium">
              Document / Report (PDF)
            </label>
            <Input id="ms-doc" type="file" accept=".pdf" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ms-extra" className="text-sm font-medium">
              Additional Files (ZIP)
            </label>
            <Input id="ms-extra" type="file" accept=".zip" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSubmit}>
            <Upload />
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Sub-views ──────────────────────────────────────────────────────────────

function StudentOverview({
  myProjects,
  myApps,
}: {
  myProjects: Project[];
  myApps: Application[];
}) {
  const myProject = myProjects[0];
  const completedMilestones =
    myProject?.submissions.filter((s) => s.status === "approved_coordinator")
      .length ?? 0;
  const totalMilestones = myProject?.milestones.length ?? 0;
  const progress =
    totalMilestones > 0
      ? Math.round((completedMilestones / totalMilestones) * 100)
      : 0;
  const grade = myProject ? calculateFinalGrade(myProject) : null;
  const approvedCount = myApps.filter((a) => a.status === "approved").length;

  const feedbackItems = useMemo(
    () =>
      myProjects
        .flatMap((p) =>
          p.submissions
            .filter((s) => s.mentorFeedback || s.mentorGrade !== undefined)
            .map((s) => {
              const m = p.milestones.find((x) => x.id === s.milestoneId);
              return {
                key: `${p.id}-${s.milestoneId}`,
                projectTitle: p.title,
                mentorName: p.mentorName,
                milestoneName: m?.name ?? s.milestoneId,
                feedback: s.mentorFeedback,
                grade: s.mentorGrade,
                submittedAt: s.submittedAt,
              };
            })
        )
        .sort((a, b) => {
          if (!a.submittedAt) return 1;
          if (!b.submittedAt) return -1;
          return (
            new Date(b.submittedAt).getTime() -
            new Date(a.submittedAt).getTime()
          );
        }),
    [myProjects]
  );

  return (
    <section className="flex flex-col gap-6" aria-label="Student overview">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Project Progress"
          value={`${completedMilestones}/${totalMilestones}`}
          sub="milestones completed"
          icon={TrendingUp}
          tone="primary"
        />
        <StatCard
          title="Current Grade"
          value={grade !== null ? grade : "—"}
          sub="weighted average"
          icon={BookOpen}
          tone="success"
        />
        <StatCard
          title="Applications"
          value={myApps.length}
          sub={`${approvedCount} approved`}
          icon={FileText}
          tone="info"
        />
      </div>

      {feedbackItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquareText
                className="size-4 text-primary"
                aria-hidden="true"
              />
              Notes from your mentor
            </CardTitle>
            <CardDescription>
              Feedback and grades shared on your milestones.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {feedbackItems.map((f) => (
              <article
                key={f.key}
                className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-4"
              >
                <header className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold">
                      {f.milestoneName}
                    </h3>
                    <p className="truncate text-xs text-muted-foreground">
                      {f.projectTitle} · {f.mentorName}
                    </p>
                  </div>
                  {f.grade !== undefined && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary tabular-nums">
                      <Star className="size-3" aria-hidden="true" />
                      {f.grade}/100
                    </span>
                  )}
                </header>
                {f.feedback ? (
                  <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                    {f.feedback}
                  </p>
                ) : (
                  <p className="text-sm italic text-muted-foreground">
                    No written feedback — grade only.
                  </p>
                )}
              </article>
            ))}
          </CardContent>
        </Card>
      )}

      {myProject ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Project</CardTitle>
            <CardDescription className="line-clamp-2">
              {myProject.title}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-1.5">
              {myProject.technologies.map((t) => (
                <Badge key={t} variant="secondary">
                  {t}
                </Badge>
              ))}
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span
                  className="text-sm text-muted-foreground tabular-nums"
                  aria-live="polite"
                >
                  {progress}%
                </span>
              </div>
              <Progress
                value={progress}
                className="h-2"
                aria-label={`Project progress: ${progress}%`}
              />
            </div>
            <Separator />
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {myProject.milestones.map((m) => {
                const sub = myProject.submissions.find(
                  (s) => s.milestoneId === m.id
                );
                const status: MilestoneStatus = sub?.status ?? "not_started";
                const cfg = STATUS_CONFIG[status];
                const Icon = cfg.icon;
                return (
                  <li
                    key={m.id}
                    className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border",
                        cfg.ring
                      )}
                      aria-hidden="true"
                    >
                      <Icon className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Weight: {m.weight}%
                      </p>
                      <span
                        className={cn(
                          "mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          cfg.badge
                        )}
                      >
                        {cfg.label}
                      </span>
                    </div>
                    {sub?.mentorGrade !== undefined && (
                      <span className="text-sm font-semibold tabular-nums">
                        {sub.mentorGrade}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen
              className="mx-auto mb-3 size-10 text-muted-foreground/40"
              aria-hidden="true"
            />
            <p className="font-medium">No active project</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse and apply to a project to get started.
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function BrowseProjects({
  projects,
  onApply,
  myApps,
}: {
  projects: Project[];
  onApply: (p: Project) => void;
  myApps: Application[];
}) {
  const appliedIds = useMemo(() => new Set(myApps.map((a) => a.projectId)), [
    myApps,
  ]);

  return (
    <section className="flex flex-col gap-4" aria-label="Browse projects">
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground tabular-nums">
          {projects.length}
        </span>{" "}
        projects available across all departments.
      </p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {projects.map((p) => {
          const applied = appliedIds.has(p.id);
          return (
            <Card
              key={p.id}
              className="flex flex-col transition-shadow hover:shadow-md"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-balance text-sm font-semibold leading-snug">
                    {p.title}
                  </CardTitle>
                  <Badge variant="outline" className="shrink-0">
                    {p.degree}
                  </Badge>
                </div>
                <CardDescription className="line-clamp-2 text-xs">
                  {p.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3 pt-0">
                <div className="flex flex-wrap gap-1">
                  {p.technologies.map((t) => (
                    <Badge key={t} variant="secondary" className="text-xs">
                      {t}
                    </Badge>
                  ))}
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="truncate">Mentor: {p.mentorName}</span>
                  <span className="shrink-0">{p.department}</span>
                </div>
                <Button
                  size="sm"
                  variant={applied ? "outline" : "default"}
                  disabled={applied}
                  className="mt-auto"
                  onClick={() => !applied && onApply(p)}
                  aria-label={
                    applied
                      ? `Already applied to ${p.title}`
                      : `Apply to ${p.title}`
                  }
                >
                  {applied ? "Applied" : "Apply Now"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function MyApplications({ myApps }: { myApps: Application[] }) {
  const statusVariant = {
    pending: "secondary",
    approved: "default",
    rejected: "destructive",
  } as const;

  if (myApps.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText
            className="mx-auto mb-3 size-10 text-muted-foreground/40"
            aria-hidden="true"
          />
          <p className="font-medium">No applications yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Head to “Browse Projects” to find something interesting.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ul className="flex flex-col gap-3" aria-label="My applications">
      {myApps.map((app) => (
        <li key={app.id}>
          <Card>
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div className="flex min-w-0 flex-col gap-1">
                <p className="truncate text-sm font-medium">
                  {app.projectTitle}
                </p>
                <p className="text-xs text-muted-foreground">
                  Applied{" "}
                  <time dateTime={app.appliedAt}>
                    {new Date(app.appliedAt).toLocaleDateString()}
                  </time>
                </p>
              </div>
              <Badge
                variant={statusVariant[app.status] ?? "secondary"}
                className="shrink-0 capitalize"
              >
                {app.status}
              </Badge>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}

function MilestoneTracker({
  projects,
  selectedProjectId,
  onSelectProject,
  onSubmit,
}: {
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
  onSubmit: (id: string) => void;
}) {
  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BookOpen
            className="mx-auto mb-3 size-10 text-muted-foreground/40"
            aria-hidden="true"
          />
          <p className="font-medium">No active projects</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Apply to a project and get approved to track milestones.
          </p>
        </CardContent>
      </Card>
    );
  }

  const project =
    projects.find((p) => p.id === selectedProjectId) ?? projects[0];

  return (
    <section className="flex flex-col gap-4" aria-label="Milestone tracker">
      {projects.length > 1 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">
            Select a project to view its milestones
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => {
              const completed = p.submissions.filter(
                (s) => s.status === "approved_coordinator"
              ).length;
              const total = p.milestones.length;
              const pct =
                total > 0 ? Math.round((completed / total) * 100) : 0;
              const isSelected = p.id === project.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelectProject(p.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    "rounded-lg border p-4 text-left transition-all",
                    "hover:border-primary/60 hover:shadow-sm",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-card"
                  )}
                >
                  <p
                    className={cn(
                      "text-sm font-medium leading-snug",
                      isSelected && "text-primary"
                    )}
                  >
                    {p.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.degree} · {p.mentorName}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <Progress
                      value={pct}
                      className="h-1.5 flex-1"
                      aria-label={`${pct}% complete`}
                    />
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {completed}/{total} done
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Milestone Tracker</CardTitle>
          <CardDescription className="line-clamp-2">
            {project.title}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="relative flex flex-col">
            {project.milestones.map((m, idx) => {
              const sub = project.submissions.find(
                (s) => s.milestoneId === m.id
              );
              const status: MilestoneStatus = sub?.status ?? "not_started";
              const cfg = STATUS_CONFIG[status];
              const Icon = cfg.icon;
              const canSubmit =
                status === "not_started" || status === "rejected";
              const isLast = idx === project.milestones.length - 1;

              return (
                <li key={m.id} className="flex gap-4">
                  <div
                    className="flex flex-col items-center"
                    aria-hidden="true"
                  >
                    <div
                      className={cn(
                        "z-10 flex size-9 shrink-0 items-center justify-center rounded-full border-2 bg-card",
                        cfg.ring
                      )}
                    >
                      <Icon className="size-4" />
                    </div>
                    {!isLast && <div className="my-1 w-0.5 flex-1 bg-border" />}
                  </div>

                  <div className={cn("flex-1 pb-6", isLast && "pb-0")}>
                    <Card className="overflow-hidden">
                      <CardContent className="flex flex-col gap-3 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">
                              {m.name}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Due:{" "}
                              <time dateTime={m.dueDate}>
                                {new Date(m.dueDate).toLocaleDateString()}
                              </time>{" "}
                              · Weight: {m.weight}%
                            </p>
                          </div>
                          <span
                            className={cn(
                              "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                              cfg.badge
                            )}
                          >
                            {cfg.label}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          <StateStep
                            label="Submitted"
                            active={[
                              "submitted",
                              "approved_mentor",
                              "approved_coordinator",
                            ].includes(status)}
                          />
                          <ChevronRight
                            className="size-3 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <StateStep
                            label="Mentor Approved"
                            active={[
                              "approved_mentor",
                              "approved_coordinator",
                            ].includes(status)}
                          />
                          <ChevronRight
                            className="size-3 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <StateStep
                            label="Coordinator Approved"
                            active={status === "approved_coordinator"}
                          />
                        </div>

                        {sub?.mentorFeedback && (
                          <div className="rounded-md bg-muted/50 p-3 text-xs">
                            <span className="font-medium">
                              Mentor feedback:{" "}
                            </span>
                            {sub.mentorFeedback}
                          </div>
                        )}
                        {sub?.mentorGrade !== undefined && (
                          <p className="text-sm font-semibold">
                            Grade:{" "}
                            <span className="text-primary tabular-nums">
                              {sub.mentorGrade}/100
                            </span>
                          </p>
                        )}

                        {canSubmit && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="self-start"
                            onClick={() => onSubmit(m.id)}
                          >
                            <Upload />
                            {status === "rejected"
                              ? "Resubmit"
                              : "Submit Work"}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>
    </section>
  );
}

function StateStep({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs transition-colors",
        active
          ? "bg-primary/15 font-medium text-primary"
          : "bg-muted text-muted-foreground"
      )}
    >
      {label}
    </span>
  );
}
