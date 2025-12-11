import { LeadStateBadge } from "@/components/client/LeadStateBadge";
import { MessageList } from "@/components/client/messages/MessageList";
import { MessageInput } from "@/components/client/messages/MessageInput";
import { TimelineList } from "@/components/client/timeline/TimelineList";
import Link from "next/link";
import { notFound } from "next/navigation";

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
type MessageType = "SMS" | "WHATSAPP" | "CALL" | "AI_NOTE";

interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  state: LeadState;
  urgency: "HIGH" | "NORMAL";
  jobType: string;
  latestMessage: string;
  latestTimestamp: string;
  messageCount: number;
  bookingCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  direction: MessageDirection;
  type: MessageType;
  body: string;
  createdAt: string;
  isRead: boolean;
}

interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
}

interface SearchParams {
  clientId?: string;
  tab?: string;
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

export default async function LeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const { clientId, tab = "messages" } = await searchParams;

  if (!clientId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-jobrun-black dark:text-jobrun-grey-light mb-2">
            Missing Client ID
          </h2>
          <p className="text-jobrun-grey">
            Please access this page through the leads inbox.
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

  const lead = await safeGet<Lead | null>(
    `/api/client/leads/${id}?clientId=${clientId}`,
    null
  );

  if (!lead) {
    notFound();
  }

  const messages =
    tab === "messages"
      ? await safeGet<Message[]>(
          `/api/client/leads/${id}/messages?clientId=${clientId}`,
          []
        )
      : [];

  const timelineEvents =
    tab === "timeline"
      ? await safeGet<TimelineEvent[]>(
          `/api/client/leads/${id}/timeline?clientId=${clientId}`,
          []
        )
      : [];

  const tabs = [
    { id: "messages", label: "Messages", count: lead.messageCount },
    { id: "timeline", label: "Timeline", count: undefined },
    { id: "bookings", label: "Bookings", count: lead.bookingCount },
    { id: "notes", label: "Notes", count: undefined },
  ];

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href={`/client/leads?clientId=${clientId}`}
              className="text-jobrun-green hover:text-jobrun-green-dark flex items-center transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-1"
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
              Back to Leads
            </Link>
          </div>
          <h1 className="page-title">{lead.name}</h1>
          <p className="page-subtitle">{lead.phone}</p>
        </div>

        <div className="flex items-center gap-3">
          <LeadStateBadge state={lead.state} size="lg" />
        </div>
      </div>

      <div className="bg-white dark:bg-jobrun-grey-dark rounded-xl shadow-card overflow-hidden flex-1 flex flex-col">
        <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-6 py-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {tabs.map((t) => {
              const isActive = tab === t.id;
              const isDisabled = t.id === "bookings" || t.id === "notes";
              return (
                <Link
                  key={t.id}
                  href={
                    isDisabled
                      ? "#"
                      : `/client/leads/${id}?clientId=${clientId}&tab=${t.id}`
                  }
                  className={`
                    px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200
                    ${
                      isActive
                        ? "jobrun-gradient text-white shadow-md"
                        : isDisabled
                        ? "bg-gray-200 dark:bg-gray-700 text-jobrun-grey cursor-not-allowed opacity-50"
                        : "bg-white dark:bg-jobrun-grey-dark text-jobrun-grey-dark dark:text-jobrun-grey hover:bg-green-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600"
                    }
                  `}
                  onClick={(e) => {
                    if (isDisabled) e.preventDefault();
                  }}
                >
                  {t.label}
                  {t.count !== undefined && (
                    <span className="ml-2 text-xs opacity-75">({t.count})</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {tab === "messages" && (
            <>
              <MessageList messages={messages} />
              <MessageInput leadId={id} clientId={clientId} />
            </>
          )}

          {tab === "timeline" && <TimelineList events={timelineEvents} />}

          {tab === "bookings" && (
            <div className="flex items-center justify-center h-full p-12">
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
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-jobrun-black dark:text-jobrun-grey-light mb-2">
                  Bookings Coming Soon
                </h3>
                <p className="text-sm text-jobrun-grey">
                  Booking management will be available in a future update.
                </p>
              </div>
            </div>
          )}

          {tab === "notes" && (
            <div className="flex items-center justify-center h-full p-12">
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
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-jobrun-black dark:text-jobrun-grey-light mb-2">
                  Notes Coming Soon
                </h3>
                <p className="text-sm text-jobrun-grey">
                  Lead notes will be available in a future update.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
