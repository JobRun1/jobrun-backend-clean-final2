import React from "react";

type LeadState =
  | "NEW"
  | "POST_CALL"
  | "POST_CALL_REPLIED"
  | "CUSTOMER_REPLIED"
  | "QUALIFIED"
  | "BOOKED"
  | "CONVERTED"
  | "LOST";

interface LeadStateBadgeProps {
  state: LeadState;
  size?: "sm" | "md" | "lg";
}

export function LeadStateBadge({ state, size = "md" }: LeadStateBadgeProps) {
  const stateConfig: Record<
    LeadState,
    {
      label: string;
      lightBg: string;
      darkBg: string;
      lightText: string;
      darkText: string;
      lightBorder: string;
      darkBorder: string;
    }
  > = {
    NEW: {
      label: "New",
      lightBg: "bg-green-50",
      darkBg: "dark:bg-green-950",
      lightText: "text-green-700",
      darkText: "dark:text-green-300",
      lightBorder: "border-green-200",
      darkBorder: "dark:border-green-800",
    },
    POST_CALL: {
      label: "Post Call",
      lightBg: "bg-jobrun-green/10",
      darkBg: "dark:bg-jobrun-green/20",
      lightText: "text-jobrun-green-dark",
      darkText: "dark:text-jobrun-green-light",
      lightBorder: "border-jobrun-green",
      darkBorder: "dark:border-jobrun-green",
    },
    POST_CALL_REPLIED: {
      label: "Post Call Replied",
      lightBg: "bg-green-100",
      darkBg: "dark:bg-green-900",
      lightText: "text-green-800",
      darkText: "dark:text-green-200",
      lightBorder: "border-green-300",
      darkBorder: "dark:border-green-700",
    },
    CUSTOMER_REPLIED: {
      label: "Customer Replied",
      lightBg: "bg-green-100",
      darkBg: "dark:bg-green-900",
      lightText: "text-green-900",
      darkText: "dark:text-green-100",
      lightBorder: "border-green-400",
      darkBorder: "dark:border-green-600",
    },
    QUALIFIED: {
      label: "Qualified",
      lightBg: "bg-jobrun-green/20",
      darkBg: "dark:bg-jobrun-green/30",
      lightText: "text-jobrun-green-dark",
      darkText: "dark:text-jobrun-green-light",
      lightBorder: "border-jobrun-green",
      darkBorder: "dark:border-jobrun-green-light",
    },
    BOOKED: {
      label: "Booked",
      lightBg: "bg-green-200",
      darkBg: "dark:bg-green-800",
      lightText: "text-green-900",
      darkText: "dark:text-green-50",
      lightBorder: "border-green-500",
      darkBorder: "dark:border-green-500",
    },
    CONVERTED: {
      label: "Converted",
      lightBg: "bg-jobrun-green",
      darkBg: "dark:bg-jobrun-green-dark",
      lightText: "text-white",
      darkText: "dark:text-white",
      lightBorder: "border-jobrun-green-dark",
      darkBorder: "dark:border-jobrun-green",
    },
    LOST: {
      label: "Lost",
      lightBg: "bg-gray-100",
      darkBg: "dark:bg-gray-800",
      lightText: "text-gray-700",
      darkText: "dark:text-gray-300",
      lightBorder: "border-gray-300",
      darkBorder: "dark:border-gray-600",
    },
  };

  const config = stateConfig[state];

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  };

  return (
    <span
      className={`
        inline-flex items-center justify-center font-semibold rounded-md border
        ${config.lightBg} ${config.darkBg}
        ${config.lightText} ${config.darkText}
        ${config.lightBorder} ${config.darkBorder}
        ${sizeClasses[size]}
        transition-colors duration-200
      `}
    >
      {config.label}
    </span>
  );
}
