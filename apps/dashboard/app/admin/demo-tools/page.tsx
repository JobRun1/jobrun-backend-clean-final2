import { GenerateDemoButton } from "@/components/admin/demo/GenerateDemoButton";
import { WipeDemoButton } from "@/components/admin/demo/WipeDemoButton";
import Link from "next/link";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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

interface Client {
  id: string;
  businessName: string;
  region: string;
  demoClient: boolean;
  _count?: {
    customers: number;
    messages: number;
    bookings: number;
  };
}

export default async function DemoToolsPage() {
  const response = await safeGet<{ clients: Client[] }>(
    "/api/admin/clients",
    { clients: [] }
  );

  const demoClients = response.clients.filter((client) => client.demoClient);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Link
            href="/admin"
            className="text-jobrun-grey hover:text-jobrun-grey-dark dark:hover:text-jobrun-grey-light transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <h1 className="page-title">Demo Tools</h1>
        </div>
        <p className="page-subtitle">
          Generate and manage demo clients for testing and demonstrations
        </p>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Generate Demo Card */}
        <div className="bg-white dark:bg-jobrun-grey-dark rounded-xl shadow-card p-6 hover:shadow-cardHover transition-all duration-200 border-l-4 border-jobrun-green">
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full jobrun-gradient flex items-center justify-center text-white shadow-md">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-jobrun-black dark:text-jobrun-grey-light">
                Generate Demo Client
              </h2>
            </div>
            <p className="text-sm text-jobrun-grey-dark dark:text-jobrun-grey">
              Create a new demo client with realistic data including leads, messages, and bookings.
              Each client is automatically numbered (Demo Client #1, #2, etc.).
            </p>
          </div>

          <div className="space-y-3 mb-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <h3 className="text-xs font-semibold text-jobrun-grey-dark dark:text-jobrun-grey uppercase tracking-wide">
              What Gets Created
            </h3>
            <ul className="space-y-2 text-sm text-jobrun-grey-dark dark:text-jobrun-grey">
              <li className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-jobrun-green"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                1 demo client with auto-incremented name
              </li>
              <li className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-jobrun-green"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                3-7 customer leads with varied states
              </li>
              <li className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-jobrun-green"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                2-6 messages per lead (inbound, outbound, AI)
              </li>
              <li className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-jobrun-green"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                0-2 bookings per lead
              </li>
              <li className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-jobrun-green"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Timestamps spread over last 24-72 hours
              </li>
            </ul>
          </div>

          <GenerateDemoButton />
        </div>

        {/* Wipe Demo Card */}
        <div className="bg-white dark:bg-jobrun-grey-dark rounded-xl shadow-card p-6 hover:shadow-cardHover transition-all duration-200 border-l-4 border-red-600">
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-red-600 flex items-center justify-center text-white shadow-md">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-jobrun-black dark:text-jobrun-grey-light">
                Wipe Demo Data
              </h2>
            </div>
            <p className="text-sm text-jobrun-grey-dark dark:text-jobrun-grey">
              Delete all demo clients and their associated data. This action cannot be undone,
              but only affects demo clients—real clients are never deleted.
            </p>
          </div>

          <div className="space-y-3 mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <h3 className="text-xs font-semibold text-red-800 dark:text-red-300 uppercase tracking-wide">
              Safety Information
            </h3>
            <ul className="space-y-2 text-sm text-red-700 dark:text-red-300">
              <li className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Only deletes clients marked as demo
              </li>
              <li className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Real client data is never affected
              </li>
              <li className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Cascades to all related data
              </li>
              <li className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Confirmation required before deletion
              </li>
            </ul>
          </div>

          <WipeDemoButton />
        </div>
      </div>

      {/* Current Demo Clients */}
      <div className="bg-white dark:bg-jobrun-grey-dark rounded-xl shadow-card p-6 hover:shadow-cardHover transition-all duration-200">
        <h2 className="text-lg font-semibold text-jobrun-black dark:text-jobrun-grey-light mb-4">
          Current Demo Clients ({demoClients.length})
        </h2>

        {demoClients.length === 0 ? (
          <div className="text-center py-12">
            <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-jobrun-grey"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
            </div>
            <p className="text-jobrun-grey-dark dark:text-jobrun-grey font-medium">
              No demo clients exist
            </p>
            <p className="text-sm text-jobrun-grey mt-1">
              Generate your first demo client to get started
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {demoClients.map((client) => (
              <Link
                key={client.id}
                href={`/admin/clients/${client.id}`}
                className="block p-4 rounded-lg border-2 border-gray-100 dark:border-gray-700 hover:border-jobrun-green hover:bg-green-50 dark:hover:bg-gray-800 transition-all duration-200 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full jobrun-gradient flex items-center justify-center text-white font-bold shadow-md group-hover:scale-110 transition-transform">
                      {client.businessName.match(/#(\d+)/)?.[1] || "?"}
                    </div>
                    <div>
                      <p className="font-semibold text-jobrun-black dark:text-jobrun-grey-light">
                        {client.businessName}
                      </p>
                      <p className="text-sm text-jobrun-grey">{client.region}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-jobrun-grey-dark dark:text-jobrun-grey">
                      {client._count?.customers || 0} leads • {client._count?.messages || 0} messages • {client._count?.bookings || 0} bookings
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
