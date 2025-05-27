import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Wand2, 
  BarChart3, 
  History, 
  Settings, 
  PenTool 
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  businessName?: string;
  businessLogo?: string;
  apiUsage?: {
    today: string;
    month: string;
  };
}

export function Sidebar({ 
  isOpen, 
  onClose, 
  onOpenSettings,
  businessName = "AdWriter",
  businessLogo,
  apiUsage 
}: SidebarProps) {
  const navigation = [
    { name: "Ad Generator", icon: Wand2, href: "#", current: true },
    { name: "Campaigns", icon: BarChart3, href: "#", current: false },
    { name: "History", icon: History, href: "#", current: false },
    { name: "Analytics", icon: BarChart3, href: "#", current: false },
  ];

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto bg-white border-r border-gray-200">
          <SidebarContent 
            navigation={navigation}
            onOpenSettings={onOpenSettings}
            businessName={businessName}
            businessLogo={businessLogo}
            apiUsage={apiUsage}
          />
        </div>
      </div>

      {/* Mobile sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out md:hidden",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
          <SidebarContent 
            navigation={navigation}
            onOpenSettings={onOpenSettings}
            businessName={businessName}
            businessLogo={businessLogo}
            apiUsage={apiUsage}
            onItemClick={onClose}
          />
        </div>
      </div>
    </>
  );
}

interface SidebarContentProps {
  navigation: Array<{
    name: string;
    icon: any;
    href: string;
    current: boolean;
  }>;
  onOpenSettings: () => void;
  businessName: string;
  businessLogo?: string;
  apiUsage?: {
    today: string;
    month: string;
  };
  onItemClick?: () => void;
}

function SidebarContent({ 
  navigation, 
  onOpenSettings, 
  businessName, 
  businessLogo, 
  apiUsage,
  onItemClick 
}: SidebarContentProps) {
  return (
    <>
      {/* Logo/Brand Section */}
      <div className="flex items-center flex-shrink-0 px-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-purple-600 rounded-lg flex items-center justify-center">
            {businessLogo ? (
              <img src={businessLogo} alt="Logo" className="w-6 h-6 rounded" />
            ) : (
              <PenTool className="h-4 w-4 text-white" />
            )}
          </div>
          <span className="text-xl font-bold text-gray-900">{businessName}</span>
        </div>
      </div>
      
      {/* Navigation Menu */}
      <nav className="mt-8 flex-1 px-2 space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.name}
              variant={item.current ? "default" : "ghost"}
              className={cn(
                "w-full justify-start text-left",
                item.current 
                  ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
              onClick={onItemClick}
            >
              <Icon className="mr-3 h-4 w-4" />
              {item.name}
            </Button>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="flex-shrink-0 px-2 pb-4 space-y-2">
        {/* API Usage Display */}
        {apiUsage && (
          <Card className="bg-gray-50 p-3">
            <div className="text-xs text-gray-500 mb-1">API Usage Today</div>
            <div className="text-sm font-semibold text-gray-900">{apiUsage.today}</div>
            <div className="text-xs text-gray-500">Monthly: {apiUsage.month}</div>
          </Card>
        )}
        
        {/* Settings Link */}
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          onClick={() => {
            onOpenSettings();
            onItemClick?.();
          }}
        >
          <Settings className="mr-3 h-4 w-4" />
          Settings
        </Button>
      </div>
    </>
  );
}
