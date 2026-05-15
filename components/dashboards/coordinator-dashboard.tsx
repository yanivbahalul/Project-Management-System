"use client";

import React, { useMemo, useState } from "react";
import {
  DEGREE_PROGRAMS,
  calculateFinalGrade,
  type DegreeProgram,
  type MilestoneDefinition,
  type Project,
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
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Save,
  Settings2,
  Users,
  XCircle,
} from "lucide-react";
import { StatCard } from "./stat-card";

interface Reviewer {
  id: string;
  name: string;
  department: string;
}

const REVIEWERS: Reviewer[] = [
  { id: "r001", name: "Dr. Amir Ben-David", department: "Software Engineering" },
  { id: "r002", name: "Dr. Liat Goldberg", department: "Computer Science" },
  { id: "r003", name: "Prof. Yaron Tal", department: "Data Science" },
];

interface CoordinatorDashboardProps {
  view: string;
}

export function CoordinatorDashboard({ view }: CoordinatorDashboardProps) {
  const { addNotification } = useNotificationStore();
  const {
    projects,
    assignReviewer: storeAssignReviewer,
    updateSubmission,
  } = useDataStore();
  const [programs, setPrograms] = useState<DegreeProgram[]>(DEGREE_PROGRAMS);

  function assignReviewer(projectId: string, reviewerId: string) {
    const reviewer = REVIEWERS.find((r) => r.id === reviewerId);
    if (!reviewer) return;

    const currentProject = projects.find((p) => p.id === projectId);
    if (currentProject?.reviewerId === reviewerId) return;

    storeAssignReviewer(projectId, reviewerId, reviewer.name);
    toast.success(`Reviewer assigned: ${reviewer.name}`);
    addNotification({
      type: "assignment",
      message: `You have been assigned as Reviewer for "${
        currentProject?.title ?? "a project"
      }".`,
      timestamp: new Date().toISOString(),
      read: false,
      targetRole: "reviewer",
    });
  }

  function approveMilestone(projectId: string, milestoneId: string) {
    const project = projects.find((p) => p.id === projectId);
    const submission = project?.submissions.find(
      (s) => s.milestoneId === milestoneId
    );
    if (!submission) {
      toast.error("No submission exists for this milestone.");
      return;
    }
    if (submission.status !== "approved_mentor") {
      toast.error(
        "Milestone must be graded by the mentor before coordinator approval."
      );
      return;
    }

    updateSubmission(projectId, milestoneId, {
      status: "approved_coordinator",
      coordinatorApproved: true,
    });
    toast.success("Milestone approved by Coordinator.");
    addNotification({
      type: "approval",
      message: "Coordinator approved your milestone. Final grade updated.",
      timestamp: new Date().toISOString(),
      read: false,
      targetRole: "student",
    });
  }

  function rejectMilestone(projectId: string, milestoneId: string) {
    const project = projects.find((p) => p.id === projectId);
    const submission = project?.submissions.find(
      (s) => s.milestoneId === milestoneId
    );
    if (!submission) {
      toast.error("No submission exists to reject.");
      return;
    }

    updateSubmission(projectId, milestoneId, { status: "rejected" });
    toast.error("Milestone sent back for revision.");
    addNotification({
      type: "rejection",
      message: "Coordinator sent your milestone back for revision.",
      timestamp: new Date().toISOString(),
      read: false,
      targetRole: "student",
    });
  }

  function updateMilestoneWeight(
    programId: string,
    milestoneId: string,
    weight: number
  ) {
    setPrograms((prev) =>
      prev.map((dp) =>
        dp.id === programId
          ? {
              ...dp,
              milestones: dp.milestones.map((m) =>
                m.id === milestoneId ? { ...m, weight } : m
              ),
            }
          : dp
      )
    );
  }

  if (view === "dashboard") return <CoordinatorOverview projects={projects} />;
  if (view === "projects")
    return (
      <AllProjects
        projects={projects}
        reviewers={REVIEWERS}
        onAssign={assignReviewer}
      />
    );
  if (view === "reviewers")
    return (
      <AssignReviewers
        projects={projects}
        reviewers={REVIEWERS}
        onAssign={assignReviewer}
      />
    );
  if (view === "grades")
    return (
      <GradeApproval
        projects={projects}
        onApprove={approveMilestone}
        onReject={rejectMilestone}
      />
    );
  if (view === "settings")
    return (
      <SettingsPage
        programs={programs}
        onWeightChange={updateMilestoneWeight}
      />
    );

  return null;
}

