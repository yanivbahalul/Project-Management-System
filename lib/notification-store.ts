"use client";
import { create } from "zustand";
import { Notification, NOTIFICATIONS, UserRole } from "./mock-data";
import { makeId } from "./utils";

interface NotificationStore {
  notifications: Notification[];
  addNotification: (n: Omit<Notification, "id">) => void;
  markRead: (id: string) => void;
  markAllRead: (role: UserRole) => void;
  unreadCount: (role: UserRole) => number;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [...NOTIFICATIONS],

  addNotification: (n) => {
    const newN: Notification = { ...n, id: makeId("n_") };
    set((state) => ({ notifications: [newN, ...state.notifications] }));
  },

  markRead: (id) =>
    set((state) => {
      const target = state.notifications.find((n) => n.id === id);
      if (!target || target.read) return state;
      return {
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
      };
    }),

  markAllRead: (role) =>
    set((state) => {
      const hasUnread = state.notifications.some(
        (n) => n.targetRole === role && !n.read
      );
      if (!hasUnread) return state;
      return {
        notifications: state.notifications.map((n) =>
          n.targetRole === role && !n.read ? { ...n, read: true } : n
        ),
      };
    }),

  unreadCount: (role) =>
    get().notifications.filter((n) => !n.read && n.targetRole === role).length,
}));
