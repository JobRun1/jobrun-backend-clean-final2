import { ImpersonateClient } from "@/components/impersonate/ImpersonateClient";
import Link from "next/link";
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

export default async function ImpersonateClientPage(props: any) {
  const { id } = await props.params;
  const clientData = await getClient(id);

  if (!clientData) {
    notFound();
  }

  const client = clientData.client || clientData;

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center space-x-3 mb-2">
          <Link
            href={`/admin/clients/${id}`}
            className="text-jobrun-green hover:text-jobrun-green-dark flex items-center transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Client
          </Link>
        </div>
        <h1 className="page-title">Impersonate Client</h1>
        <p className="page-subtitle">View the system as {client.businessName}</p>
      </div>

      <ImpersonateClient client={client} />
    </div>
  );
}
