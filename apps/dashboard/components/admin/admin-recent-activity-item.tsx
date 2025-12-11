import { Clock, User, FileText, CheckCircle, XCircle } from "lucide-react";

export interface Activity {
  id: string;
  type: "client_created" | "lead_converted" | "lead_lost" | "settings_updated";
  description: string;
  timestamp: string;
  client?: string;
}

interface AdminRecentActivityItemProps {
  activity: Activity;
}

export default function AdminRecentActivityItem({ activity }: AdminRecentActivityItemProps) {
  const getIcon = () => {
    switch (activity.type) {
      case "client_created":
        return <User className="h-5 w-5 text-blue-600" />;
      case "lead_converted":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "lead_lost":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "settings_updated":
        return <FileText className="h-5 w-5 text-purple-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getBgColor = () => {
    switch (activity.type) {
      case "client_created":
        return "bg-blue-100";
      case "lead_converted":
        return "bg-green-100";
      case "lead_lost":
        return "bg-red-100";
      case "settings_updated":
        return "bg-purple-100";
      default:
        return "bg-gray-100";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="flex items-start gap-3 p-4 hover:bg-gray-50 rounded-lg transition-colors">
      <div className={`p-2 rounded-lg ${getBgColor()}`}>
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">{activity.description}</p>
        {activity.client && (
          <p className="text-xs text-gray-600 mt-1">{activity.client}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">{formatTimestamp(activity.timestamp)}</p>
      </div>
    </div>
  );
}
