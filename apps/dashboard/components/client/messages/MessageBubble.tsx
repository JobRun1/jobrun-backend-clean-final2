import React from "react";

type MessageDirection = "INBOUND" | "OUTBOUND" | "AI";
type MessageType = "SMS" | "WHATSAPP" | "CALL" | "AI_NOTE";

interface MessageBubbleProps {
  direction: MessageDirection;
  type: MessageType;
  body: string;
  timestamp: string;
}

export function MessageBubble({ direction, type, body, timestamp }: MessageBubbleProps) {
  const isInbound = direction === "INBOUND";
  const isOutbound = direction === "OUTBOUND";
  const isAI = direction === "AI";

  const bubbleClasses = isInbound
    ? "bg-gray-100 dark:bg-gray-700 text-jobrun-black dark:text-jobrun-grey-light"
    : isOutbound
    ? "jobrun-gradient text-white"
    : "bg-green-800 dark:bg-green-900 text-white italic";

  const alignmentClasses = isInbound ? "items-start" : "items-end";

  return (
    <div className={`flex flex-col ${alignmentClasses} mb-4`}>
      <div className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-md ${bubbleClasses}`}>
        {isAI && (
          <div className="flex items-center gap-2 mb-1">
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
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <span className="text-xs font-semibold uppercase tracking-wide">AI Assistant</span>
          </div>
        )}
        <p className={`text-sm ${isAI ? "text-sm" : ""}`}>{body}</p>
      </div>
      <span
        className={`text-xs text-jobrun-grey mt-1 ${
          isInbound ? "text-left" : "text-right"
        }`}
      >
        {new Date(timestamp).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })}
      </span>
    </div>
  );
}