// ── Sub-views ───────────────────────────────────────────────────────────────

function CoordinatorOverview({ projects }: { projects: Project[] }) {
  const pendingApproval = projects.flatMap((p) =>
    p.submissions.filter((s) => s.status === "approved_mentor")
  ).length;
  const unassigned = projects.filter((p) => !p.reviewerId).length;
  const grades = useMemo(
    () =>
      projects
        .map((p) => calculateFinalGrade(p))
        .filter((g): g is number => g !== null),
    [projects]
  );
  const avgGrade =
    grades.length > 0
      ? Math.round(grades.reduce((a, b) => a + b, 0) / grades.length)
      : null;

  return (
    <section className="flex flex-col gap-6" aria-label="Coordinator overview">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Projects"
          value={projects.length}
          icon={BarChart3}
          tone="primary"
        />
        <StatCard
          title="Awaiting Approval"
          value={pendingApproval}
          icon={CheckCircle2}
          tone="warning"
        />
        <StatCard
          title="Unassigned Reviewers"
          value={unassigned}
          icon={Users}
          tone="destructive"
        />
        <StatCard
          title="Avg. Grade"
          value={avgGrade !== null ? avgGrade : "—"}
          sub={grades.length > 0 ? `${grades.length} graded` : "no grades yet"}
          icon={BarChart3}
          tone="success"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project Grade Overview</CardTitle>
          <CardDescription>
            Computed grade based on current milestone weights.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Mentor</TableHead>
                <TableHead>Reviewer</TableHead>
                <TableHead>Milestones Done</TableHead>
                <TableHead>Computed Grade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No projects yet.
                  </TableCell>
                </TableRow>
              ) : (
                projects.map((p) => {
                  const grade = calculateFinalGrade(p);
                  const done = p.submissions.filter(
                    (s) => s.status === "approved_coordinator"
                  ).length;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="max-w-[220px] truncate text-sm font-medium">
                        {p.title}
                      </TableCell>
                      <TableCell className="text-sm">{p.mentorName}</TableCell>
                      <TableCell className="text-sm">
                        {p.reviewerName ?? (
                          <Badge variant="secondary" className="text-xs">
                            Unassigned
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {done} / {p.milestones.length}
                      </TableCell>
                      <TableCell>
                        {grade !== null ? (
                          <span
                            className={cn(
                              "font-bold tabular-nums",
                              grade >= 70 ? "text-success" : "text-destructive"
                            )}
                          >
                            {grade}
                          </span>
                        ) : (
                          <span
                            className="text-muted-foreground"
                            aria-hidden="true"
                          >
                            —
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}

function AllProjects({
  projects,
  reviewers,
  onAssign,
}: {
  projects: Project[];
  reviewers: Reviewer[];
  onAssign: (projectId: string, reviewerId: string) => void;
}) {
  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BarChart3
            className="mx-auto mb-3 size-10 text-muted-foreground/40"
            aria-hidden="true"
          />
          <p className="font-medium">No projects yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Mentors can post projects from their dashboards.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {projects.map((p) => {
        const grade = calculateFinalGrade(p);
        return (
          <Card key={p.id}>
            <CardContent className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{p.title}</p>
                    <Badge variant="outline">{p.degree}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.mentorName} · {p.department}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.technologies.map((t) => (
                      <Badge key={t} variant="secondary" className="text-xs">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:min-w-[180px]">
                  {grade !== null && (
                    <p className="text-sm font-semibold sm:text-right">
                      Grade:{" "}
                      <span className="text-primary tabular-nums">{grade}</span>
                    </p>
                  )}
                  <Select
                    value={p.reviewerId ?? ""}
                    onValueChange={(value) => value && onAssign(p.id, value)}
                  >
                    <SelectTrigger
                      className="w-full"
                      aria-label={`Assign reviewer for ${p.title}`}
                    >
                      <SelectValue placeholder="Assign Reviewer" />
                    </SelectTrigger>
                    <SelectContent>
                      {reviewers.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function AssignReviewers({
  projects,
  reviewers,
  onAssign,
}: {
  projects: Project[];
  reviewers: Reviewer[];
  onAssign: (projectId: string, reviewerId: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Assign Reviewers to Projects
        </CardTitle>
        <CardDescription>
          Each project&apos;s defense exam will be graded by the assigned
          reviewer.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Current Reviewer</TableHead>
              <TableHead className="text-right">Assign</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-10 text-center text-muted-foreground"
                >
                  No projects available.
                </TableCell>
              </TableRow>
            ) : (
              projects.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <p className="text-sm font-medium">{p.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.mentorName}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm">{p.department}</TableCell>
                  <TableCell>
                    {p.reviewerName ? (
                      <Badge variant="secondary">{p.reviewerName}</Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-muted-foreground"
                      >
                        Unassigned
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Select
                      value={p.reviewerId ?? ""}
                      onValueChange={(value) =>
                        value && onAssign(p.id, value)
                      }
                    >
                      <SelectTrigger
                        className="w-[200px]"
                        aria-label={`Assign reviewer to ${p.title}`}
                      >
                        <SelectValue placeholder="Select reviewer..." />
                      </SelectTrigger>
                      <SelectContent>
                        {reviewers.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function GradeApproval({
  projects,
  onApprove,
  onReject,
}: {
  projects: Project[];
  onApprove: (pId: string, mId: string) => void;
  onReject: (pId: string, mId: string) => void;
}) {
  const rows = useMemo(
    () =>
      projects.flatMap((p) =>
        p.submissions
          .filter((s) => s.status === "approved_mentor")
          .map((s) => ({ project: p, submission: s }))
      ),
    [projects]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Milestone Grade Approval</CardTitle>
        <CardDescription>
          Review mentor-graded milestones and approve or send back for revision.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="py-12 text-center">
            <CheckCircle2
              className="mx-auto mb-3 size-10 text-muted-foreground/40"
              aria-hidden="true"
            />
            <p className="font-medium">All caught up</p>
            <p className="mt-1 text-sm text-muted-foreground">
              No milestones awaiting coordinator approval.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Milestone</TableHead>
                <TableHead>Mentor Grade</TableHead>
                <TableHead>Feedback</TableHead>
                <TableHead className="text-right">Decision</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ project, submission }) => {
                const milestone = project.milestones.find(
                  (m) => m.id === submission.milestoneId
                );
                return (
                  <TableRow key={`${project.id}-${submission.milestoneId}`}>
                    <TableCell>
                      <p className="max-w-[200px] truncate text-sm font-medium">
                        {project.title}
                      </p>
                    </TableCell>
                    <TableCell>{milestone?.name}</TableCell>
                    <TableCell className="font-bold text-primary tabular-nums">
                      {submission.mentorGrade ?? "—"}
                    </TableCell>
                    <TableCell
                      className="max-w-[240px] truncate text-sm text-muted-foreground"
                      title={submission.mentorFeedback ?? undefined}
                    >
                      {submission.mentorFeedback ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          className="bg-success text-success-foreground hover:bg-success/90"
                          onClick={() =>
                            onApprove(project.id, submission.milestoneId)
                          }
                          aria-label={`Approve ${milestone?.name} for ${project.title}`}
                        >
                          <CheckCircle2 />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            onReject(project.id, submission.milestoneId)
                          }
                          aria-label={`Reject ${milestone?.name} for ${project.title}`}
                        >
                          <XCircle />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function SettingsPage({
  programs,
  onWeightChange,
}: {
  programs: DegreeProgram[];
  onWeightChange: (programId: string, milestoneId: string, weight: number) => void;
}) {
  const [activeProgram, setActiveProgram] = useState(programs[0].id);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="size-4" aria-hidden="true" />
            Degree Program Configuration
          </CardTitle>
          <CardDescription>
            Define milestones and set grade weights for each degree program.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Tabs value={activeProgram} onValueChange={setActiveProgram}>
            <TabsList className="flex flex-wrap h-auto">
              {programs.map((dp) => (
                <TabsTrigger key={dp.id} value={dp.id} className="text-xs">
                  {dp.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {programs.map((dp) => {
              const dpTotalWeight = dp.milestones.reduce(
                (a, m) => a + m.weight,
                0
              );
              const balanced = dpTotalWeight === 100;
              return (
                <TabsContent key={dp.id} value={dp.id} className="mt-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                      {dp.name} — {dp.department}
                    </p>
                    <Badge
                      variant={balanced ? "default" : "destructive"}
                      className={cn(
                        "tabular-nums",
                        balanced && "bg-success text-success-foreground"
                      )}
                    >
                      Total Weight: {dpTotalWeight}%
                    </Badge>
                  </div>

                  <div className="flex flex-col gap-4">
                    {dp.milestones.map((m) => (
                      <MilestoneWeightCard
                        key={m.id}
                        milestone={m}
                        onWeightChange={(w) => onWeightChange(dp.id, m.id, w)}
                      />
                    ))}
                  </div>

                  {!balanced && (
                    <div
                      role="alert"
                      className="mt-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
                    >
                      <AlertCircle
                        className="mt-0.5 size-4 shrink-0"
                        aria-hidden="true"
                      />
                      <p>
                        Total weight must equal 100%. Current total:{" "}
                        <strong className="tabular-nums">
                          {dpTotalWeight}%
                        </strong>
                        .
                      </p>
                    </div>
                  )}

                  <Button
                    className="mt-5"
                    onClick={() => toast.success("Settings saved!")}
                    disabled={!balanced}
                  >
                    <Save />
                    Save Configuration
                  </Button>
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Milestone Grading Parameters
          </CardTitle>
          <CardDescription>
            Detailed scoring criteria applied when mentors grade each milestone.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {(programs.find((p) => p.id === activeProgram)?.milestones ?? []).map(
            (m) => (
              <div key={m.id} className="rounded-lg border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold">{m.name}</p>
                  <Badge variant="outline" className="tabular-nums">
                    {m.weight}% weight
                  </Badge>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {m.gradingParams.map((gp) => (
                    <div
                      key={gp.id}
                      className="flex items-start justify-between gap-2 rounded-md bg-muted/40 p-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{gp.name}</p>
                        <p className="text-muted-foreground">
                          {gp.description}
                        </p>
                      </div>
                      <span className="shrink-0 font-bold tabular-nums">
                        {gp.maxScore}pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MilestoneWeightCard({
  milestone,
  onWeightChange,
}: {
  milestone: MilestoneDefinition;
  onWeightChange: (w: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">{milestone.name}</p>
          <p className="text-xs text-muted-foreground">
            {milestone.description}
          </p>
        </div>
        <span className="shrink-0 text-sm font-bold text-primary tabular-nums">
          {milestone.weight}%
        </span>
      </div>
      <Slider
        min={1}
        max={70}
        step={1}
        value={[milestone.weight]}
        onValueChange={([v]) => onWeightChange(v)}
        className="w-full"
        aria-label={`${milestone.name} weight, ${milestone.weight}%`}
      />
      <p className="text-xs text-muted-foreground">
        Due:{" "}
        <time dateTime={milestone.dueDate}>
          {new Date(milestone.dueDate).toLocaleDateString()}
        </time>
      </p>
    </div>
  );
}
