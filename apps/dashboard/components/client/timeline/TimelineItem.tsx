import React from "react";

type EventType =
  | "MESSAGE"
  | "STATE_CHANGE"
  | "AI_ACTION"
  | "BOOKING"
  | "NOTE"
  | "LEAD_CREATED";

interface TimelineItemProps {
  type: EventType;
  title: string;
  description: string;
  timestamp: string;
  isLast?: boolean;
}

export function TimelineItem({
  type,
  title,
  description,
  timestamp,
  isLast = false,
}: TimelineItemProps) {
  const getIconAndColor = () => {
    switch (type) {
      case "LEAD_CREATED":
        return {
          icon: (
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
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
          ),
          bgColor: "bg-jobrun-green",
          borderColor: "border-jobrun-green",
        };
      case "MESSAGE":
        return {
          icon: (
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
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          ),
          bgColor: "bg-jobrun-green-light",
          borderColor: "border-jobrun-green-light",
        };
      case "AI_ACTION":
        return {
          icon: (
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
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          ),
          bgColor: "bg-jobrun-green-dark",
          borderColor: "border-jobrun-green-dark",
        };
      case "STATE_CHANGE":
        return {
          icon: (
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
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          ),
          bgColor: title.includes("LOST") ? "bg-gray-500" : "bg-jobrun-green",
          borderColor: title.includes("LOST") ? "border-gray-500" : "border-jobrun-green",
        };
      case "BOOKING":
        return {
          icon: (
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
          ),
          bgColor: "bg-jobrun-green",
          borderColor: "border-jobrun-green",
        };
      case "NOTE":
        return {
          icon: (
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
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          ),
          bgColor: "bg-gray-400",
          borderColor: "border-gray-400",
        };
      default:
        return {
          icon: null,
          bgColor: "bg-gray-400",
          borderColor: "border-gray-400",
        };
    }
  };

  const { icon, bgColor, borderColor } = getIconAndColor();

  return (
    <div className="flex gap-4 relative">
      <div className="flex flex-col items-center">
        <div
          className={`h-10 w-10 rounded-full ${bgColor} flex items-center justify-center text-white shadow-md z-10`}
        >
          {icon}
        </div>
        {!isLast && (
          <div className={`flex-1 w-0.5 ${borderColor} bg-opacity-30 mt-2`} style={{ minHeight: "40px" }}></div>
        )}
      </div>

      <div className="flex-1 pb-8">
        <div className={`border-l-4 ${borderColor} pl-4 py-2`}>
          <h3 className="text-sm font-semibold text-jobrun-black dark:text-jobrun-grey-light">
            {title}
          </h3>
          <p className="text-sm text-jobrun-grey-dark dark:text-jobrun-grey mt-1">
            {description}
          </p>
          <p className="text-xs text-jobrun-grey mt-2">
            {new Date(timestamp).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
