import { Card } from "../ui/card";
import { Inbox, UserCheck, Clock, TrendingUp } from "lucide-react";

interface LeadStatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
}

function LeadStatCard({ title, value, icon, trend }: LeadStatCardProps) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
          {trend && (
            <p className="text-xs text-gray-500 mt-1">{trend}</p>
          )}
        </div>
        <div className="p-3 bg-blue-100 rounded-lg">
          {icon}
        </div>
      </div>
    </Card>
  );
}

interface LeadStatsCardsProps {
  stats?: {
    totalLeads?: number;
    newLeads?: number;
    contactedLeads?: number;
    convertedLeads?: number;
  };
}

export default function LeadStatsCards({ stats }: LeadStatsCardsProps) {
  const defaultStats = {
    totalLeads: stats?.totalLeads ?? 0,
    newLeads: stats?.newLeads ?? 0,
    contactedLeads: stats?.contactedLeads ?? 0,
    convertedLeads: stats?.convertedLeads ?? 0,
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <LeadStatCard
        title="Total Leads"
        value={defaultStats.totalLeads}
        icon={<Inbox className="h-6 w-6 text-blue-600" />}
        trend="All time"
      />
      <LeadStatCard
        title="New Leads"
        value={defaultStats.newLeads}
        icon={<Clock className="h-6 w-6 text-blue-600" />}
        trend="Last 7 days"
      />
      <LeadStatCard
        title="Contacted"
        value={defaultStats.contactedLeads}
        icon={<UserCheck className="h-6 w-6 text-blue-600" />}
        trend="This month"
      />
      <LeadStatCard
        title="Converted"
        value={defaultStats.convertedLeads}
        icon={<TrendingUp className="h-6 w-6 text-blue-600" />}
        trend="This month"
      />
    </div>
  );
}
