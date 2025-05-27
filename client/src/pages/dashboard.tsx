import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { AdGenerator } from "@/components/ad-generator";
import { SettingsModal } from "@/components/settings-modal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Menu } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function Dashboard() {
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Mock user for demo - in production this would come from auth context
  const currentUser = { id: "1", email: "demo@example.com" };

  const { data: settings } = useQuery({
    queryKey: ["/api/settings"],
    enabled: !!currentUser,
  });

  const { data: apiUsage } = useQuery({
    queryKey: ["/api/usage"],
    enabled: !!currentUser,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenSettings={() => setShowSettings(true)}
        businessName={settings?.businessName || "AdWriter"}
        businessLogo={settings?.businessLogo}
        apiUsage={apiUsage}
      />

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top navigation bar */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden mr-4"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-6 w-6" />
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">AI Ad Copy Generator</h1>
            </div>
            
            {/* Google Ads Account Status */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-accent/10 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span className="text-sm text-accent font-medium">Connected: Demo Account</span>
              </div>
              <Button variant="ghost" size="sm">
                <Bell className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-auto p-6">
          <AdGenerator currentUser={currentUser} />
        </main>
      </div>

      {/* Settings Modal */}
      <SettingsModal 
        open={showSettings}
        onOpenChange={setShowSettings}
        currentUser={currentUser}
      />
    </div>
  );
}
