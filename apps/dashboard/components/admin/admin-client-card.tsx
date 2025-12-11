"use client";

import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Building2, Mail, Phone, Calendar, ExternalLink } from "lucide-react";
import Link from "next/link";

export interface Client {
  id: string;
  businessName: string;
  email: string;
  phone?: string;
  status: "active" | "inactive" | "trial";
  leadCount?: number;
  createdAt: string;
}

interface AdminClientCardProps {
  client: Client;
}

export default function AdminClientCard({ client }: AdminClientCardProps) {
  const statusVariants = {
    active: "success" as const,
    inactive: "secondary" as const,
    trial: "warning" as const,
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Card hover className="h-full">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Building2 className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{client.businessName}</h3>
            <Badge variant={statusVariants[client.status]} size="sm" className="mt-1">
              {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
            </Badge>
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Mail className="h-4 w-4" />
          <span>{client.email}</span>
        </div>
        {client.phone && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Phone className="h-4 w-4" />
            <span>{client.phone}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="h-4 w-4" />
          <span>Joined {formatDate(client.createdAt)}</span>
        </div>
      </div>

      {client.leadCount !== undefined && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Total Leads</p>
          <p className="text-2xl font-bold text-gray-900">{client.leadCount}</p>
        </div>
      )}

      <Link href={`/admin/clients/${client.id}`}>
        <Button variant="outline" fullWidth>
          <ExternalLink className="h-4 w-4 mr-2" />
          View Details
        </Button>
      </Link>
    </Card>
  );
}
