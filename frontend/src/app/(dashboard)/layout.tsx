"use client";

import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { VoiceAssistant } from "@/components/dashboard/voice-assistant";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto bg-muted/20 p-6 scrollbar-thin">
          {children}
        </main>
      </div>
      <VoiceAssistant />
    </div>
  );
}
