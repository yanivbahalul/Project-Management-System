"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { StudentDashboard } from "@/components/dashboards/student-dashboard";
import { MentorDashboard } from "@/components/dashboards/mentor-dashboard";
import { CoordinatorDashboard } from "@/components/dashboards/coordinator-dashboard";
import { ReviewerDashboard } from "@/components/dashboards/reviewer-dashboard";
import { Toaster } from "@/components/ui/sonner";
import type { UserRole } from "@/lib/mock-data";

export default function HomePage() {
  const [role, setRole] = useState<UserRole>("student");
  const [activeView, setActiveView] = useState("dashboard");

  function handleRoleChange(newRole: UserRole) {
    setRole(newRole);
    setActiveView("dashboard");
  }

  function renderDashboard() {
    switch (role) {
      case "student":
        return <StudentDashboard view={activeView} />;
      case "mentor":
        return <MentorDashboard view={activeView} />;
      case "coordinator":
        return <CoordinatorDashboard view={activeView} />;
      case "reviewer":
        return <ReviewerDashboard view={activeView} />;
    }
  }

  return (
    <>
      <AppShell
        role={role}
        activeView={activeView}
        onViewChange={setActiveView}
        onRoleChange={handleRoleChange}
      >
        {renderDashboard()}
      </AppShell>
      <Toaster position="bottom-right" richColors />
    </>
  );
}
