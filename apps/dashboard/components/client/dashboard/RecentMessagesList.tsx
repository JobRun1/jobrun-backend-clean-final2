import React from "react";
import Link from "next/link";

type MessageDirection = "INBOUND" | "OUTBOUND" | "AI";

interface RecentMessage {
  id: string;
  leadId: string;
  leadName: string;
  body: string;
  direction: MessageDirection;
  createdAt: string;
}

interface RecentMessagesListProps {
  messages: RecentMessage[];
  clientId: string;
}

function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getDirectionBadge(direction: MessageDirection) {
  if (direction === "INBOUND") {
    return (
      <span className="px-2 py-0.5 text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-jobrun-grey-dark dark:text-jobrun-grey rounded">
        INBOUND
      </span>
    );
  }
  if (direction === "OUTBOUND") {
    return (
      <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 dark:bg-green-900 text-jobrun-green-dark dark:text-jobrun-green-light rounded">
        OUTBOUND
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 text-xs font-semibold bg-green-800 dark:bg-green-900 text-white rounded">
      AI
    </span>
  );
}

export function RecentMessagesList({ messages, clientId }: RecentMessagesListProps) {
  if (messages.length === 0) {
    return (
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
            No recent messages
          </h3>
          <p className="text-sm text-jobrun-grey">
            Recent messages will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-jobrun-grey-dark rounded-xl shadow-card overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-jobrun-black dark:text-jobrun-grey-light">
          Recent Messages
        </h3>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {messages.map((message) => {
          const preview = message.body.substring(0, 80);
          const truncated = message.body.length > 80;

          return (
            <Link
              key={message.id}
              href={`/client/leads/${message.leadId}?clientId=${clientId}&tab=messages`}
              className="block p-4 hover:bg-green-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <span className="font-semibold text-sm text-jobrun-black dark:text-jobrun-grey-light">
                  {message.leadName}
                </span>
                <div className="flex items-center gap-2">
                  {getDirectionBadge(message.direction)}
                  <span className="text-xs text-jobrun-grey whitespace-nowrap">
                    {formatRelativeTime(message.createdAt)}
                  </span>
                </div>
              </div>
              <p className="text-sm text-jobrun-grey-dark dark:text-jobrun-grey line-clamp-2">
                {preview}
                {truncated && "..."}
              </p>
            </Link>
          );
        })}
      </div>
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <Link
          href={`/client/messages?clientId=${clientId}`}
          className="block text-center text-sm font-semibold text-jobrun-green hover:text-jobrun-green-dark transition-colors"
        >
          View All Messages →
        </Link>
      </div>
    </div>
  );
}
