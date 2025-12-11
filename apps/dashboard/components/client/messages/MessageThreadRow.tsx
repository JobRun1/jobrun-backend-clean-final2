import React from "react";
import Link from "next/link";
import { LeadStateBadge } from "../LeadStateBadge";

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

interface MessageThreadRowProps {
  thread: MessageThread;
  clientId: string;
}

function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function MessageThreadRow({ thread, clientId }: MessageThreadRowProps) {
  const messagePreview = thread.latestMessage.body.substring(0, 60);
  const truncated = thread.latestMessage.body.length > 60;

  const getMessageTextClass = () => {
    if (thread.latestMessage.direction === "INBOUND") {
      return "text-jobrun-grey-dark dark:text-jobrun-grey";
    }
    if (thread.latestMessage.direction === "OUTBOUND") {
      return "text-jobrun-green dark:text-jobrun-green-light";
    }
    return "text-jobrun-green-dark dark:text-jobrun-green italic";
  };

  return (
    <Link
      href={`/client/leads/${thread.leadId}?clientId=${clientId}&tab=messages`}
      className="block p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-green-50 dark:hover:bg-gray-800 transition-colors duration-150"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 mt-1 relative">
            <div className="h-12 w-12 rounded-full jobrun-gradient flex items-center justify-center text-white font-bold text-sm shadow-md">
              {thread.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .substring(0, 2) || "??"}
            </div>
            {thread.hasUnread && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-jobrun-green border-2 border-white dark:border-gray-900 animate-pulse"></span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-jobrun-black dark:text-jobrun-grey-light truncate">
                {thread.name}
              </h3>
              {thread.hasUnread && (
                <span className="flex-shrink-0 px-2 py-0.5 text-xs font-semibold bg-jobrun-green text-white rounded-full">
                  New
                </span>
              )}
            </div>

            <p className="text-xs text-jobrun-grey mb-1">{thread.phone}</p>

            <p className="text-xs text-jobrun-grey-dark dark:text-jobrun-grey mb-2">
              {thread.jobType}
            </p>

            <p className={`text-sm line-clamp-2 ${getMessageTextClass()}`}>
              {messagePreview}
              {truncated && "..."}
            </p>
          </div>
        </div>

        <div className="flex-shrink-0 flex flex-col items-end gap-2">
          <LeadStateBadge state={thread.state} size="sm" />
          <span className="text-xs text-jobrun-grey whitespace-nowrap">
            {formatRelativeTime(thread.latestMessage.createdAt)}
          </span>
        </div>
      </div>
    </Link>
  );
}
