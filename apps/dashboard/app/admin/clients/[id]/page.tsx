import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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

async function getClient(id: string) {
  const response = await safeGet(`/api/admin/clients/${id}`, null);
  return response;
}

export default async function ClientDetailPage(props: any) {
  const { id } = await props.params;
  const clientData = await getClient(id);

  if (!clientData) {
    notFound();
  }

  const client = clientData.client || clientData;
  const customers = client.customers || [];
  const messages = client.messages || [];
  const totalLeads = client._count?.customers || customers.length || 0;
  const activeLeads = customers.filter((c: any) => !['LOST', 'CONVERTED'].includes(c.state)).length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <Link href="/admin/clients" className="text-jobrun-green hover:text-jobrun-green-dark flex items-center transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Clients
            </Link>
          </div>
          <h1 className="page-title">{client.businessName}</h1>
          <p className="page-subtitle">{client.timezone || 'No timezone set'} • {client.region}</p>
        </div>
        <div className="flex items-center space-x-3">
          <Link href={`/admin/clients/${id}/edit`}>
            <Button variant="outline">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Client
            </Button>
          </Link>
          <Link href={`/admin/clients/${id}/impersonate`}>
            <Button variant="secondary">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Impersonate Client
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-jobrun-grey-dark rounded-xl shadow-card p-6 border-l-4 border-jobrun-green hover:shadow-cardHover transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-jobrun-grey">Total Leads</p>
              <p className="text-3xl font-bold text-jobrun-black dark:text-jobrun-grey-light mt-2">{totalLeads}</p>
            </div>
            <div className="h-12 w-12 rounded-full jobrun-gradient flex items-center justify-center shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-jobrun-grey-dark rounded-xl shadow-card p-6 border-l-4 border-jobrun-green-light hover:shadow-cardHover transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-jobrun-grey">Active Leads</p>
              <p className="text-3xl font-bold text-jobrun-black dark:text-jobrun-grey-light mt-2">{activeLeads}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-jobrun-grey-dark rounded-xl shadow-card p-6 border-l-4 border-jobrun-green-dark hover:shadow-cardHover transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-jobrun-grey">Messages</p>
              <p className="text-3xl font-bold text-jobrun-black dark:text-jobrun-grey-light mt-2">{client._count?.messages || messages.length}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-jobrun-grey-dark rounded-xl shadow-card p-6">
        <h2 className="text-lg font-semibold text-jobrun-black dark:text-jobrun-grey-light mb-4 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-jobrun-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Client Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-green-50 dark:bg-gray-800 rounded-lg border border-green-200 dark:border-gray-700">
            <p className="text-xs text-jobrun-grey uppercase font-semibold mb-1">Business Name</p>
            <p className="text-sm text-jobrun-black dark:text-jobrun-grey-light font-medium">{client.businessName}</p>
          </div>
          <div className="p-4 bg-green-50 dark:bg-gray-800 rounded-lg border border-green-200 dark:border-gray-700">
            <p className="text-xs text-jobrun-grey uppercase font-semibold mb-1">Phone Number</p>
            <p className="text-sm text-jobrun-black dark:text-jobrun-grey-light font-medium">{client.phoneNumber || 'Not set'}</p>
          </div>
          <div className="p-4 bg-green-50 dark:bg-gray-800 rounded-lg border border-green-200 dark:border-gray-700">
            <p className="text-xs text-jobrun-grey uppercase font-semibold mb-1">Region</p>
            <p className="text-sm text-jobrun-black dark:text-jobrun-grey-light font-medium">{client.region}</p>
          </div>
          <div className="p-4 bg-green-50 dark:bg-gray-800 rounded-lg border border-green-200 dark:border-gray-700">
            <p className="text-xs text-jobrun-grey uppercase font-semibold mb-1">Twilio Number</p>
            <p className="text-sm text-jobrun-black dark:text-jobrun-grey-light font-medium">{client.twilioNumber || 'No Twilio Number Assigned'}</p>
          </div>
          <div className="p-4 bg-green-50 dark:bg-gray-800 rounded-lg border border-green-200 dark:border-gray-700">
            <p className="text-xs text-jobrun-grey uppercase font-semibold mb-1">Timezone</p>
            <p className="text-sm text-jobrun-black dark:text-jobrun-grey-light font-medium">{client.timezone || 'Not set'}</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-jobrun-grey-dark rounded-xl shadow-card overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-gray-800 dark:to-gray-700 border-b-2 border-jobrun-green">
          <h2 className="text-lg font-semibold text-jobrun-black dark:text-jobrun-grey-light flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-jobrun-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Customers
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-jobrun-grey-dark dark:text-jobrun-grey-light uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-jobrun-grey-dark dark:text-jobrun-grey-light uppercase">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-jobrun-grey-dark dark:text-jobrun-grey-light uppercase">State</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-jobrun-grey-dark dark:text-jobrun-grey-light uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-jobrun-grey">
                    No customers for this client yet.
                  </td>
                </tr>
              ) : (
                customers.map((customer: any) => (
                  <tr key={customer.id} className="hover:bg-green-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-6 py-4 text-sm text-jobrun-black dark:text-jobrun-grey-light font-medium">{customer.name || 'Unknown'}</td>
                    <td className="px-6 py-4 text-sm text-jobrun-black dark:text-jobrun-grey-light">{customer.phone}</td>
                    <td className="px-6 py-4">
                      <Badge variant="default" size="sm">{customer.state}</Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-jobrun-grey">
                      {new Date(customer.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white dark:bg-jobrun-grey-dark rounded-xl shadow-card overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-gray-800 dark:to-gray-700 border-b-2 border-jobrun-green">
          <h2 className="text-lg font-semibold text-jobrun-black dark:text-jobrun-grey-light flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-jobrun-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            Messages
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-jobrun-grey-dark dark:text-jobrun-grey-light uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-jobrun-grey-dark dark:text-jobrun-grey-light uppercase">Direction</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-jobrun-grey-dark dark:text-jobrun-grey-light uppercase">Preview</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-jobrun-grey-dark dark:text-jobrun-grey-light uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {messages.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-jobrun-grey">
                    No messages for this client yet.
                  </td>
                </tr>
              ) : (
                messages.slice(0, 10).map((msg: any) => (
                  <tr key={msg.id} className="hover:bg-green-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-6 py-4">
                      <Badge variant="secondary" size="sm">
                        {msg.type}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={msg.direction === 'INBOUND' ? 'success' : 'secondary'} size="sm">
                        {msg.direction}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-jobrun-grey truncate max-w-xs">
                      {msg.body?.substring(0, 60)}...
                    </td>
                    <td className="px-6 py-4 text-sm text-jobrun-grey">
                      {new Date(msg.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
