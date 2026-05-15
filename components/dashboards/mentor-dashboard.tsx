"use client";

import React, { useMemo, useState } from "react";
import {
  CURRENT_USERS,
  DEGREE_PROGRAMS,
  type Application,
  type MilestoneDefinition,
  type MilestoneSubmission,
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
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, makeId, trimToLength } from "@/lib/utils";
import { toast } from "sonner";
import {
  CheckCircle2,
  Download,
  Eye,
  FileText,
  FileWarning,
  FolderOpen,
  Paperclip,
  PlusCircle,
  Star,
  Users,
  XCircle,
} from "lucide-react";
import { StatCard } from "./stat-card";

interface MentorDashboardProps {
  view: string;
}

interface GradingTarget {
  project: Project;
  milestone: MilestoneDefinition;
  submission: MilestoneSubmission;
}

export function MentorDashboard({ view }: MentorDashboardProps) {
  const mentor = CURRENT_USERS.mentor;

  const {
    projects,
    applications,
    addProject,
    updateSubmission,
    updateApplicationStatus,
  } = useDataStore();
  const { addNotification } = useNotificationStore();

  const myProjects = useMemo(
    () => projects.filter((p) => p.mentorId === mentor.id),
    [projects, mentor.id]
  );
  const myApplications = useMemo(
    () =>
      applications.filter((a) =>
        myProjects.some((p) => p.id === a.projectId)
      ),
    [applications, myProjects]
  );

  const [gradingTarget, setGradingTarget] = useState<GradingTarget | null>(
    null
  );
  const [paramGrades, setParamGrades] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState("");

  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    title: "",
    description: "",
    degree: "",
    technologies: "",
  });

  const [viewingApp, setViewingApp] = useState<Application | null>(null);

  function openGrading(project: Project, milestoneId: string) {
    const milestone = project.milestones.find((m) => m.id === milestoneId);
    const submission = project.submissions.find(
      (s) => s.milestoneId === milestoneId
    );
    if (!milestone || !submission) {
      toast.error("This milestone has not been submitted yet.");
      return;
    }
    if (submission.status === "approved_coordinator") {
      toast.error("Already approved by the coordinator — grading is locked.");
      return;
    }
    const initial: Record<string, number> = {};
    milestone.gradingParams.forEach((p) => {
      initial[p.id] = submission.paramGrades?.[p.id] ?? 0;
    });
    setParamGrades(initial);
    setFeedback(submission.mentorFeedback ?? "");
    setGradingTarget({ project, milestone, submission });
  }

  function submitGrade() {
    if (!gradingTarget) return;

    const cappedParamGrades: Record<string, number> = {};
    for (const param of gradingTarget.milestone.gradingParams) {
      const raw = paramGrades[param.id] ?? 0;
      const safe = Number.isFinite(raw) ? raw : 0;
      cappedParamGrades[param.id] = Math.min(
        param.maxScore,
        Math.max(0, Math.round(safe))
      );
    }

    const total = Object.values(cappedParamGrades).reduce((a, b) => a + b, 0);
    const maxTotal = gradingTarget.milestone.gradingParams.reduce(
      (a, p) => a + p.maxScore,
      0
    );
    const normalized =
      maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;

    updateSubmission(gradingTarget.project.id, gradingTarget.milestone.id, {
      status: "approved_mentor",
      mentorGrade: normalized,
      mentorFeedback: trimToLength(feedback, 2000),
      paramGrades: cappedParamGrades,
    });

    toast.success(`Grade submitted: ${normalized}/100`, {
      description: `Milestone: ${gradingTarget.milestone.name}`,
    });
    addNotification({
      type: "grade",
      message: `${mentor.name} graded your milestone "${gradingTarget.milestone.name}" — ${normalized}/100.`,
      timestamp: new Date().toISOString(),
      read: false,
      targetRole: "student",
    });
    addNotification({
      type: "approval",
      message: `Mentor graded milestone "${gradingTarget.milestone.name}". Awaiting your approval.`,
      timestamp: new Date().toISOString(),
      read: false,
      targetRole: "coordinator",
    });
    setGradingTarget(null);
  }

  function handleAddProject() {
    const title = newProject.title.trim();
    const description = newProject.description.trim();
    if (!title || !description || !newProject.degree) {
      toast.error("Please fill in all required fields");
      return;
    }

    const program = DEGREE_PROGRAMS.find((p) => p.name === newProject.degree);
    if (!program) {
      toast.error("Unknown degree program. Please pick from the list.");
      return;
    }

    const project: Project = {
      id: makeId("p_"),
      title: trimToLength(title, 200),
      description: trimToLength(description, 2000),
      degree: newProject.degree,
      department: mentor.department,
      mentorId: mentor.id,
      mentorName: mentor.name,
      technologies: Array.from(
        new Map(
          newProject.technologies
            .split(",")
            .map((t) => trimToLength(t, 40))
            .filter(Boolean)
            .map((t) => [t.toLowerCase(), t])
        ).values()
      ).slice(0, 20),
      milestones: program.milestones,
      submissions: [],
      status: "open",
    };

    addProject(project);
    toast.success("Project created successfully!", {
      description: project.title,
    });
    setAddProjectOpen(false);
    setNewProject({ title: "", description: "", degree: "", technologies: "" });
  }

  function handleApplicationDecision(app: Application, approved: boolean) {
    if (app.status !== "pending") {
      toast.error(`Application is already ${app.status}.`);
      setViewingApp(null);
      return;
    }

    updateApplicationStatus(app.id, approved ? "approved" : "rejected");

    if (approved) {
      const project = myProjects.find((p) => p.id === app.projectId);
      if (project && project.status !== "in_progress") {
        useDataStore
          .getState()
          .updateProject(project.id, { status: "in_progress" });
      }
    }

    toast[approved ? "success" : "error"](
      approved
        ? `Application approved for ${app.studentName}`
        : `Application rejected for ${app.studentName}`
    );
    addNotification({
      type: approved ? "approval" : "rejection",
      message: approved
        ? `Your application for "${app.projectTitle}" was approved!`
        : `Your application for "${app.projectTitle}" was rejected.`,
      timestamp: new Date().toISOString(),
      read: false,
      targetRole: "student",
    });
    setViewingApp(null);
  }

  const totalScore = useMemo(
    () => Object.values(paramGrades).reduce((a, b) => a + b, 0),
    [paramGrades]
  );
  const maxScore = useMemo(
    () =>
      gradingTarget?.milestone.gradingParams.reduce(
        (a, p) => a + p.maxScore,
        0
      ) ?? 0,
    [gradingTarget]
  );

  function renderContent() {
    if (view === "dashboard") {
      return (
        <MentorOverview
          projects={myProjects}
          applications={myApplications}
          openGrading={openGrading}
        />
      );
    }
    if (view === "projects") {
      return (
        <MentorProjects
          projects={myProjects}
          onAddProject={() => setAddProjectOpen(true)}
        />
      );
    }
    if (view === "applications") {
      return (
        <ApplicationsPanel
          applications={myApplications}
          onView={setViewingApp}
          onDecision={handleApplicationDecision}
        />
      );
    }
    if (view === "grading") {
      return <GradingPanel projects={myProjects} openGrading={openGrading} />;
    }
    return null;
  }

  return (
    <>
      {renderContent()}

      {/* Grading Dialog */}
      <Dialog
        open={!!gradingTarget}
        onOpenChange={(o) => !o && setGradingTarget(null)}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Grade Milestone: {gradingTarget?.milestone.name}
            </DialogTitle>
            <DialogDescription className="line-clamp-2">
              {gradingTarget?.project.title}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5 py-2">
            <div
              className="flex items-center justify-between gap-4 rounded-lg border bg-muted/40 p-4"
              aria-live="polite"
            >
              <div>
                <p className="text-sm font-medium">Current Score</p>
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

            <div className="flex flex-col gap-2">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Paperclip
                  className="size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                Student Submission
              </p>
              {gradingTarget?.submission.submittedAt && (
                <p className="text-xs text-muted-foreground">
                  Submitted{" "}
                  <time dateTime={gradingTarget.submission.submittedAt}>
                    {new Date(
                      gradingTarget.submission.submittedAt
                    ).toLocaleString()}
                  </time>
                </p>
              )}
              {gradingTarget?.submission.fileUrl ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start font-normal"
                  onClick={() =>
                    toast.info(
                      `Downloading ${gradingTarget.submission.fileUrl}`,
                      {
                        description:
                          "In a real deployment this would open the uploaded submission.",
                      }
                    )
                  }
                >
                  <FileText />
                  <span className="flex-1 truncate text-left">
                    {gradingTarget.submission.fileUrl}
                  </span>
                  <Download className="size-4" />
                </Button>
              ) : (
                <div className="flex items-start gap-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                  <FileWarning
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden="true"
                  />
                  <p>
                    No file was uploaded with this submission. The student may
                    have submitted before the upload feature was enabled.
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <p className="text-sm font-semibold">
                Detailed Grading Parameters
              </p>
              {gradingTarget?.milestone.gradingParams.map((param) => (
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
                    className="w-full"
                    aria-label={`${param.name} score, ${
                      paramGrades[param.id] ?? 0
                    } of ${param.maxScore}`}
                  />
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="mentor-feedback" className="text-sm font-medium">
                Mentor Feedback
              </label>
              <Textarea
                id="mentor-feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Provide constructive feedback for the student..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGradingTarget(null)}>
              Cancel
            </Button>
            <Button onClick={submitGrade}>
              <Star />
              Submit Grade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Project Dialog */}
      <Dialog open={addProjectOpen} onOpenChange={setAddProjectOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Post New Project</DialogTitle>
            <DialogDescription>
              Create a new final project for students to apply to.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="new-title" className="text-sm font-medium">
                Project Title <span className="text-destructive">*</span>
              </label>
              <Input
                id="new-title"
                value={newProject.title}
                onChange={(e) =>
                  setNewProject((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="e.g., AI-Powered Student Assistant"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="new-desc" className="text-sm font-medium">
                Description <span className="text-destructive">*</span>
              </label>
              <Textarea
                id="new-desc"
                value={newProject.description}
                onChange={(e) =>
                  setNewProject((p) => ({
                    ...p,
                    description: e.target.value,
                  }))
                }
                placeholder="Describe the project goals, requirements, and expected outcomes..."
                rows={3}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="new-degree" className="text-sm font-medium">
                Degree Program <span className="text-destructive">*</span>
              </label>
              <Select
                value={newProject.degree}
                onValueChange={(v) =>
                  setNewProject((p) => ({ ...p, degree: v }))
                }
              >
                <SelectTrigger id="new-degree">
                  <SelectValue placeholder="Select degree program" />
                </SelectTrigger>
                <SelectContent>
                  {DEGREE_PROGRAMS.map((dp) => (
                    <SelectItem key={dp.id} value={dp.name}>
                      {dp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="new-tech" className="text-sm font-medium">
                Technologies (comma-separated)
              </label>
              <Input
                id="new-tech"
                value={newProject.technologies}
                onChange={(e) =>
                  setNewProject((p) => ({
                    ...p,
                    technologies: e.target.value,
                  }))
                }
                placeholder="e.g., Python, TensorFlow, React, PostgreSQL"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddProjectOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddProject}>
              <PlusCircle />
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Application Dialog */}
      <Dialog
        open={!!viewingApp}
        onOpenChange={(o) => !o && setViewingApp(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription className="line-clamp-2">
              {viewingApp?.projectTitle}
            </DialogDescription>
          </DialogHeader>

          {viewingApp && (
            <div className="flex flex-col gap-4 py-2">
              <div className="flex items-center gap-4 rounded-lg border bg-muted/40 p-4">
                <div
                  className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary"
                  aria-hidden="true"
                >
                  {viewingApp.studentName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {viewingApp.studentName}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {viewingApp.studentEmail}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">GPA</p>
                  <p className="text-xl font-bold text-primary tabular-nums">
                    {viewingApp.gpa}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Applied</p>
                  <p className="text-sm font-medium">
                    <time dateTime={viewingApp.appliedAt}>
                      {new Date(viewingApp.appliedAt).toLocaleDateString()}
                    </time>
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Attached Documents</p>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start"
                    onClick={() => {
                      const fname = `cv-${viewingApp.studentName
                        .split(" ")[0]
                        .toLowerCase()}.pdf`;
                      toast.info(`Downloading ${fname}`, {
                        description:
                          "Mock download — wire up to your storage backend.",
                      });
                    }}
                  >
                    <FileText />
                    CV / Resume
                    <Download className="ml-auto size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start"
                    onClick={() => {
                      const fname = `transcripts-${viewingApp.studentName
                        .split(" ")[0]
                        .toLowerCase()}.pdf`;
                      toast.info(`Downloading ${fname}`, {
                        description:
                          "Mock download — wire up to your storage backend.",
                      });
                    }}
                  >
                    <FileText />
                    Academic Transcripts
                    <Download className="ml-auto size-4" />
                  </Button>
                </div>
              </div>

              {viewingApp.status === "pending" ? (
                <>
                  <Separator />
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      className="flex-1 bg-success text-success-foreground hover:bg-success/90"
                      onClick={() =>
                        handleApplicationDecision(viewingApp, true)
                      }
                    >
                      <CheckCircle2 />
                      Approve Application
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() =>
                        handleApplicationDecision(viewingApp, false)
                      }
                    >
                      <XCircle />
                      Reject
                    </Button>
                  </div>
                </>
              ) : (
                <div className="rounded-lg border p-3 text-center">
                  <Badge
                    variant={
                      viewingApp.status === "approved"
                        ? "default"
                        : "destructive"
                    }
                    className="capitalize"
                  >
                    {viewingApp.status}
                  </Badge>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Sub-views ───────────────────────────────────────────────────────────────

function MentorOverview({
  projects,
  applications,
  openGrading,
}: {
  projects: Project[];
  applications: Application[];
  openGrading: (p: Project, milestoneId: string) => void;
}) {
  const pending = applications.filter((a) => a.status === "pending").length;
  const pendingGradeRows = useMemo(
    () =>
      projects.flatMap((p) =>
        p.submissions
          .filter((s) => s.status === "submitted")
          .map((s) => ({ project: p, submission: s }))
      ),
    [projects]
  );

  return (
    <section className="flex flex-col gap-6" aria-label="Mentor overview">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="My Projects"
          value={projects.length}
          icon={FolderOpen}
          tone="primary"
        />
        <StatCard
          title="Pending Applications"
          value={pending}
          icon={Users}
          tone="warning"
        />
        <StatCard
          title="Milestones to Grade"
          value={pendingGradeRows.length}
          icon={Star}
          tone="destructive"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Milestones Awaiting Grading
          </CardTitle>
          <CardDescription>
            Review and grade student submissions to move them forward.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Milestone</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingGradeRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No milestones awaiting grading.
                  </TableCell>
                </TableRow>
              ) : (
                pendingGradeRows.map(({ project, submission }) => {
                  const m = project.milestones.find(
                    (x) => x.id === submission.milestoneId
                  );
                  return (
                    <TableRow
                      key={`${project.id}-${submission.milestoneId}`}
                    >
                      <TableCell className="max-w-[220px] truncate text-sm font-medium">
                        {project.title}
                      </TableCell>
                      <TableCell className="text-sm">{m?.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {submission.submittedAt ? (
                          <time dateTime={submission.submittedAt}>
                            {new Date(
                              submission.submittedAt
                            ).toLocaleDateString()}
                          </time>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() =>
                            openGrading(project, submission.milestoneId)
                          }
                        >
                          <Star />
                          Grade
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
    </section>
  );
}

function MentorProjects({
  projects,
  onAddProject,
}: {
  projects: Project[];
  onAddProject: () => void;
}) {
  return (
    <section className="flex flex-col gap-4" aria-label="My projects">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground tabular-nums">
            {projects.length}
          </span>{" "}
          {projects.length === 1 ? "project" : "projects"}
        </p>
        <Button variant="outline" onClick={onAddProject}>
          <PlusCircle />
          Post New Project
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {projects.map((p) => {
          const completedCount = p.submissions.filter(
            (s) => s.status === "approved_coordinator"
          ).length;
          const progress =
            p.milestones.length > 0
              ? Math.round((completedCount / p.milestones.length) * 100)
              : 0;
          return (
            <Card
              key={p.id}
              className="transition-shadow hover:shadow-md"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-balance text-sm">
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
              <CardContent className="flex flex-col gap-3 pt-0">
                <div className="flex flex-wrap gap-1">
                  {p.technologies.map((t) => (
                    <Badge key={t} variant="secondary" className="text-xs">
                      {t}
                    </Badge>
                  ))}
                </div>
                <div>
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span>Progress</span>
                    <span className="tabular-nums">{progress}%</span>
                  </div>
                  <Progress
                    value={progress}
                    className="h-1.5"
                    aria-label={`${progress}% complete`}
                  />
                </div>
                {p.reviewerName && (
                  <p className="text-xs text-muted-foreground">
                    Reviewer:{" "}
                    <span className="font-medium text-foreground/80">
                      {p.reviewerName}
                    </span>
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
        {projects.length === 0 && (
          <Card className="lg:col-span-2">
            <CardContent className="py-12 text-center">
              <FolderOpen
                className="mx-auto mb-3 size-10 text-muted-foreground/40"
                aria-hidden="true"
              />
              <p className="font-medium">No projects yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create your first project to start accepting applications.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}

function ApplicationsPanel({
  applications,
  onView,
  onDecision,
}: {
  applications: Application[];
  onView: (app: Application) => void;
  onDecision: (app: Application, approved: boolean) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Student Applications</CardTitle>
        <CardDescription>
          Review applications from students who want to work on your projects.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>GPA</TableHead>
              <TableHead>Applied</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground"
                >
                  No applications received yet.
                </TableCell>
              </TableRow>
            ) : (
              applications.map((app) => (
                <TableRow key={app.id}>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {app.studentName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {app.studentEmail}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate text-sm">
                    {app.projectTitle}
                  </TableCell>
                  <TableCell className="font-semibold tabular-nums">
                    {app.gpa}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <time dateTime={app.appliedAt}>
                      {new Date(app.appliedAt).toLocaleDateString()}
                    </time>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        app.status === "approved"
                          ? "default"
                          : app.status === "rejected"
                          ? "destructive"
                          : "secondary"
                      }
                      className="capitalize"
                    >
                      {app.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onView(app)}
                        aria-label={`View application from ${app.studentName}`}
                      >
                        <Eye />
                        View
                      </Button>
                      {app.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-success/40 text-success hover:bg-success/10"
                            onClick={() => onDecision(app, true)}
                            aria-label={`Approve ${app.studentName}`}
                          >
                            <CheckCircle2 />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-destructive/40 text-destructive hover:bg-destructive/10"
                            onClick={() => onDecision(app, false)}
                            aria-label={`Reject ${app.studentName}`}
                          >
                            <XCircle />
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
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

function GradingPanel({
  projects,
  openGrading,
}: {
  projects: Project[];
  openGrading: (p: Project, milestoneId: string) => void;
}) {
  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Star
            className="mx-auto mb-3 size-10 text-muted-foreground/40"
            aria-hidden="true"
          />
          <p className="font-medium">No projects to grade</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create projects and approve student applications first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {projects.map((p) => (
        <Card key={p.id}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{p.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Milestone</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {p.milestones.map((m) => {
                  const sub = p.submissions.find((s) => s.milestoneId === m.id);
                  const status = sub?.status ?? "not_started";
                  const canGrade =
                    status === "submitted" || status === "approved_mentor";
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell className="tabular-nums">{m.weight}%</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            status === "approved_coordinator"
                              ? "default"
                              : status === "rejected"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-xs capitalize"
                        >
                          {status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold tabular-nums">
                        {sub?.mentorGrade !== undefined
                          ? `${sub.mentorGrade}/100`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {canGrade ? (
                          <Button
                            size="sm"
                            onClick={() => openGrading(p, m.id)}
                          >
                            <Star />
                            Grade
                          </Button>
                        ) : (
                          <span
                            className="text-xs text-muted-foreground"
                            aria-hidden="true"
                          >
                            —
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
