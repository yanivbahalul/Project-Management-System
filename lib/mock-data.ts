export type UserRole = "student" | "mentor" | "coordinator" | "reviewer";

export type MilestoneStatus =
  | "not_started"
  | "submitted"
  | "approved_mentor"
  | "approved_coordinator"
  | "rejected";

export type ApplicationStatus = "pending" | "approved" | "rejected";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  avatar?: string;
}

export interface MilestoneDefinition {
  id: string;
  name: string;
  description: string;
  weight: number; // percentage
  dueDate: string;
  gradingParams: GradingParam[];
}

export interface GradingParam {
  id: string;
  name: string;
  maxScore: number;
  description: string;
}

export interface MilestoneSubmission {
  milestoneId: string;
  projectId: string;
  status: MilestoneStatus;
  submittedAt?: string;
  mentorGrade?: number;
  mentorFeedback?: string;
  coordinatorApproved?: boolean;
  paramGrades?: Record<string, number>;
  fileUrl?: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  mentorId: string;
  mentorName: string;
  department: string;
  degree: string;
  maxStudents?: number;
  technologies: string[];
  milestones: MilestoneDefinition[];
  submissions: MilestoneSubmission[];
  reviewerId?: string;
  reviewerName?: string;
  finalGrade?: number;
  status?: "open" | "in_progress" | "completed";
}

export interface Application {
  id: string;
  projectId: string;
  projectTitle: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  status: ApplicationStatus;
  appliedAt: string;
  cvUrl?: string;
  transcriptUrl?: string;
  gpa: number;
}

export interface Notification {
  id: string;
  type: "submission" | "approval" | "rejection" | "grade" | "assignment";
  message: string;
  timestamp: string;
  read: boolean;
  targetRole: UserRole;
}

// ── Users ──────────────────────────────────────────────────────────────
export const CURRENT_USERS: Record<UserRole, User> = {
  student: {
    id: "s001",
    name: "Yaniv Bahalul",
    email: "yaniv.bah@hit.ac.il",
    role: "student",
    department: "Computer Science",
  },
  mentor: {
    id: "f001",
    name: "Dr. Oren Levi",
    email: "oren.levi@hit.ac.il",
    role: "mentor",
    department: "Computer Science",
  },
  coordinator: {
    id: "c001",
    name: "Prof. Sarah Mizrahi",
    email: "sarah.mizrahi@hit.ac.il",
    role: "coordinator",
    department: "Computer Science",
  },
  reviewer: {
    id: "r001",
    name: "Dr. Amir Ben-David",
    email: "amir.bendavid@hit.ac.il",
    role: "reviewer",
    department: "Software Engineering",
  },
};

// ── Milestone Definitions ───────────────────────────────────────────────
export const DEFAULT_MILESTONES: MilestoneDefinition[] = [
  {
    id: "m1",
    name: "Research Proposal",
    description: "Initial research proposal document outlining objectives, methodology, and expected outcomes.",
    weight: 20,
    dueDate: "2024-03-15",
    gradingParams: [
      { id: "m1p1", name: "Problem Definition", maxScore: 25, description: "Clarity and relevance of the problem" },
      { id: "m1p2", name: "Literature Review", maxScore: 25, description: "Depth of background research" },
      { id: "m1p3", name: "Methodology", maxScore: 30, description: "Proposed approach and feasibility" },
      { id: "m1p4", name: "Presentation", maxScore: 20, description: "Document structure and writing quality" },
    ],
  },
  {
    id: "m2",
    name: "Progress Report",
    description: "Mid-project report documenting achieved milestones, challenges faced, and updated timeline.",
    weight: 30,
    dueDate: "2024-05-30",
    gradingParams: [
      { id: "m2p1", name: "Work Completed", maxScore: 40, description: "Amount and quality of work done" },
      { id: "m2p2", name: "Problem Solving", maxScore: 30, description: "Handling of obstacles and deviations" },
      { id: "m2p3", name: "Updated Plan", maxScore: 30, description: "Revised timeline and next steps" },
    ],
  },
  {
    id: "m3",
    name: "Final Thesis",
    description: "Complete thesis document including all results, analysis, conclusions, and future work.",
    weight: 30,
    dueDate: "2024-08-15",
    gradingParams: [
      { id: "m3p1", name: "Research Quality", maxScore: 30, description: "Depth and originality of research" },
      { id: "m3p2", name: "Technical Implementation", maxScore: 30, description: "Code / system quality" },
      { id: "m3p3", name: "Results & Analysis", maxScore: 25, description: "Data, findings, and conclusions" },
      { id: "m3p4", name: "Thesis Writing", maxScore: 15, description: "Academic writing and formatting" },
    ],
  },
  {
    id: "m4",
    name: "Defense Exam",
    description: "Oral defense before the committee — graded by the assigned reviewer.",
    weight: 20,
    dueDate: "2024-09-10",
    gradingParams: [
      { id: "m4p1", name: "Knowledge Depth", maxScore: 35, description: "Understanding of subject matter" },
      { id: "m4p2", name: "Presentation Skills", maxScore: 30, description: "Clarity and confidence" },
      { id: "m4p3", name: "Q&A Performance", maxScore: 35, description: "Answers to committee questions" },
    ],
  },
];

