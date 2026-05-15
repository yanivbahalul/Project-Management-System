"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import { UserRole, CURRENT_USERS } from "@/lib/mock-data";
import { useNotificationStore } from "@/lib/notification-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Award,
  Bell,
  BellOff,
  BookOpen,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  ChevronsLeft,
  ClipboardCheck,
  FileText,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Settings,
  Star,
  UserPlus,
  Users,
  X,
  XCircle,
} from "lucide-react";
import type { Notification } from "@/lib/mock-data";

interface NavItem {
  label: string;
  icon: React.ElementType;
  view: string;
}

const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  student: [
    { label: "Dashboard", icon: LayoutDashboard, view: "dashboard" },
    { label: "Browse Projects", icon: FolderOpen, view: "browse" },
    { label: "My Applications", icon: FileText, view: "applications" },
    { label: "Milestone Tracker", icon: ClipboardCheck, view: "milestones" },
  ],
  mentor: [
    { label: "Dashboard", icon: LayoutDashboard, view: "dashboard" },
    { label: "My Projects", icon: FolderOpen, view: "projects" },
    { label: "Applications", icon: Users, view: "applications" },
    { label: "Grade Milestones", icon: Star, view: "grading" },
  ],
  coordinator: [
    { label: "Dashboard", icon: LayoutDashboard, view: "dashboard" },
    { label: "All Projects", icon: FolderOpen, view: "projects" },
    { label: "Assign Reviewers", icon: Users, view: "reviewers" },
    { label: "Grade Approval", icon: ClipboardCheck, view: "grades" },
    { label: "Settings", icon: Settings, view: "settings" },
  ],
  reviewer: [
    { label: "Dashboard", icon: LayoutDashboard, view: "dashboard" },
    { label: "Assigned Projects", icon: BookOpen, view: "projects" },
    { label: "Grade Defense", icon: Star, view: "grading" },
  ],
};

const ROLE_LABELS: Record<UserRole, string> = {
  student: "Student",
  mentor: "Faculty Mentor",
  coordinator: "Coordinator",
  reviewer: "Reviewer",
};

const ROLE_COLORS: Record<UserRole, string> = {
  student: "bg-chart-2 text-primary-foreground",
  mentor: "bg-primary text-primary-foreground",
  coordinator: "bg-chart-5 text-primary-foreground",
  reviewer: "bg-chart-3 text-primary-foreground",
};

function getNotifVisual(n: Notification): {
  Icon: React.ElementType;
  tone: string;
} {
  switch (n.type) {
    case "approval":
      return { Icon: CheckCircle2, tone: "bg-success/15 text-success" };
    case "rejection":
      return { Icon: XCircle, tone: "bg-destructive/15 text-destructive" };
    case "grade":
      return { Icon: Award, tone: "bg-chart-5/15 text-chart-5" };
    case "assignment":
      return { Icon: UserPlus, tone: "bg-chart-3/15 text-chart-3" };
    case "submission":
    default:
      return { Icon: FileText, tone: "bg-primary/15 text-primary" };
  }
}

