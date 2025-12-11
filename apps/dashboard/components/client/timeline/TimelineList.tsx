import React from "react";
import { TimelineItem } from "./TimelineItem";

type EventType =
  | "MESSAGE"
  | "STATE_CHANGE"
  | "AI_ACTION"
  | "BOOKING"
  | "NOTE"
  | "LEAD_CREATED";

interface TimelineEvent {
  id: string;
  type: EventType;
  title: string;
  description: string;
  timestamp: string;
}

interface TimelineListProps {
  events: TimelineEvent[];
}

export function TimelineList({ events }: TimelineListProps) {
  if (events.length === 0) {
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
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-jobrun-black dark:text-jobrun-grey-light mb-2">
            No timeline events
          </h3>
          <p className="text-sm text-jobrun-grey">
            Timeline events will appear here as the lead progresses.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {events.map((event, index) => (
        <TimelineItem
          key={event.id}
          type={event.type as EventType}
          title={event.title}
          description={event.description}
          timestamp={event.timestamp}
          isLast={index === events.length - 1}
        />
      ))}
    </div>
  );
}
