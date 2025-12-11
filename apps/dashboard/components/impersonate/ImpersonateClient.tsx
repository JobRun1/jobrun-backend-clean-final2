"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Client {
  id: string;
  businessName: string;
  region: string;
  timezone: string;
  phoneNumber?: string;
  twilioNumber?: string;
}

export function ImpersonateClient({ client }: { client: Client }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImpersonate = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_BASE_URL}/api/admin/clients/${client.id}/impersonate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            adminId: "admin",
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to generate impersonation token");
      }

      const data = await response.json();
      const token = data.data?.token || data.token;

      if (!token) {
        throw new Error("No impersonation token received");
      }

      router.push(`/client?impersonate=${encodeURIComponent(token)}`);
    } catch (err: any) {
      console.error("Impersonation error:", err);
      setError(err.message || "Failed to impersonate client");
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-jobrun-grey-dark rounded-xl shadow-card p-8">
      <div className="max-w-2xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-jobrun-black dark:text-jobrun-grey-light mb-2">
            Impersonate {client.businessName}
          </h2>
          <p className="text-jobrun-grey">
            You are about to view the system as this client. This will give you access to their
            dashboard and all their data.
          </p>
        </div>

        <div className="bg-green-50 dark:bg-gray-800 border-2 border-jobrun-green rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-jobrun-black dark:text-jobrun-grey-light mb-4">
            Client Information
          </h3>
          <dl className="grid grid-cols-1 gap-4">
            <div>
              <dt className="text-sm font-medium text-jobrun-grey">Business Name</dt>
              <dd className="text-sm text-jobrun-black dark:text-jobrun-grey-light mt-1">
                {client.businessName}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-jobrun-grey">Region</dt>
              <dd className="text-sm text-jobrun-black dark:text-jobrun-grey-light mt-1">
                {client.region}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-jobrun-grey">Timezone</dt>
              <dd className="text-sm text-jobrun-black dark:text-jobrun-grey-light mt-1">
                {client.timezone}
              </dd>
            </div>
            {client.twilioNumber && (
              <div>
                <dt className="text-sm font-medium text-jobrun-grey">Twilio Number</dt>
                <dd className="text-sm text-jobrun-black dark:text-jobrun-grey-light mt-1">
                  {client.twilioNumber}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-red-600 dark:text-red-400 mr-2 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h4 className="text-sm font-semibold text-red-900 dark:text-red-200">Error</h4>
                <p className="text-sm text-red-800 dark:text-red-300 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-500 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-amber-600 dark:text-amber-400 mr-2 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Important
              </h4>
              <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                This session will expire after 15 minutes for security. All actions you take will
                be logged.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <Button
            onClick={handleImpersonate}
            disabled={loading}
            className="jobrun-gradient text-white hover:opacity-90 transition-opacity"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Starting Impersonation...
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                Start Impersonation
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
