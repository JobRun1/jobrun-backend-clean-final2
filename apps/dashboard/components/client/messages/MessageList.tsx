"use client";

import React, { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";

type MessageDirection = "INBOUND" | "OUTBOUND" | "AI";
type MessageType = "SMS" | "WHATSAPP" | "CALL" | "AI_NOTE";

interface Message {
  id: string;
  direction: MessageDirection;
  type: MessageType;
  body: string;
  createdAt: string;
  isRead: boolean;
}

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
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
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-jobrun-black dark:text-jobrun-grey-light mb-2">
            No messages yet
          </h3>
          <p className="text-sm text-jobrun-grey">
            Start the conversation by sending a message below.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-2">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          direction={message.direction}
          type={message.type}
          body={message.body}
          timestamp={message.createdAt}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
