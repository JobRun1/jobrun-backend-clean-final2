import React from "react";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}

export function KpiCard({ title, value, icon }: KpiCardProps) {
  return (
    <div className="bg-white dark:bg-jobrun-grey-dark rounded-xl shadow-card p-6 border-l-4 border-jobrun-green">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-jobrun-grey mb-1">{title}</p>
          <p className="text-3xl font-bold text-jobrun-black dark:text-jobrun-grey-light">
            {value}
          </p>
        </div>
        <div className="flex-shrink-0 h-12 w-12 rounded-lg jobrun-gradient flex items-center justify-center text-white">
          {icon}
        </div>
      </div>
    </div>
  );
}
