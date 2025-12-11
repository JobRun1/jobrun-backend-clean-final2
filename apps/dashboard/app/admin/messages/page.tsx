import { Badge } from "@/components/ui/badge";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type MessageType = {
  id: string;
  direction: string;
  type: string;
  body: string;
  createdAt: string;
  clientName: string;
  clientRegion: string;
  customerName: string;
  customerPhone: string;
  twilioSid?: string;
};

async function safeGet(url: string, fallback: any) {
  try {
    const res = await fetch(`${API_BASE_URL}${url}`, { cache: "no-store" });
    if (!res.ok) return fallback;
    const response = await res.json();
    return response?.data ?? response ?? fallback;
  } catch {
    return fallback;
  }
}

async function getMessages() {
  const response = await safeGet("/api/admin/messages?limit=100", { messages: [], total: 0 });
  return response;
}

export default async function AdminMessagesPage() {
  const data = await getMessages();
  const messages: MessageType[] = Array.isArray(data.messages) ? data.messages : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Messages</h1>
        <p className="page-subtitle">View all system messages across clients</p>
      </div>

      <div className="bg-white dark:bg-jobrun-grey-dark rounded-xl shadow-card overflow-hidden">
        {messages.length === 0 ? (
          <div className="text-jobrun-grey py-10 text-center">
            No messages available
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {messages.map((msg) => (
              <div key={msg.id} className="p-6 hover:bg-green-50 dark:hover:bg-gray-800 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center shadow-md ${
                        msg.direction === "INBOUND"
                          ? "jobrun-gradient"
                          : "bg-gradient-to-br from-gray-400 to-gray-600"
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-jobrun-black dark:text-jobrun-grey-light">
                        {msg.clientName || "Unknown Client"}
                      </p>
                      <p className="text-xs text-jobrun-grey">
                        {msg.customerName || msg.customerPhone || "Unknown Customer"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant={msg.type === "SMS" ? "default" : "secondary"} size="sm">
                      {msg.type}
                    </Badge>
                    <Badge variant={msg.direction === "INBOUND" ? "success" : "secondary"}>
                      {msg.direction}
                    </Badge>
                    <p className="text-xs text-jobrun-grey">
                      {new Date(msg.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="ml-13">
                  <p className="text-sm text-jobrun-black dark:text-jobrun-grey-light bg-green-50 dark:bg-gray-800 p-3 rounded-lg border border-green-200 dark:border-gray-700">
                    {msg.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
