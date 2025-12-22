import { useState } from "react";
import { cn } from "@/lib/utils";
import { User, Key, Bell, Palette, Users, UserCog, Activity, GitBranch, FileUp, Plug, FileText, Monitor, Shield, ChevronDown, Settings as SettingsIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import UserManagement from "@/components/UserManagement";
import SecuritySettings from "@/components/settings/SecuritySettings";
import AuditLogsSettings from "@/components/settings/AuditLogsSettings";
import PageAccessSettings from "@/components/settings/PageAccessSettings";
import BackupRestoreSettings from "@/components/settings/BackupRestoreSettings";
import EmailTemplatesSettings from "@/components/settings/EmailTemplatesSettings";
import ProfileSettings from "@/components/settings/ProfileSettings";
import NotificationSettings from "@/components/settings/NotificationSettings";
import DisplaySettings from "@/components/settings/DisplaySettings";
import PipelineSettings from "@/components/settings/PipelineSettings";
import IntegrationSettings from "@/components/settings/IntegrationSettings";
import SessionManagementSettings from "@/components/settings/SessionManagementSettings";
import { useUserRole } from "@/hooks/useUserRole";
interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
  adminOnly?: boolean;
}
interface MenuSection {
  id: string;
  title: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
  items: MenuItem[];
}
const menuSections: MenuSection[] = [{
  id: "personal",
  title: "Personal Settings",
  icon: User,
  items: [{
    id: "profile",
    label: "Profile Management",
    icon: User
  }, {
    id: "password-security",
    label: "Password & Security",
    icon: Key
  }, {
    id: "notifications",
    label: "Notification Preferences",
    icon: Bell
  }, {
    id: "display",
    label: "Display Preferences",
    icon: Palette
  }]
}, {
  id: "user-mgmt",
  title: "User Management",
  icon: Users,
  items: [{
    id: "user-directory",
    label: "User Directory",
    icon: Users,
    adminOnly: true
  }, {
    id: "page-access",
    label: "Page Access Control",
    icon: Activity,
    adminOnly: true
  }]
}, {
  id: "system",
  title: "System Config",
  icon: SettingsIcon,
  items: [{
    id: "pipeline",
    label: "Pipeline/Stage Management",
    icon: GitBranch,
    adminOnly: true
  }, {
    id: "email-templates",
    label: "Email Templates",
    icon: FileText,
    adminOnly: true
  }, {
    id: "backup",
    label: "Data Import/Export",
    icon: FileUp,
    adminOnly: true
  }, {
    id: "integrations",
    label: "Integration Settings",
    icon: Plug,
    adminOnly: true
  }]
}, {
  id: "security",
  title: "Security",
  icon: Shield,
  items: [{
    id: "audit-logs",
    label: "Audit Logs Viewer",
    icon: Shield,
    adminOnly: true
  }, {
    id: "session-management",
    label: "Session Management",
    icon: Monitor
  }]
}];
const Settings = () => {
  const [activeTab, setActiveTab] = useState("profile");
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const {
    userRole
  } = useUserRole();
  const isAdmin = userRole === "admin";
  const handleSectionClick = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };
  const handleItemClick = (itemId: string, sectionId: string) => {
    setActiveTab(itemId);
    setExpandedSection(sectionId);
  };
  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return <ProfileSettings />;
      case "password-security":
        return <SecuritySettings />;
      case "notifications":
        return <NotificationSettings />;
      case "display":
        return <DisplaySettings />;
      case "user-directory":
      case "role-management":
        return <UserManagement />;
      case "page-access":
        return <PageAccessSettings />;
      case "pipeline":
        return <PipelineSettings />;
      case "email-templates":
        return <EmailTemplatesSettings />;
      case "backup":
        return <BackupRestoreSettings />;
      case "integrations":
        return <IntegrationSettings />;
      case "audit-logs":
        return <AuditLogsSettings />;
      case "session-management":
        return <SessionManagementSettings />;
      default:
        return <ProfileSettings />;
    }
  };
  const getActiveLabel = () => {
    for (const section of menuSections) {
      const item = section.items.find(item => item.id === activeTab);
      if (item) return item.label;
    }
    return "Settings";
  };
  return <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Fixed Header */}
      <div className="flex-shrink-0 bg-background">
        <div className="px-6 h-16 flex items-center border-b w-full">
          <div className="flex items-center justify-between w-full">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl text-foreground font-semibold">Settings</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex-shrink-0 bg-background">
        <div className="px-6 py-4">
          <div className="flex flex-wrap gap-2">
            {menuSections.map(section => {
            const visibleItems = section.items.filter(item => !item.adminOnly || isAdmin);
            if (visibleItems.length === 0) return null;
            const isExpanded = expandedSection === section.id;
            const hasActiveItem = visibleItems.some(item => item.id === activeTab);
            const SectionIcon = section.icon;
            return <div key={section.id} className="relative">
                  {/* Section Button */}
                  <button onClick={() => handleSectionClick(section.id)} className={cn("flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200", isExpanded || hasActiveItem ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground")}>
                    
                    <span>{section.title}</span>
                    <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isExpanded && "rotate-180")} />
                  </button>

                  {/* Dropdown Items */}
                  {isExpanded && <div className="absolute top-full left-0 mt-2 z-50 min-w-[220px] bg-popover border border-border rounded-lg shadow-lg py-1.5 animate-fade-in">
                      {visibleItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return <button key={item.id} onClick={() => handleItemClick(item.id, section.id)} className={cn("w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors", isActive ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted/50")}>
                            
                            <span>{item.label}</span>
                          </button>;
                })}
                    </div>}
                </div>;
          })}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {renderContent()}
        </div>
      </ScrollArea>

      {/* Click outside handler overlay */}
      {expandedSection && <div className="fixed inset-0 z-40" onClick={() => setExpandedSection(null)} />}
    </div>;
};
export default Settings;