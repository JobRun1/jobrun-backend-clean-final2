import { LeadRow } from "@/components/client/LeadRow";
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

interface Lead {
  id: string;
  name: string;
  phone: string;
  latestMessage: string;
  latestTimestamp: string;
  state: LeadState;
  urgency: "HIGH" | "NORMAL";
  jobType: string;
  hasUnread: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SearchParams {
  clientId?: string;
  state?: string;
}

async function safeGet<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${API_BASE_URL}${url}`, {
      cache: "no-store",
    });
    if (!res.ok) return fallback;
    const response = await res.json();
    return response?.data ?? response ?? fallback;
  } catch {
    return fallback;
  }
}

export default async function ClientLeadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const clientId = params.clientId;
  const activeState = params.state || "ALL";

  if (!clientId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-jobrun-black dark:text-jobrun-grey-light mb-2">
            Missing Client ID
          </h2>
          <p className="text-jobrun-grey">
            Please access this page through the impersonation flow.
          </p>
          <Link
            href="/admin/clients"
            className="inline-block mt-4 px-6 py-2 jobrun-gradient text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            Return to Admin
          </Link>
        </div>
      </div>
    );
  }

  const stateQuery = activeState !== "ALL" ? `&state=${activeState}` : "";
  const leads = await safeGet<Lead[]>(
    `/api/client/leads?clientId=${clientId}${stateQuery}`,
    []
  );

  const states: Array<{ value: string; label: string; count?: number }> = [
    { value: "ALL", label: "All" },
    { value: "NEW", label: "New" },
    { value: "POST_CALL", label: "Post Call" },
    { value: "POST_CALL_REPLIED", label: "Post Call Replied" },
    { value: "CUSTOMER_REPLIED", label: "Customer Replied" },
    { value: "QUALIFIED", label: "Qualified" },
    { value: "BOOKED", label: "Booked" },
    { value: "CONVERTED", label: "Converted" },
    { value: "LOST", label: "Lost" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Leads Inbox</h1>
        <p className="page-subtitle">Manage and track your customer interactions</p>
      </div>

      <div className="bg-white dark:bg-jobrun-grey-dark rounded-xl shadow-card overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-6 py-4">
          <div className="flex items-center gap-2 overflow-x-auto">
            {states.map((state) => {
              const isActive = activeState === state.value;
              return (
                <Link
                  key={state.value}
                  href={`/client/leads?clientId=${clientId}&state=${state.value}`}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200
                    ${
                      isActive
                        ? "jobrun-gradient text-white shadow-md"
                        : "bg-white dark:bg-jobrun-grey-dark text-jobrun-grey-dark dark:text-jobrun-grey hover:bg-green-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600"
                    }
                  `}
                >
                  {state.label}
                  {state.count !== undefined && (
                    <span className="ml-2 text-xs opacity-75">({state.count})</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {leads.length === 0 ? (
            <div className="p-12 text-center">
              <div className="h-16 w-16 rounded-full bg-green-50 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-jobrun-green"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-jobrun-black dark:text-jobrun-grey-light mb-2">
                No leads found
              </h3>
              <p className="text-sm text-jobrun-grey">
                {activeState === "ALL"
                  ? "No leads have been created yet."
                  : `No leads in "${activeState}" state.`}
              </p>
            </div>
          ) : (
            leads.map((lead) => <LeadRow key={lead.id} lead={lead} />)
          )}
        </div>
      </div>

      {leads.length > 0 && (
        <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-jobrun-grey-dark rounded-xl shadow-card">
          <p className="text-sm text-jobrun-grey">
            Showing <span className="font-semibold text-jobrun-black dark:text-jobrun-grey-light">{leads.length}</span> lead{leads.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}