// ── Projects ────────────────────────────────────────────────────────────
export const PROJECTS: Project[] = [
  {
    id: "p001",
    title: "AI-Powered Anomaly Detection in IoT Networks",
    description:
      "Develop a machine-learning pipeline that ingests IoT sensor streams and flags anomalies in real time using autoencoders and LSTM networks. The system will be evaluated on public benchmark datasets.",
    mentorId: "f001",
    mentorName: "Dr. Oren Levi",
    department: "Computer Science",
    degree: "M.Sc",
    maxStudents: 2,
    technologies: ["Python", "TensorFlow", "Kafka", "Docker"],
    milestones: DEFAULT_MILESTONES,
    reviewerId: "r001",
    reviewerName: "Dr. Amir Ben-David",
    submissions: [
      {
        milestoneId: "m1",
        projectId: "p001",
        status: "approved_coordinator",
        submittedAt: "2024-03-10",
        mentorGrade: 88,
        mentorFeedback: "Excellent proposal. Literature review is thorough.",
        coordinatorApproved: true,
        paramGrades: { m1p1: 22, m1p2: 23, m1p3: 26, m1p4: 17 },
      },
      {
        milestoneId: "m2",
        projectId: "p001",
        status: "approved_mentor",
        submittedAt: "2024-05-25",
        mentorGrade: 82,
        mentorFeedback: "Good progress. Some delays in implementation.",
        paramGrades: { m2p1: 33, m2p2: 24, m2p3: 25 },
      },
      {
        milestoneId: "m3",
        projectId: "p001",
        status: "submitted",
        submittedAt: "2024-08-12",
      },
    ],
  },
  {
    id: "p002",
    title: "Blockchain-Based Academic Certificate Verification",
    description:
      "Design and implement a decentralized system on Ethereum for issuing, storing, and verifying academic credentials without reliance on central authorities.",
    mentorId: "f001",
    mentorName: "Dr. Oren Levi",
    department: "Computer Science",
    degree: "B.Sc",
    maxStudents: 2,
    technologies: ["Solidity", "React", "Node.js", "IPFS"],
    milestones: DEFAULT_MILESTONES,
    submissions: [
      {
        milestoneId: "m1",
        projectId: "p002",
        status: "approved_coordinator",
        submittedAt: "2024-03-14",
        mentorGrade: 91,
        coordinatorApproved: true,
        paramGrades: { m1p1: 24, m1p2: 22, m1p3: 28, m1p4: 17 },
      },
    ],
  },
  {
    id: "p003",
    title: "Natural Language Processing for Hebrew Medical Records",
    description:
      "Build an NLP pipeline for de-identification and entity extraction from Hebrew-language clinical notes using transformer models fine-tuned on medical corpora.",
    mentorId: "f002",
    mentorName: "Dr. Noa Shapira",
    department: "Data Science",
    degree: "M.Sc",
    maxStudents: 1,
    technologies: ["Python", "HuggingFace", "spaCy", "PostgreSQL"],
    milestones: DEFAULT_MILESTONES,
    submissions: [],
  },
  {
    id: "p004",
    title: "Smart City Traffic Optimization via Reinforcement Learning",
    description:
      "Simulate a multi-intersection urban traffic environment and train RL agents to minimize average vehicle waiting time, comparing PPO, DQN, and A3C approaches.",
    mentorId: "f002",
    mentorName: "Dr. Noa Shapira",
    department: "Computer Science",
    degree: "B.Sc",
    maxStudents: 3,
    technologies: ["Python", "OpenAI Gym", "PyTorch", "SUMO"],
    milestones: DEFAULT_MILESTONES,
    submissions: [],
  },
];

