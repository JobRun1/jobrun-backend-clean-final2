import { Card } from "../ui/card";
import { Users, Briefcase, TrendingUp, DollarSign } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: React.ReactNode;
}

function StatCard({ title, value, change, changeType = "neutral", icon }: StatCardProps) {
  const changeColors = {
    positive: "text-green-600",
    negative: "text-red-600",
    neutral: "text-gray-600",
  };

  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {change && (
            <p className={`text-sm mt-2 ${changeColors[changeType]}`}>
              {change}
            </p>
          )}
        </div>
        <div className="p-3 bg-blue-100 rounded-lg">
          {icon}
        </div>
      </div>
    </Card>
  );
}

interface AdminStatsCardsProps {
  stats?: {
    totalClients?: number;
    activeClients?: number;
    totalLeads?: number;
    conversionRate?: string;
    revenue?: string;
  };
}

export default function AdminStatsCards({ stats }: AdminStatsCardsProps) {
  const defaultStats = {
    totalClients: stats?.totalClients ?? 0,
    activeClients: stats?.activeClients ?? 0,
    totalLeads: stats?.totalLeads ?? 0,
    conversionRate: stats?.conversionRate ?? "0%",
    revenue: stats?.revenue ?? "$0",
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Total Clients"
        value={defaultStats.totalClients}
        change="+12% from last month"
        changeType="positive"
        icon={<Users className="h-6 w-6 text-blue-600" />}
      />
      <StatCard
        title="Active Clients"
        value={defaultStats.activeClients}
        change="+8% from last month"
        changeType="positive"
        icon={<Briefcase className="h-6 w-6 text-blue-600" />}
      />
      <StatCard
        title="Total Leads"
        value={defaultStats.totalLeads}
        change="+23% from last month"
        changeType="positive"
        icon={<TrendingUp className="h-6 w-6 text-blue-600" />}
      />
      <StatCard
        title="Conversion Rate"
        value={defaultStats.conversionRate}
        change="-2% from last month"
        changeType="negative"
        icon={<DollarSign className="h-6 w-6 text-blue-600" />}
      />
    </div>
  );
}
