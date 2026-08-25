"use client";

import React, { createContext, useContext, useState } from "react";

export type SettingsTab = "general" | "security" | "signers" | "notifications" | "transactionguard";

interface DashboardUIContextValue {
  isSendModalOpen: boolean;
  openSendModal: () => void;
  closeSendModal: () => void;

  isReceiveModalOpen: boolean;
  openReceiveModal: () => void;
  closeReceiveModal: () => void;

  settingsTab: SettingsTab;
  setSettingsTab: (tab: SettingsTab) => void;
}

const DashboardUIContext = createContext<DashboardUIContextValue | undefined>(undefined);

export function DashboardUIProvider({ children }: { children: React.ReactNode }) {
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("general");

  return (
    <DashboardUIContext.Provider
      value={{
        isSendModalOpen,
        openSendModal: () => setIsSendModalOpen(true),
        closeSendModal: () => setIsSendModalOpen(false),
        isReceiveModalOpen,
        openReceiveModal: () => setIsReceiveModalOpen(true),
        closeReceiveModal: () => setIsReceiveModalOpen(false),
        settingsTab,
        setSettingsTab,
      }}
    >
      {children}
    </DashboardUIContext.Provider>
  );
}

export function useDashboardUI() {
  const ctx = useContext(DashboardUIContext);
  if (!ctx) throw new Error("useDashboardUI must be used within a DashboardUIProvider");
  return ctx;
}
