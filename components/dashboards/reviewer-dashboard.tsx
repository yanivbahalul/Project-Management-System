"use client";

import React, { useMemo, useState } from "react";
import { CURRENT_USERS, type Project } from "@/lib/mock-data";
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
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { BookOpen, CheckSquare2, ShieldCheck, Star } from "lucide-react";
import { StatCard } from "./stat-card";
import { trimToLength } from "@/lib/utils";

const DEFENSE_MILESTONE_ID = "m4";

interface ReviewerDashboardProps {
  view: string;
}

export function ReviewerDashboard({ view }: ReviewerDashboardProps) {
  const reviewer = CURRENT_USERS.reviewer;
  const { projects, updateSubmission } = useDataStore();
  const { addNotification } = useNotificationStore();

  const myProjects = useMemo(
    () => projects.filter((p) => p.reviewerId === reviewer.id),
    [projects, reviewer.id]
  );

  const [gradeDialog, setGradeDialog] = useState<Project | null>(null);
  const [paramGrades, setParamGrades] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState("");

  function openDefenseGrading(project: Project) {
    const milestone = project.milestones.find(
      (m) => m.id === DEFENSE_MILESTONE_ID
    );
    if (!milestone) return;
    const initial: Record<string, number> = {};
    milestone.gradingParams.forEach((p) => (initial[p.id] = 0));
    setParamGrades(initial);
    setFeedback("");
    setGradeDialog(project);
  }

  function submitDefenseGrade() {
    if (!gradeDialog) return;
    const milestone = gradeDialog.milestones.find(
      (m) => m.id === DEFENSE_MILESTONE_ID
    );
    if (!milestone) return;

    const existing = gradeDialog.submissions.find(
      (s) => s.milestoneId === DEFENSE_MILESTONE_ID
    );
    if (existing?.status === "approved_coordinator") {
      toast.error("Defense is already finalised.");
      setGradeDialog(null);
      return;
    }

    const cappedParamGrades: Record<string, number> = {};
    for (const p of milestone.gradingParams) {
      const raw = paramGrades[p.id] ?? 0;
      const safe = Number.isFinite(raw) ? raw : 0;
      cappedParamGrades[p.id] = Math.min(
        p.maxScore,
        Math.max(0, Math.round(safe))
      );
    }
    const total = Object.values(cappedParamGrades).reduce((a, b) => a + b, 0);
    const maxTotal = milestone.gradingParams.reduce(
      (a, p) => a + p.maxScore,
      0
    );
    const normalized =
      maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;

    updateSubmission(gradeDialog.id, DEFENSE_MILESTONE_ID, {
      status: "approved_mentor",
      mentorGrade: normalized,
      mentorFeedback: trimToLength(feedback, 2000),
      paramGrades: cappedParamGrades,
      ...(existing?.submittedAt ? {} : { submittedAt: new Date().toISOString() }),
    });

    toast.success(`Defense grade submitted: ${normalized}/100`, {
      description: gradeDialog.title,
    });
    addNotification({
      type: "grade",
      message: `Reviewer graded your Defense Exam — ${normalized}/100. Awaiting coordinator approval.`,
      timestamp: new Date().toISOString(),
      read: false,
      targetRole: "student",
    });
    addNotification({
      type: "approval",
      message: `Reviewer graded the Defense for "${gradeDialog.title}" — ${normalized}/100. Awaiting your approval.`,
      timestamp: new Date().toISOString(),
      read: false,
      targetRole: "coordinator",
    });
    setGradeDialog(null);
  }

  const totalScore = useMemo(
    () => Object.values(paramGrades).reduce((a, b) => a + b, 0),
    [paramGrades]
  );
  const maxScore = useMemo(
    () =>
      gradeDialog?.milestones
        .find((m) => m.id === DEFENSE_MILESTONE_ID)
        ?.gradingParams.reduce((a, p) => a + p.maxScore, 0) ?? 0,
    [gradeDialog]
  );

  function renderContent() {
    if (view === "dashboard")
      return (
        <ReviewerOverview projects={myProjects} onGrade={openDefenseGrading} />
      );
    if (view === "projects")
      return (
        <AssignedProjects projects={myProjects} onGrade={openDefenseGrading} />
      );
    if (view === "grading")
      return (
        <GradeDefensePanel projects={myProjects} onGrade={openDefenseGrading} />
      );
    return null;
  }

  return (
    <>
      {renderContent()}

      <Dialog
        open={!!gradeDialog}
        onOpenChange={(o) => !o && setGradeDialog(null)}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Grade Defense Exam</DialogTitle>
            <DialogDescription className="line-clamp-2">
              {gradeDialog?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5 py-2">
            <div
              className="flex items-center justify-between gap-4 rounded-lg border bg-muted/40 p-4"
              aria-live="polite"
            >
              <div>
                <p className="text-sm font-medium">Defense Score</p>
                <p className="text-2xl font-bold text-primary tabular-nums">
                  {totalScore} / {maxScore}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Normalized</p>
                <p className="text-xl font-semibold tabular-nums">
                  {maxScore > 0
                    ? Math.round((totalScore / maxScore) * 100)
                    : 0}
                  /100
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <p className="text-sm font-semibold">
                Detailed Grading Parameters
              </p>
              {gradeDialog?.milestones
                .find((m) => m.id === DEFENSE_MILESTONE_ID)
                ?.gradingParams.map((param) => (
                  <div
                    key={param.id}
                    className="flex flex-col gap-3 rounded-lg border p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{param.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {param.description}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums">
                        {paramGrades[param.id] ?? 0} / {param.maxScore}
                      </span>
                    </div>
                    <Slider
                      min={0}
                      max={param.maxScore}
                      step={1}
                      value={[paramGrades[param.id] ?? 0]}
                      onValueChange={([v]) =>
                        setParamGrades((prev) => ({ ...prev, [param.id]: v }))
                      }
                      aria-label={`${param.name} score, ${
                        paramGrades[param.id] ?? 0
                      } of ${param.maxScore}`}
                    />
                  </div>
                ))}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="reviewer-feedback" className="text-sm font-medium">
                Reviewer Feedback
              </label>
              <Textarea
                id="reviewer-feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Provide feedback on the student's defense performance..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGradeDialog(null)}>
              Cancel
            </Button>
            <Button onClick={submitDefenseGrade}>
              <ShieldCheck />
              Submit Defense Grade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Sub-views ───────────────────────────────────────────────────────────────

function ReviewerOverview({
  projects,
  onGrade,
}: {
  projects: Project[];
  onGrade: (p: Project) => void;
}) {
  const pending = projects.filter((p) => {
    const defenseSub = p.submissions.find(
      (s) => s.milestoneId === DEFENSE_MILESTONE_ID
    );
    return !defenseSub || defenseSub.status === "not_started";
  }).length;

  return (
    <section className="flex flex-col gap-6" aria-label="Reviewer overview">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          title="Assigned Projects"
          value={projects.length}
          icon={BookOpen}
          tone="primary"
        />
        <StatCard
          title="Defense Exams Pending"
          value={pending}
          icon={CheckSquare2}
          tone="warning"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Projects to Review</CardTitle>
          <CardDescription>
            Defense exams you have been assigned to grade.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="py-12 text-center">
              <BookOpen
                className="mx-auto mb-3 size-10 text-muted-foreground/40"
                aria-hidden="true"
              />
              <p className="font-medium">No projects assigned</p>
              <p className="mt-1 text-sm text-muted-foreground">
                The coordinator will assign you projects to review.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {projects.map((p) => {
                const defenseSub = p.submissions.find(
                  (s) => s.milestoneId === DEFENSE_MILESTONE_ID
                );
                const graded = defenseSub?.mentorGrade !== undefined;
                return (
                  <li
                    key={p.id}
                    className="flex flex-col gap-4 rounded-lg border p-4 transition-shadow hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{p.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Mentor: {p.mentorName} · {p.department}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {p.technologies.map((t) => (
                          <Badge key={t} variant="secondary" className="text-xs">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {graded ? (
                        <Badge className="bg-success text-success-foreground">
                          Graded
                        </Badge>
                      ) : (
                        <Button size="sm" onClick={() => onGrade(p)}>
                          <Star />
                          Grade Defense
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function AssignedProjects({
  projects,
  onGrade,
}: {
  projects: Project[];
  onGrade: (p: Project) => void;
}) {
  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BookOpen
            className="mx-auto mb-3 size-10 text-muted-foreground/40"
            aria-hidden="true"
          />
          <p className="font-medium">No assigned projects</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The coordinator will assign you projects to review.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {projects.map((p) => {
        const completedCount = p.submissions.filter(
          (s) => s.status === "approved_coordinator"
        ).length;
        const progress =
          p.milestones.length > 0
            ? Math.round((completedCount / p.milestones.length) * 100)
            : 0;
        const defenseSub = p.submissions.find(
          (s) => s.milestoneId === DEFENSE_MILESTONE_ID
        );
        const graded = defenseSub?.mentorGrade !== undefined;
        return (
          <Card key={p.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-balance text-sm">{p.title}</CardTitle>
                <Badge variant="outline" className="shrink-0">
                  {p.degree}
                </Badge>
              </div>
              <CardDescription className="line-clamp-2 text-xs">
                {p.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-0">
              <div>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span>Overall Progress</span>
                  <span className="tabular-nums">{progress}%</span>
                </div>
                <Progress
                  value={progress}
                  className="h-1.5"
                  aria-label={`${progress}% complete`}
                />
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Milestone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Mentor Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {p.milestones.map((m) => {
                    const sub = p.submissions.find(
                      (s) => s.milestoneId === m.id
                    );
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="text-sm">{m.name}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="text-xs capitalize"
                          >
                            {(sub?.status ?? "not_started").replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold tabular-nums">
                          {sub?.mentorGrade !== undefined
                            ? `${sub.mentorGrade}/100`
                            : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <Button
                size="sm"
                className="self-start"
                onClick={() => onGrade(p)}
                disabled={graded}
              >
                <Star />
                {graded ? "Defense Graded" : "Grade Defense"}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function GradeDefensePanel({
  projects,
  onGrade,
}: {
  projects: Project[];
  onGrade: (p: Project) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Defense Exam Grading</CardTitle>
        <CardDescription>
          Grade the final defense exam for your assigned projects.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Mentor</TableHead>
              <TableHead>Defense Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-10 text-center text-muted-foreground"
                >
                  No projects assigned.
                </TableCell>
              </TableRow>
            ) : (
              projects.map((p) => {
                const defenseSub = p.submissions.find(
                  (s) => s.milestoneId === DEFENSE_MILESTONE_ID
                );
                const graded = defenseSub?.mentorGrade !== undefined;
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <p className="text-sm font-medium">{p.title}</p>
                    </TableCell>
                    <TableCell className="text-sm">{p.mentorName}</TableCell>
                    <TableCell>
                      {graded ? (
                        <Badge className="bg-success text-xs text-success-foreground">
                          Graded
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => onGrade(p)}
                        disabled={graded}
                        aria-label={
                          graded
                            ? `Defense already graded for ${p.title}`
                            : `Grade defense for ${p.title}`
                        }
                      >
                        <Star />
                        {graded ? "Graded" : "Grade Defense"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
