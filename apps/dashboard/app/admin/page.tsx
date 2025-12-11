import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type LeadState =
  | "NEW"
  | "POST_CALL"
  | "POST_CALL_REPLIED"
  | "CUSTOMER_REPLIED"
  | "QUALIFIED"
  | "BOOKED"
  | "CONVERTED"
  | "LOST";

type MessageDirection = "INBOUND" | "OUTBOUND" | "SYSTEM";

interface AdminDashboardStats {
  totalClients: number;
  activeClients: number;
  totalLeads: number;
  leadsToday: number;
  totalMessages: number;
  messagesToday: number;
  conversionRate: number;
  leadStateDistribution: Record<LeadState, number>;
  recentActivity: {
    id: string;
    type: MessageDirection;
    clientName: string;
    preview: string;
    createdAt: string;
  }[];
  topClients: {
    id: string;
    businessName: string;
    region: string;
    leadCount: number;
    messageCount: number;
  }[];
}

async function safeGet<T>(endpoint: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      cache: "no-store",
    });
    if (!res.ok) return fallback;
    const response = await res.json();

    // Handle wrapped API response { success: true, data: {...} }
    if (response && response.success && response.data) {
      return response.data ?? fallback;
    }

    // Handle direct response
    return response ?? fallback;
  } catch {
    return fallback;
  }
}

const DEFAULT_STATS: AdminDashboardStats = {
  totalClients: 0,
  activeClients: 0,
  totalLeads: 0,
  leadsToday: 0,
  totalMessages: 0,
  messagesToday: 0,
  conversionRate: 0,
  leadStateDistribution: {
    NEW: 0,
    POST_CALL: 0,
    POST_CALL_REPLIED: 0,
    CUSTOMER_REPLIED: 0,
    QUALIFIED: 0,
    BOOKED: 0,
    CONVERTED: 0,
    LOST: 0,
  },
  recentActivity: [],
  topClients: [],
};

