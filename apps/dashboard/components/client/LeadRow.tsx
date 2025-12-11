import React from "react";
import Link from "next/link";
import { LeadStateBadge } from "./LeadStateBadge";

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
}

interface LeadRowProps {
  lead: Lead;
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

export function LeadRow({ lead }: LeadRowProps) {
  return (
    <Link
      href={`/client/leads/${lead.id}?clientId=${encodeURIComponent(lead.id)}`}
      className="block p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-green-50 dark:hover:bg-gray-800 transition-colors duration-150"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 mt-1">
            <div className="h-10 w-10 rounded-full jobrun-gradient flex items-center justify-center text-white font-bold text-sm shadow-md">
              {lead.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .substring(0, 2) || "??"}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-jobrun-black dark:text-jobrun-grey-light truncate">
                {lead.name}
              </h3>
              {lead.hasUnread && (
                <span className="flex-shrink-0 h-2 w-2 rounded-full bg-jobrun-green animate-pulse"></span>
              )}
              {lead.urgency === "HIGH" && (
                <span className="flex-shrink-0 h-2 w-2 rounded-full bg-amber-500"></span>
              )}
            </div>

            <p className="text-xs text-jobrun-grey mb-1">{lead.phone}</p>

            <p className="text-xs text-jobrun-grey-dark dark:text-jobrun-grey mb-2 line-clamp-1">
              {lead.jobType}
            </p>

            <p className="text-sm text-jobrun-grey-dark dark:text-jobrun-grey line-clamp-2">
              {lead.latestMessage}
            </p>
          </div>
        </div>

        <div className="flex-shrink-0 flex flex-col items-end gap-2">
          <LeadStateBadge state={lead.state} size="sm" />
          <span className="text-xs text-jobrun-grey whitespace-nowrap">
            {formatRelativeTime(lead.latestTimestamp)}
          </span>
        </div>
      </div>
    </Link>
  );
}
