import React from "react";
import Link from "next/link";

type EventType = "MESSAGE" | "AI_ACTION" | "BOOKING" | "STATE_CHANGE";

interface ActivityEvent {
  id: string;
  type: EventType;
  title: string;
  description: string;
  timestamp: string;
  leadId?: string;
}

interface ActivityFeedProps {
  events: ActivityEvent[];
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
    hour: "numeric",
    minute: "2-digit",
  });
}

function getEventIcon(type: EventType) {
  if (type === "MESSAGE") {
    return (
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
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    );
  }

  if (type === "AI_ACTION") {
    return (
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
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
        />
      </svg>
    );
  }

  if (type === "BOOKING") {
    return (
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
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    );
  }

  return (
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
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  );
}

function getEventColor(type: EventType) {
  if (type === "MESSAGE") {
    return "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800";
  }
  if (type === "AI_ACTION") {
    return "bg-green-50 dark:bg-green-900/20 text-jobrun-green dark:text-jobrun-green-light border-green-200 dark:border-green-800";
  }
  if (type === "BOOKING") {
    return "bg-green-50 dark:bg-green-900/20 text-jobrun-green-dark dark:text-jobrun-green border-green-200 dark:border-green-700";
  }
  return "bg-gray-50 dark:bg-gray-800 text-jobrun-grey-dark dark:text-jobrun-grey border-gray-200 dark:border-gray-700";
}

export function ActivityFeed({ events, clientId }: ActivityFeedProps) {
  if (events.length === 0) {
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
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-jobrun-black dark:text-jobrun-grey-light mb-2">
            No activity today
          </h3>
          <p className="text-sm text-jobrun-grey">
            Today's activity will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-jobrun-grey-dark rounded-xl shadow-card overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-jobrun-black dark:text-jobrun-grey-light">
          Today's Activity
        </h3>
      </div>
      <div className="p-6 space-y-4">
        {events.map((event) => {
          const content = (
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center border ${getEventColor(event.type)}`}>
                {getEventIcon(event.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-jobrun-black dark:text-jobrun-grey-light mb-1">
                  {event.title}
                </p>
                <p className="text-sm text-jobrun-grey-dark dark:text-jobrun-grey mb-1">
                  {event.description}
                </p>
                <p className="text-xs text-jobrun-grey">
                  {formatRelativeTime(event.timestamp)}
                </p>
              </div>
            </div>
          );

          if (event.leadId) {
            return (
              <Link
                key={event.id}
                href={`/client/leads/${event.leadId}?clientId=${clientId}`}
                className="block p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-green-50 dark:hover:bg-gray-800 transition-colors"
              >
                {content}
              </Link>
            );
          }

          return (
            <div
              key={event.id}
              className="p-3 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
