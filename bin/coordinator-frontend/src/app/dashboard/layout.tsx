"use client";

import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import TaskBar from "./components/Taskbar";

// Force dynamic rendering to avoid WASM loading issues during build
export const dynamic = 'force-dynamic';

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Taskbar — fixed height row */}
      <div className="shrink-0">
        <TaskBar />
      </div>

      {/* Body — sidebar + main sit side by side in a flex row */}
      <div className="flex flex-1 overflow-hidden">
        <aside
          className={`shrink-0 overflow-hidden transition-all duration-300 ease-out ${
            collapsed ? "w-[52px]" : "w-[200px]"
          }`}
        >
          <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
        </aside>

        <main className="flex-1 overflow-y-auto p-4 scrollbar-hidden" style={{ scrollbarGutter: 'stable' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
