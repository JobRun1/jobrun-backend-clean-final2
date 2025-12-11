import React from "react";

interface FunnelData {
  NEW: number;
  POST_CALL: number;
  POST_CALL_REPLIED: number;
  CUSTOMER_REPLIED: number;
  QUALIFIED: number;
  BOOKED: number;
  CONVERTED: number;
  LOST: number;
}

interface FunnelProps {
  data: FunnelData;
}

const stages = [
  { key: "NEW", label: "New", color: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800" },
  { key: "POST_CALL", label: "Post Call", color: "bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700" },
  { key: "POST_CALL_REPLIED", label: "Post Call Replied", color: "bg-green-200 dark:bg-green-800 border-green-400 dark:border-green-600" },
  { key: "CUSTOMER_REPLIED", label: "Customer Replied", color: "bg-green-300 dark:bg-green-700 border-green-500 dark:border-green-500" },
  { key: "QUALIFIED", label: "Qualified", color: "bg-green-400 dark:bg-green-600 border-green-600 dark:border-green-400" },
  { key: "BOOKED", label: "Booked", color: "bg-green-500 dark:bg-green-500 border-green-700 dark:border-green-300" },
  { key: "CONVERTED", label: "Converted", color: "bg-jobrun-green dark:bg-jobrun-green border-jobrun-green-dark dark:border-jobrun-green-light" },
  { key: "LOST", label: "Lost", color: "bg-gray-200 dark:bg-gray-700 border-gray-400 dark:border-gray-600" },
];

export function Funnel({ data }: FunnelProps) {
  const total = Object.values(data).reduce((sum, val) => sum + val, 0);

  if (total === 0) {
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
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-jobrun-black dark:text-jobrun-grey-light mb-2">
            No leads yet
          </h3>
          <p className="text-sm text-jobrun-grey">
            Your lead funnel will appear here once you have leads.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-jobrun-grey-dark rounded-xl shadow-card p-6">
      <h3 className="text-lg font-semibold text-jobrun-black dark:text-jobrun-grey-light mb-6">
        Lead Funnel
      </h3>
      <div className="space-y-3">
        {stages.map((stage) => {
          const count = data[stage.key as keyof FunnelData];
          const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
          const width = total > 0 ? (count / total) * 100 : 0;

          return (
            <div key={stage.key} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-jobrun-black dark:text-jobrun-grey-light">
                  {stage.label}
                </span>
                <span className="text-jobrun-grey">
                  {count} ({percentage}%)
                </span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-8 overflow-hidden border border-gray-200 dark:border-gray-700">
                <div
                  className={`h-full ${stage.color} border-r-2 transition-all duration-500 flex items-center justify-end pr-3`}
                  style={{ width: `${Math.max(width, count > 0 ? 8 : 0)}%` }}
                >
                  {count > 0 && (
                    <span className="text-xs font-bold text-jobrun-black dark:text-white">
                      {count}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
