"use client";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Mail, Phone, Eye } from "lucide-react";
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
}

interface LeadRowProps {
  lead: Lead;
}

export default function LeadRow({ lead }: LeadRowProps) {
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
    if (!value) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="font-medium text-gray-900">{lead.name}</div>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1 text-sm">
            <Mail className="h-3 w-3 text-gray-400" />
            <span className="text-gray-600">{lead.email}</span>
          </div>
          {lead.phone && (
            <div className="flex items-center gap-1 text-sm">
              <Phone className="h-3 w-3 text-gray-400" />
              <span className="text-gray-600">{lead.phone}</span>
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <Badge variant={getStateBadgeVariant(lead.state)} size="sm">
          {lead.state}
        </Badge>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
        {lead.source || "-"}
      </td>
      <td className="px-6 py-4 whitespace-nowrap font-medium">
        {formatCurrency(lead.value)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
        {formatDate(lead.createdAt)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <Link href={`/client/leads/${lead.id}`}>
          <Button size="sm" variant="outline">
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
        </Link>
      </td>
    </tr>
  );
}
