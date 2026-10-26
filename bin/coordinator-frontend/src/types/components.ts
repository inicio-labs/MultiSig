// Component-specific types

// Dashboard Components
export interface SidebarPage {
  pageName: string;
  pageIcon: string;
  path: string;
}

export interface TaskBarProps {
  className?: string;
}

export interface PendingActionsProps {
  threshold?: number;
  fixedHeight?: boolean;
}

// Asset Components
// Notification Types
export interface Notification {
  type: "success" | "error";
  message: string;
}