// ── Applications ────────────────────────────────────────────────────────
export const APPLICATIONS: Application[] = [
  {
    id: "a001",
    projectId: "p001",
    projectTitle: "AI-Powered Anomaly Detection in IoT Networks",
    studentId: "s001",
    studentName: "Yaniv Bahalul",
    studentEmail: "yaniv.bah@hit.ac.il",
    status: "approved",
    appliedAt: "2024-02-01",
    gpa: 88.5,
  },
  {
    id: "a002",
    projectId: "p002",
    projectTitle: "Blockchain-Based Academic Certificate Verification",
    studentId: "s002",
    studentName: "Yoni Katz",
    studentEmail: "yoni.katz@hit.ac.il",
    status: "pending",
    appliedAt: "2024-02-10",
    gpa: 84.2,
  },
  {
    id: "a003",
    projectId: "p001",
    projectTitle: "AI-Powered Anomaly Detection in IoT Networks",
    studentId: "s003",
    studentName: "Dina Roth",
    studentEmail: "dina.roth@hit.ac.il",
    status: "pending",
    appliedAt: "2024-02-15",
    gpa: 91.0,
  },
  {
    id: "a004",
    projectId: "p003",
    projectTitle: "Natural Language Processing for Hebrew Medical Records",
    studentId: "s004",
    studentName: "Eli Peretz",
    studentEmail: "eli.peretz@hit.ac.il",
    status: "rejected",
    appliedAt: "2024-02-18",
    gpa: 76.3,
  },
];

// ── Notifications ───────────────────────────────────────────────────────
export const NOTIFICATIONS: Notification[] = [
  {
    id: "n001",
    type: "submission",
    message: "Yaniv Bahalul submitted Final Thesis for project 'AI-Powered Anomaly Detection'.",
    timestamp: "2024-08-12T10:30:00Z",
    read: false,
    targetRole: "mentor",
  },
  {
    id: "n002",
    type: "approval",
    message: "Dr. Oren Levi approved your Progress Report. Grade: 82/100.",
    timestamp: "2024-06-01T09:00:00Z",
    read: true,
    targetRole: "student",
  },
  {
    id: "n003",
    type: "assignment",
    message: "You have been assigned as Reviewer for 'AI-Powered Anomaly Detection in IoT Networks'.",
    timestamp: "2024-08-01T14:00:00Z",
    read: false,
    targetRole: "reviewer",
  },
  {
    id: "n004",
    type: "approval",
    message: "Coordinator approved Research Proposal for project 'Blockchain-Based Certificate Verification'.",
    timestamp: "2024-03-16T11:00:00Z",
    read: true,
    targetRole: "mentor",
  },
  {
    id: "n005",
    type: "submission",
    message: "Yoni Katz applied to your project 'Blockchain-Based Academic Certificate Verification'.",
    timestamp: "2024-02-10T08:45:00Z",
    read: false,
    targetRole: "mentor",
  },
];

// ── Faculty Settings ─────────────────────────────────────────────────────
export interface DegreeProgram {
  id: string;
  name: string;
  department: string;
  milestones: MilestoneDefinition[];
}

export const DEGREE_PROGRAMS: DegreeProgram[] = [
  {
    id: "dp1",
    name: "B.Sc Computer Science",
    department: "Computer Science",
    milestones: DEFAULT_MILESTONES,
  },
  {
    id: "dp2",
    name: "M.Sc Computer Science",
    department: "Computer Science",
    milestones: DEFAULT_MILESTONES,
  },
  {
    id: "dp3",
    name: "M.Sc Data Science",
    department: "Data Science",
    milestones: [
      DEFAULT_MILESTONES[0],
      DEFAULT_MILESTONES[2],
      DEFAULT_MILESTONES[3],
    ],
  },
];

// ── Grade calculation utility ───────────────────────────────────────────
export function calculateFinalGrade(project: Project): number | null {
  const subByMilestone = new Map(
    project.submissions.map((s) => [s.milestoneId, s])
  );

  let totalWeight = 0;
  let weightedScore = 0;
  for (const m of project.milestones) {
    const sub = subByMilestone.get(m.id);
    if (
      !sub ||
      sub.mentorGrade === undefined ||
      Number.isNaN(sub.mentorGrade) ||
      sub.mentorGrade < 0 ||
      sub.mentorGrade > 100
    ) {
      continue;
    }
    weightedScore += (sub.mentorGrade / 100) * m.weight;
    totalWeight += m.weight;
  }
  if (totalWeight <= 0) return null;
  return Math.round((weightedScore / totalWeight) * 100);
}
