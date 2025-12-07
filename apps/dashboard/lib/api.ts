// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// JOBRUN DASHBOARD API CLIENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type LeadState =
  | "NEW"
  | "POST_CALL"
  | "POST_CALL_REPLIED"
  | "CUSTOMER_REPLIED"
  | "QUALIFIED"
  | "BOOKED"
  | "CONVERTED"
  | "LOST";

export type LeadStatus = "NEW" | "CONTACTED" | "QUALIFIED" | "CONVERTED" | "LOST";

export type MessageDirection = "INBOUND" | "OUTBOUND" | "SYSTEM";

export type MessageType = "SMS" | "CALL" | "NOTE" | "EVENT";

export interface Client {
  id: string;
  createdAt: string;
  updatedAt: string;
  businessName: string;
  region: string;
  phoneNumber?: string;
  businessHours?: any;
  timezone: string;
  demoToolsVisible: boolean;
}

export interface Lead {
  id: string;
  createdAt: string;
  updatedAt: string;
  clientId: string;
  customerNumber: string;
  name?: string;
  email?: string;
  state: LeadState;
  status: LeadStatus;
  lastCallAt?: string;
  postCallSessionEnd?: string;
  postCallReplied: boolean;
  hasBooking: boolean;
  notes?: string;
}

export interface Message {
  id: string;
  createdAt: string;
  clientId: string;
  customerId?: string;
  conversationId?: string;
  direction: MessageDirection;
  type: MessageType;
  body: string;
  twilioSid?: string;
  metadata?: any;
}

export interface ClientSettings {
  id: string;
  clientId: string;
  businessName?: string;
  services?: string;
  availability?: string;
  pricing?: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  serviceArea?: string;
  theme?: any;
  agentSettings?: any;
  metadata?: any;
}

export interface AdminDashboardStats {
  totalClients: number;
  activeClients: number;
  totalLeads: number;
  leadsToday: number;
  totalMessages: number;
  messagesToday: number;
  conversionRate: number;
  leadStateDistribution: Record<LeadState, number>;
  recentActivity: {
    id: string;
    type: MessageDirection;
    clientName: string;
    preview: string;
    createdAt: string;
  }[];
  topClients: {
    id: string;
    businessName: string;
    region: string;
    leadCount: number;
    messageCount: number;
  }[];
}

export interface ClientDashboardStats {
  totalLeads: number;
  newLeadsToday: number;
  activeLeads: number;
  postCallLeads: number;
  totalMessages: number;
  messagesToday: number;
  conversionRate: number;
  leadStateDistribution: Record<LeadState, number>;
  recentLeads: {
    id: string;
    customerNumber: string;
    name?: string;
    state: LeadState;
    createdAt: string;
  }[];
  recentMessages: {
    id: string;
    direction: MessageDirection;
    type: MessageType;
    body: string;
    customerName?: string;
    createdAt: string;
  }[];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// API HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${response.status} - ${error}`);
  }

  return response.json();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADMIN API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  return fetchAPI<AdminDashboardStats>("/api/admin/dashboard/stats");
}

export async function getClients(params?: {
  limit?: number;
  offset?: number;
}): Promise<{ clients: Client[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.limit) query.set("limit", params.limit.toString());
  if (params?.offset) query.set("offset", params.offset.toString());

  return fetchAPI<{ clients: Client[]; total: number }>(
    `/api/admin/clients?${query}`
  );
}

export async function getClient(
  clientId: string
): Promise<{ client: Client }> {
  return fetchAPI<{ client: Client }>(`/api/admin/clients/${clientId}`);
}

export async function createClient(data: {
  businessName: string;
  region: string;
  phoneNumber?: string;
  timezone?: string;
  twilioSid?: string;
  twilioAuthToken?: string;
  twilioNumber?: string;
  postCallWindowMinutes?: number;
  welcomeMessage?: string;
  postCallMessage?: string;
  bookingUrl?: string;
}): Promise<{ client: Client }> {
  return fetchAPI<{ client: Client }>("/api/admin/clients", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getClientLeads(
  clientId: string,
  params?: {
    limit?: number;
    offset?: number;
    state?: LeadState;
    status?: LeadStatus;
  }
): Promise<{ leads: Lead[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.limit) query.set("limit", params.limit.toString());
  if (params?.offset) query.set("offset", params.offset.toString());
  if (params?.state) query.set("state", params.state);
  if (params?.status) query.set("status", params.status);

  return fetchAPI<{ leads: Lead[]; total: number }>(
    `/api/admin/clients/${clientId}/leads?${query}`
  );
}

export async function getClientMessages(
  clientId: string,
  params?: {
    limit?: number;
    offset?: number;
  }
): Promise<{ messages: Message[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.limit) query.set("limit", params.limit.toString());
  if (params?.offset) query.set("offset", params.offset.toString());

  return fetchAPI<{ messages: Message[]; total: number }>(
    `/api/admin/clients/${clientId}/messages?${query}`
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLIENT API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function getClientDashboardStats(
  clientId: string
): Promise<ClientDashboardStats> {
  return fetchAPI<ClientDashboardStats>(
    `/api/client/${clientId}/dashboard/stats`
  );
}

export async function getLeads(
  clientId: string,
  params?: {
    limit?: number;
    offset?: number;
    state?: LeadState;
    status?: LeadStatus;
    sort?: string;
  }
): Promise<{ leads: Lead[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.limit) query.set("limit", params.limit.toString());
  if (params?.offset) query.set("offset", params.offset.toString());
  if (params?.state) query.set("state", params.state);
  if (params?.status) query.set("status", params.status);
  if (params?.sort) query.set("sort", params.sort);

  return fetchAPI<{ leads: Lead[]; total: number }>(
    `/api/client/${clientId}/leads?${query}`
  );
}

export async function getLead(
  leadId: string,
  clientId: string
): Promise<{ lead: Lead }> {
  return fetchAPI<{ lead: Lead }>(`/api/client/${clientId}/leads/${leadId}`);
}

export async function getLeadMessages(
  leadId: string,
  clientId: string
): Promise<{ messages: Message[] }> {
  return fetchAPI<{ messages: Message[] }>(
    `/api/client/${clientId}/leads/${leadId}/messages`
  );
}

export async function updateLeadState(
  leadId: string,
  clientId: string,
  newState: LeadState,
  trigger: string
): Promise<{ lead: Lead }> {
  return fetchAPI<{ lead: Lead }>(
    `/api/client/${clientId}/leads/${leadId}/state`,
    {
      method: "PATCH",
      body: JSON.stringify({ newState, trigger }),
    }
  );
}

export async function getClientSettings(
  clientId: string
): Promise<{ settings: ClientSettings }> {
  return fetchAPI<{ settings: ClientSettings }>(
    `/api/client/${clientId}/settings`
  );
}

export async function updateClientSettings(
  clientId: string,
  settings: Partial<ClientSettings>
): Promise<{ settings: ClientSettings }> {
  return fetchAPI<{ settings: ClientSettings }>(
    `/api/client/${clientId}/settings`,
    {
      method: "PATCH",
      body: JSON.stringify(settings),
    }
  );
}
