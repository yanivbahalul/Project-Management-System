"use client";
import { create } from "zustand";
import {
  Project,
  Application,
  PROJECTS,
  APPLICATIONS,
  MilestoneSubmission,
  ApplicationStatus,
} from "./mock-data";

interface DataStore {
  // Data
  projects: Project[];
  applications: Application[];

  // Project actions
  addProject: (project: Project) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  updateSubmission: (
    projectId: string,
    milestoneId: string,
    updates: Partial<MilestoneSubmission>,
    options?: { allowCreate?: boolean }
  ) => void;
  assignReviewer: (
    projectId: string,
    reviewerId: string,
    reviewerName: string
  ) => void;

  // Application actions
  addApplication: (application: Application) => void;
  updateApplicationStatus: (
    applicationId: string,
    status: ApplicationStatus
  ) => void;
}

export const useDataStore = create<DataStore>((set) => ({
  projects: [...PROJECTS],
  applications: [...APPLICATIONS],

  addProject: (project) =>
    set((state) => {
      if (state.projects.some((p) => p.id === project.id)) return state;
      return { projects: [...state.projects, project] };
    }),

  updateProject: (projectId, updates) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, ...updates } : p
      ),
    })),

  updateSubmission: (projectId, milestoneId, updates, options) =>
    set((state) => ({
      projects: state.projects.map((p) => {
        if (p.id !== projectId) return p;
        const existingIndex = p.submissions.findIndex(
          (s) => s.milestoneId === milestoneId
        );
        if (existingIndex >= 0) {
          const newSubmissions = [...p.submissions];
          newSubmissions[existingIndex] = {
            ...newSubmissions[existingIndex],
            ...updates,
          };
          return { ...p, submissions: newSubmissions };
        }
        if (!options?.allowCreate) {
          if (
            typeof process !== "undefined" &&
            process.env.NODE_ENV !== "production"
          ) {
            console.warn(
              `[updateSubmission] Refusing to create submission ${projectId}/${milestoneId} without allowCreate=true`
            );
          }
          return p;
        }
        return {
          ...p,
          submissions: [
            ...p.submissions,
            {
              milestoneId,
              projectId,
              status: "submitted",
              ...updates,
            } as MilestoneSubmission,
          ],
        };
      }),
    })),

  assignReviewer: (projectId, reviewerId, reviewerName) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId && p.reviewerId !== reviewerId
          ? { ...p, reviewerId, reviewerName }
          : p
      ),
    })),

  addApplication: (application) =>
    set((state) => {
      const conflict = state.applications.some(
        (a) =>
          a.studentId === application.studentId &&
          a.projectId === application.projectId &&
          a.status !== "rejected"
      );
      if (conflict) return state;
      if (state.applications.some((a) => a.id === application.id)) return state;
      return { applications: [...state.applications, application] };
    }),

  updateApplicationStatus: (applicationId, status) =>
    set((state) => ({
      applications: state.applications.map((a) =>
        a.id === applicationId ? { ...a, status } : a
      ),
    })),
}));