function useNow(): number {
  const [now, setNow] = useState<number>(0);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

function formatNotifTime(iso: string, now: number): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  const diffMs = now - date.getTime();
  if (diffMs < 0) return "just now";
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

interface AppShellProps {
  role: UserRole;
  activeView: string;
  onViewChange: (view: string) => void;
  onRoleChange: (role: UserRole) => void;
  children: React.ReactNode;
}

export function AppShell({
  role,
  activeView,
  onViewChange,
  onRoleChange,
  children,
}: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  const user = CURRENT_USERS[role];
  const navItems = NAV_BY_ROLE[role];

  const notifications = useNotificationStore((s) => s.notifications);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);

  const now = useNow();

  const roleNotifs = useMemo(
    () =>
      notifications
        .filter((n) => n.targetRole === role)
        .map((n) => ({ n, t: new Date(n.timestamp).getTime() }))
        .sort((a, b) => b.t - a.t)
        .map(({ n }) => n),
    [notifications, role]
  );

  const unread = useMemo(
    () => roleNotifs.reduce((acc, n) => acc + (n.read ? 0 : 1), 0),
    [roleNotifs]
  );

  // Close mobile menu whenever the user navigates to a new view
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [activeView]);

  // Auto-close the mobile drawer when crossing the md breakpoint
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const handle = () => {
      if (mq.matches) setMobileMenuOpen(false);
    };
    handle();
    mq.addEventListener("change", handle);
    return () => mq.removeEventListener("change", handle);
  }, []);

  // Lock body scroll while mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileMenuOpen]);

  // Scroll main back to top on view change so users don't land mid-page
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeView]);

  const initials = useMemo(
    () =>
      user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2),
    [user.name]
  );

  const handleNavClick = useCallback(
    (view: string) => {
      onViewChange(view);
      setMobileMenuOpen(false);
    },
    [onViewChange]
  );

  const expanded = !sidebarCollapsed || mobileMenuOpen;
  const activeLabel =
    navItems.find((n) => n.view === activeView)?.label ?? "Dashboard";

  return (
    <div className="flex h-svh overflow-hidden bg-background text-foreground">
      {/* Skip link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden animate-in fade-in-0"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        aria-label="Primary navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl transition-[transform,width] duration-300 ease-out md:relative md:shadow-none",
          mobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0",
          sidebarCollapsed ? "md:w-20 w-72" : "w-72"
        )}
      >
        {/* Floating collapse toggle (desktop only) */}
        <button
          type="button"
          onClick={() => setSidebarCollapsed((v) => !v)}
          aria-label={
            sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
          }
          aria-pressed={sidebarCollapsed}
          className={cn(
            "absolute -right-3 top-7 z-20 hidden size-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground/80 shadow-md transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground md:flex",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          )}
        >
          <ChevronsLeft
            className={cn(
              "size-3.5 transition-transform duration-300",
              sidebarCollapsed && "rotate-180"
            )}
            aria-hidden="true"
          />
        </button>

        {/* Logo / header */}
        <div
          className={cn(
            "flex h-16 items-center gap-3 border-b border-sidebar-border",
            sidebarCollapsed && !mobileMenuOpen
              ? "justify-center px-2"
              : "px-4"
          )}
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary shadow-sm">
            <GraduationCap
              className="size-5 text-primary-foreground"
              aria-hidden="true"
            />
          </div>
          {expanded && (
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="truncate text-sm font-semibold leading-tight text-sidebar-accent-foreground">
                HIT Portal
              </p>
              <p className="truncate text-[11px] text-sidebar-foreground/60">
                Project Management
              </p>
            </div>
          )}
          {/* Mobile close — only visible when the mobile drawer is open */}
          {mobileMenuOpen && (
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto size-8 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground md:hidden"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation"
            >
              <X className="size-4" />
            </Button>
          )}
        </div>

        {/* Role badge */}
        {expanded && (
          <div className="px-4 pt-4 pb-3">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
                ROLE_COLORS[role]
              )}
            >
              {ROLE_LABELS[role]}
            </span>
          </div>
        )}

        {/* Navigation */}
        <ScrollArea className="flex-1 px-2 py-2">
          <nav aria-label="Main">
            <ul className="flex flex-col gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeView === item.view;
                return (
                  <li key={item.view}>
                    <button
                      type="button"
                      onClick={() => handleNavClick(item.view)}
                      aria-current={active ? "page" : undefined}
                      title={!expanded ? item.label : undefined}
                      className={cn(
                        "group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-left transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                        !expanded && "justify-center px-0"
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-4 shrink-0 transition-colors",
                          active && "text-sidebar-primary"
                        )}
                        aria-hidden="true"
                      />
                      {expanded && (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {active && (
                            <ChevronRight
                              className="size-3.5 shrink-0 opacity-70"
                              aria-hidden="true"
                            />
                          )}
                        </>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </ScrollArea>

        {/* Bottom user / role switcher */}
        <div className="border-t border-sidebar-border p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-sidebar-accent/60",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
                  !expanded && "justify-center px-0"
                )}
                aria-label={`Account menu for ${user.name}`}
              >
                <Avatar className="size-8 shrink-0 ring-2 ring-sidebar-border">
                  <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {expanded && (
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p className="truncate text-sm font-medium text-sidebar-accent-foreground">
                      {user.name}
                    </p>
                    <p className="truncate text-[11px] text-sidebar-foreground/60">
                      {user.email}
                    </p>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="start"
              className="w-56"
              sideOffset={8}
            >
              <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
                Switch role (demo)
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(["student", "mentor", "coordinator", "reviewer"] as UserRole[]).map(
                (r) => (
                  <DropdownMenuItem
                    key={r}
                    onSelect={() => onRoleChange(r)}
                    className={cn(
                      "cursor-pointer",
                      role === r && "bg-accent font-semibold text-accent-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block size-2 rounded-full",
                        ROLE_COLORS[r].split(" ")[0]
                      )}
                      aria-hidden="true"
                    />
                    {ROLE_LABELS[r]}
                  </DropdownMenuItem>
                )
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header
          className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card/95 px-4 supports-[backdrop-filter]:bg-card/75 supports-[backdrop-filter]:backdrop-blur md:px-6"
          role="banner"
        >
          <Button
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 md:hidden"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation"
            aria-expanded={mobileMenuOpen}
          >
            <Menu className="size-5" />
          </Button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold leading-tight text-foreground sm:text-lg">
              {activeLabel}
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              {user.department}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* Notifications */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="relative size-9"
                  aria-label={
                    unread > 0
                      ? `Notifications, ${unread} unread`
                      : "Notifications"
                  }
                >
                  <Bell className="size-4" />
                  {unread > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground ring-2 ring-card tabular-nums"
                    >
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                sideOffset={10}
                collisionPadding={12}
                className="w-[calc(100vw-1.5rem)] max-w-sm overflow-hidden rounded-lg p-0 shadow-lg"
              >
                <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="text-sm font-semibold">Notifications</p>
                    {unread > 0 && (
                      <Badge variant="secondary" className="shrink-0">
                        {unread} new
                      </Badge>
                    )}
                  </div>
                  {unread > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 shrink-0 gap-1.5 text-xs"
                      onClick={() => markAllRead(role)}
                    >
                      <CheckCheck className="size-3.5" />
                      Mark all read
                    </Button>
                  )}
                </div>
                <div className="scrollbar-thin max-h-80 overflow-y-auto overscroll-contain">
                  {roleNotifs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                      <BellOff
                        className="mb-2 size-8 text-muted-foreground/40"
                        aria-hidden="true"
                      />
                      <p className="text-sm font-medium text-muted-foreground">
                        You&apos;re all caught up
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground/70">
                        No notifications yet
                      </p>
                    </div>
                  ) : (
                    <ul className="divide-y">
                      {roleNotifs.map((n) => {
                        const { Icon, tone } = getNotifVisual(n);
                        return (
                          <li key={n.id}>
                            <button
                              type="button"
                              onClick={() => {
                                if (!n.read) markRead(n.id);
                              }}
                              disabled={n.read}
                              aria-disabled={n.read}
                              className={cn(
                                "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
                                "hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none",
                                !n.read && "bg-primary/[0.06]",
                                n.read && "cursor-default"
                              )}
                              aria-label={
                                n.read
                                  ? n.message
                                  : `Unread notification: ${n.message}`
                              }
                            >
                              <span
                                aria-hidden="true"
                                className={cn(
                                  "flex size-8 shrink-0 items-center justify-center rounded-full",
                                  tone
                                )}
                              >
                                <Icon className="size-4" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p
                                  className={cn(
                                    "break-words text-sm leading-snug",
                                    !n.read && "font-medium"
                                  )}
                                >
                                  {n.message}
                                </p>
                                <p
                                  className="mt-1 text-[11px] text-muted-foreground"
                                  suppressHydrationWarning
                                >
                                  {formatNotifTime(n.timestamp, now)}
                                </p>
                              </div>
                              {!n.read && (
                                <span
                                  className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                                  aria-hidden="true"
                                />
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <Avatar
              className="size-8 hidden sm:flex"
              aria-label={`Signed in as ${user.name}`}
            >
              <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Page content */}
        <main
          id="main-content"
          ref={mainRef}
          tabIndex={-1}
          className="scrollbar-thin min-h-0 flex-1 overflow-y-auto focus:outline-none"
        >
          <div className="mx-auto w-full max-w-7xl p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
