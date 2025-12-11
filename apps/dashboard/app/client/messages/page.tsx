import { MessageThreadRow } from "@/components/client/messages/MessageThreadRow";

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

type MessageDirection = "INBOUND" | "OUTBOUND" | "AI";

interface MessageThread {
  leadId: string;
  name: string;
  phone: string;
  state: LeadState;
  jobType: string;
  latestMessage: {
    id: string;
    direction: MessageDirection;
    body: string;
    createdAt: string;
  };
  hasUnread: boolean;
  updatedAt: string;
}

interface SearchParams {
  clientId?: string;
  filter?: string;
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

export default async function ClientMessagesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { clientId, filter = "ALL" } = await searchParams;

  if (!clientId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-jobrun-black dark:text-jobrun-grey-light mb-2">
            Missing Client ID
          </h2>
          <p className="text-jobrun-grey">
            Please access this page through the client dashboard.
          </p>
        </div>
      </div>
    );
  }

  const threads = await safeGet<MessageThread[]>(
    `/api/client/messages?clientId=${clientId}&filter=${filter}`,
    []
  );

  const filters = [
    { id: "ALL", label: "All Messages" },
    { id: "UNREAD", label: "Unread" },
    { id: "INBOUND", label: "Inbound" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Messages</h1>
        <p className="page-subtitle">View and manage all conversations</p>
      </div>

      <div className="bg-white dark:bg-jobrun-grey-dark rounded-xl shadow-card p-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          {filters.map((f) => {
            const isActive = filter === f.id;
            return (
              <a
                key={f.id}
                href={`/client/messages?clientId=${clientId}&filter=${f.id}`}
                className={`
                  px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200
                  ${
                    isActive
                      ? "jobrun-gradient text-white shadow-md"
                      : "bg-gray-100 dark:bg-gray-700 text-jobrun-grey-dark dark:text-jobrun-grey hover:bg-green-50 dark:hover:bg-gray-600"
                  }
                `}
              >
                {f.label}
              </a>
            );
          })}
        </div>
      </div>

      {threads.length === 0 ? (
        <div className="bg-white dark:bg-jobrun-grey-dark rounded-xl shadow-card p-12">
          <div className="text-center">
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
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-jobrun-black dark:text-jobrun-grey-light mb-2">
              No messages found
            </h3>
            <p className="text-sm text-jobrun-grey">
              {filter === "UNREAD"
                ? "You're all caught up! No unread messages."
                : filter === "INBOUND"
                ? "No inbound messages at the moment."
                : "Start conversations with your leads to see messages here."}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-jobrun-grey-dark rounded-xl shadow-card overflow-hidden">
          {threads.map((thread) => (
            <MessageThreadRow
              key={thread.leadId}
              thread={thread}
              clientId={clientId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
