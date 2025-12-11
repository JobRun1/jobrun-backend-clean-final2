import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

async function getClients() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/clients`, {
      cache: "no-store",
    });

    if (!res.ok) return [];

    const response = await res.json();

    // Handle wrapped API response { success: true, data: { clients: [...] } }
    if (response && response.success && response.data) {
      const data = response.data;
      if (Array.isArray(data.clients)) return data.clients;
      if (Array.isArray(data)) return data;
    }

    // Handle direct response
    if (Array.isArray(response)) return response;
    if (Array.isArray(response.clients)) return response.clients;
    if (response.data && Array.isArray(response.data.clients)) return response.data.clients;

    return [];
  } catch {
    return [];
  }
}

export default async function AdminClientsPage() {
  const clients = await getClients();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-subtitle">Manage all client accounts and subscriptions</p>
        </div>
        <Link href="/admin/clients/new">
          <Button variant="primary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Client
          </Button>
        </Link>
      </div>

      <div className="bg-white dark:bg-jobrun-grey-dark rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-green-50 to-green-100 dark:from-gray-800 dark:to-gray-700 border-b-2 border-jobrun-green">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-jobrun-grey-dark dark:text-jobrun-grey-light uppercase tracking-wider">
                  Business Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-jobrun-grey-dark dark:text-jobrun-grey-light uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-jobrun-grey-dark dark:text-jobrun-grey-light uppercase tracking-wider">
                  Twilio Number
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-jobrun-grey-dark dark:text-jobrun-grey-light uppercase tracking-wider">
                  Region
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-jobrun-grey-dark dark:text-jobrun-grey-light uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-jobrun-grey-dark dark:text-jobrun-grey-light uppercase tracking-wider">
                  Leads
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-jobrun-grey-dark dark:text-jobrun-grey-light uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {Array.isArray(clients) && clients.length > 0 ? (
                clients.map((client: any) => (
                  <tr key={client.id} className="hover:bg-green-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full jobrun-gradient flex items-center justify-center text-white font-bold mr-3 shadow-md">
                          {client.businessName?.[0]?.toUpperCase() || 'C'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-jobrun-black dark:text-jobrun-grey-light">{client.businessName}</p>
                          <p className="text-xs text-jobrun-grey">{client.timezone || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-jobrun-black dark:text-jobrun-grey-light">{client.phoneNumber || 'No contact'}</p>
                      <p className="text-xs text-jobrun-grey">{client.phoneNumber ? 'Phone' : 'Not set'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-jobrun-black dark:text-jobrun-grey-light">{client.twilioNumber || 'Not assigned'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-jobrun-black dark:text-jobrun-grey-light">{client.region}</p>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={client._count?.messages > 0 ? "success" : "secondary"}>
                        {client._count?.messages > 0 ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <span className="text-sm font-semibold text-jobrun-green">{client._count?.customers || 0}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 text-jobrun-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/admin/clients/${client.id}`}>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-jobrun-grey">
                    No clients found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
