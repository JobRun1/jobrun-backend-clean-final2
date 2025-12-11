"use client";

import LeadGridCard from "./lead-grid-card";

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  state: string;
  source?: string;
  createdAt: string;
  value?: number;
  notes?: string;
}

interface LeadListGridProps {
  leads: Lead[];
}

export default function LeadListGrid({ leads }: LeadListGridProps) {
  if (leads.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
        <p className="text-gray-500">No leads found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {leads.map((lead) => (
        <LeadGridCard key={lead.id} lead={lead} />
      ))}
    </div>
  );
}
