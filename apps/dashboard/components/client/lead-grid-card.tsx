"use client";

import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Mail, Phone, Calendar, DollarSign, Eye } from "lucide-react";
import Link from "next/link";

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

interface LeadGridCardProps {
  lead: Lead;
}

export default function LeadGridCard({ lead }: LeadGridCardProps) {
  const getStateBadgeVariant = (state: string) => {
    const variants: Record<string, "default" | "success" | "warning" | "danger" | "info" | "secondary"> = {
      new: "info",
      contacted: "warning",
      qualified: "secondary",
      proposal: "warning",
      negotiation: "warning",
      won: "success",
      lost: "danger",
    };
    return variants[state.toLowerCase()] || "default";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatCurrency = (value?: number) => {
    if (!value) return null;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card hover className="h-full">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-gray-900 text-lg">{lead.name}</h3>
        <Badge variant={getStateBadgeVariant(lead.state)} size="sm">
          {lead.state}
        </Badge>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Mail className="h-4 w-4" />
          <span className="truncate">{lead.email}</span>
        </div>
        {lead.phone && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Phone className="h-4 w-4" />
            <span>{lead.phone}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="h-4 w-4" />
          <span>{formatDate(lead.createdAt)}</span>
        </div>
        {lead.value && (
          <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
            <DollarSign className="h-4 w-4" />
            <span>{formatCurrency(lead.value)}</span>
          </div>
        )}
      </div>

      {lead.source && (
        <div className="mb-4 p-2 bg-gray-50 rounded text-xs text-gray-600">
          Source: {lead.source}
        </div>
      )}

      {lead.notes && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{lead.notes}</p>
      )}

      <Link href={`/client/leads/${lead.id}`}>
        <Button variant="outline" fullWidth>
          <Eye className="h-4 w-4 mr-2" />
          View Details
        </Button>
      </Link>
    </Card>
  );
}
