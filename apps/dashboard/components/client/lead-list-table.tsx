"use client";

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../ui/table";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Eye, Mail, Phone } from "lucide-react";
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

interface LeadListTableProps {
  leads: Lead[];
  onLeadClick?: (leadId: string) => void;
}

export default function LeadListTable({ leads, onLeadClick }: LeadListTableProps) {
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

  if (leads.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
        <p className="text-gray-500">No leads found</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>State</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.id}>
              <TableCell className="font-medium">{lead.name}</TableCell>
              <TableCell>
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
              </TableCell>
              <TableCell>
                <Badge variant={getStateBadgeVariant(lead.state)} size="sm">
                  {lead.state}
                </Badge>
              </TableCell>
              <TableCell className="text-gray-600">{lead.source || "-"}</TableCell>
              <TableCell className="font-medium">{formatCurrency(lead.value)}</TableCell>
              <TableCell className="text-gray-600">{formatDate(lead.createdAt)}</TableCell>
              <TableCell>
                <Link href={`/client/leads/${lead.id}`}>
                  <Button size="sm" variant="outline">
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