export default async function AdminHomePage() {
  const response = await safeGet<AdminDashboardStats>(
    "/api/admin/dashboard/stats",
    DEFAULT_STATS
  );

  const stats: AdminDashboardStats = {
    totalClients: response.totalClients ?? 0,
    activeClients: response.activeClients ?? 0,
    totalLeads: response.totalLeads ?? 0,
    leadsToday: response.leadsToday ?? 0,
    totalMessages: response.totalMessages ?? 0,
    messagesToday: response.messagesToday ?? 0,
    conversionRate: response.conversionRate ?? 0,
    leadStateDistribution: {
      NEW: response.leadStateDistribution?.NEW ?? 0,
      POST_CALL: response.leadStateDistribution?.POST_CALL ?? 0,
      POST_CALL_REPLIED: response.leadStateDistribution?.POST_CALL_REPLIED ?? 0,
      CUSTOMER_REPLIED: response.leadStateDistribution?.CUSTOMER_REPLIED ?? 0,
      QUALIFIED: response.leadStateDistribution?.QUALIFIED ?? 0,
      BOOKED: response.leadStateDistribution?.BOOKED ?? 0,
      CONVERTED: response.leadStateDistribution?.CONVERTED ?? 0,
      LOST: response.leadStateDistribution?.LOST ?? 0,
    },
    recentActivity: Array.isArray(response.recentActivity)
      ? response.recentActivity
      : [],
    topClients: Array.isArray(response.topClients) ? response.topClients : [],
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-subtitle">System overview and activity monitoring</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Clients */}
        <div className="bg-white dark:bg-jobrun-grey-dark rounded-xl shadow-card p-6 border-l-4 border-jobrun-green hover:shadow-cardHover transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-jobrun-grey">Total Clients</p>
              <p className="text-3xl font-bold text-jobrun-black dark:text-jobrun-grey-light mt-2">{stats.totalClients}</p>
              <p className="text-xs text-jobrun-grey mt-2">{stats.activeClients} active</p>
            </div>
            <div className="h-14 w-14 rounded-full jobrun-gradient flex items-center justify-center text-white text-2xl shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Leads */}
        <div className="bg-white dark:bg-jobrun-grey-dark rounded-xl shadow-card p-6 border-l-4 border-jobrun-green-light hover:shadow-cardHover transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-jobrun-grey">Total Leads</p>
              <p className="text-3xl font-bold text-jobrun-black dark:text-jobrun-grey-light mt-2">{stats.totalLeads}</p>
              <p className="text-xs text-jobrun-green font-semibold mt-2">+{stats.leadsToday} today</p>
            </div>
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-2xl shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Messages */}
        <div className="bg-white dark:bg-jobrun-grey-dark rounded-xl shadow-card p-6 border-l-4 border-jobrun-green-dark hover:shadow-cardHover transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-jobrun-grey">Total Messages</p>
              <p className="text-3xl font-bold text-jobrun-black dark:text-jobrun-grey-light mt-2">{stats.totalMessages}</p>
              <p className="text-xs text-jobrun-grey-dark dark:text-jobrun-grey font-semibold mt-2">{stats.messagesToday} today</p>
            </div>
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-white text-2xl shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white dark:bg-jobrun-grey-dark rounded-xl shadow-card p-6 border-l-4 border-jobrun-green hover:shadow-cardHover transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-jobrun-grey">Conversion Rate</p>
              <p className="text-3xl font-bold text-jobrun-black dark:text-jobrun-grey-light mt-2">
                {stats.conversionRate}%
              </p>
              <p className="text-xs text-jobrun-grey mt-2">Last 30 days</p>
            </div>
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-green-300 to-green-500 flex items-center justify-center text-white text-2xl shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="bg-white dark:bg-jobrun-grey-dark rounded-xl shadow-card p-6 hover:shadow-cardHover transition-all duration-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-jobrun-black dark:text-jobrun-grey-light">Recent Activity</h2>
            <Link href="/admin/messages" className="text-sm text-jobrun-green hover:text-jobrun-green-dark font-medium transition-colors">
              View all →
            </Link>
          </div>

          <div className="space-y-4">
            {stats.recentActivity.length === 0 ? (
              <p className="text-sm text-jobrun-grey text-center py-8">No recent activity</p>
            ) : (
              stats.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start space-x-3 pb-4 border-b border-gray-100 dark:border-gray-700 last:border-0 last:pb-0 hover:bg-gray-50 dark:hover:bg-gray-800 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="flex-shrink-0">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center shadow-md ${
                        activity.type === "INBOUND"
                          ? "jobrun-gradient"
                          : "bg-gradient-to-br from-gray-400 to-gray-600"
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-jobrun-black dark:text-jobrun-grey-light">
                      {activity.clientName || "Unknown Client"}
                    </p>
                    <p className="text-sm text-jobrun-grey-dark dark:text-jobrun-grey truncate mt-1">{activity.preview}</p>
                    <p className="text-xs text-jobrun-grey mt-1">
                      {activity.createdAt
                        ? new Date(activity.createdAt).toLocaleString()
                        : ""}
                    </p>
                  </div>

                  <Badge variant={activity.type === "INBOUND" ? "default" : "secondary"}>
                    {activity.type}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Clients */}
        <div className="bg-white dark:bg-jobrun-grey-dark rounded-xl shadow-card p-6 hover:shadow-cardHover transition-all duration-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-jobrun-black dark:text-jobrun-grey-light">Top Clients</h2>
            <Link href="/admin/clients" className="text-sm text-jobrun-green hover:text-jobrun-green-dark font-medium transition-colors">
              View all →
            </Link>
          </div>

          <div className="space-y-4">
            {stats.topClients.length === 0 ? (
              <p className="text-sm text-jobrun-grey text-center py-8">No clients yet</p>
            ) : (
              stats.topClients.map((client, index) => (
                <Link
                  key={client.id}
                  href={`/admin/clients/${client.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border-2 border-gray-100 dark:border-gray-700 hover:border-jobrun-green hover:bg-green-50 dark:hover:bg-gray-800 transition-all duration-200 group"
                >
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 rounded-full jobrun-gradient flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform">
                      {index + 1}
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-jobrun-black dark:text-jobrun-grey-light">
                        {client.businessName}
                      </p>
                      <p className="text-xs text-jobrun-grey">{client.region}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-bold text-jobrun-black dark:text-jobrun-grey-light">
                      {client.leadCount} leads
                    </p>
                    <p className="text-xs text-jobrun-grey">
                      {client.messageCount} messages
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Lead State Distribution */}
      <div className="bg-white dark:bg-jobrun-grey-dark rounded-xl shadow-card p-6 hover:shadow-cardHover transition-all duration-200">
        <h2 className="text-lg font-semibold text-jobrun-black dark:text-jobrun-grey-light mb-6">
          System-Wide Lead Distribution
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {Object.entries(stats.leadStateDistribution).map(([state, count]) => (
            <div
              key={state}
              className="text-center p-4 rounded-lg border-2 border-gray-100 dark:border-gray-700 hover:border-jobrun-green hover:bg-green-50 dark:hover:bg-gray-800 transition-all duration-200 group"
            >
              <p className="text-2xl font-bold text-jobrun-black dark:text-jobrun-grey-light group-hover:text-jobrun-green transition-colors">{count}</p>
              <p className="text-xs text-jobrun-grey mt-1 uppercase font-semibold">{state.replace(/_/g, ' ')}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-jobrun-grey-dark rounded-xl shadow-card p-6 hover:shadow-cardHover transition-all duration-200">
        <h2 className="text-lg font-semibold text-jobrun-black dark:text-jobrun-grey-light mb-4">Quick Actions</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/admin/clients/new"
            className="flex items-center justify-center p-6 rounded-lg border-2 border-dashed border-jobrun-green hover:border-jobrun-green-dark hover:bg-green-50 dark:hover:bg-gray-800 transition-all duration-200 group font-semibold text-jobrun-grey-dark dark:text-jobrun-grey-light hover:text-jobrun-green"
          >
            <span className="text-2xl mr-3 group-hover:scale-110 transition-transform">➕</span>
            Add New Client
          </Link>

          <Link
            href="/admin/clients"
            className="flex items-center justify-center p-6 rounded-lg border-2 border-dashed border-jobrun-green hover:border-jobrun-green-dark hover:bg-green-50 dark:hover:bg-gray-800 transition-all duration-200 group font-semibold text-jobrun-grey-dark dark:text-jobrun-grey-light hover:text-jobrun-green"
          >
            <span className="text-2xl mr-3 group-hover:scale-110 transition-transform">📁</span>
            Manage Clients
          </Link>

          <Link
            href="/admin/messages"
            className="flex items-center justify-center p-6 rounded-lg border-2 border-dashed border-jobrun-green hover:border-jobrun-green-dark hover:bg-green-50 dark:hover:bg-gray-800 transition-all duration-200 group font-semibold text-jobrun-grey-dark dark:text-jobrun-grey-light hover:text-jobrun-green"
          >
            <span className="text-2xl mr-3 group-hover:scale-110 transition-transform">💬</span>
            View All Messages
          </Link>
        </div>
      </div>
    </div>
  );
}
