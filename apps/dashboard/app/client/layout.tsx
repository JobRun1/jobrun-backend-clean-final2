"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useEffect, useState } from "react";

interface ClientSession {
  clientId: string;
  businessName: string;
  timezone: string;
  isImpersonating?: boolean;
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const [session, setSession] = useState<ClientSession | null>(null);

  useEffect(() => {
    const sessionData = searchParams.get("session");
    const clientId = searchParams.get("clientId");

    if (sessionData && clientId) {
      try {
        const parsedSession = JSON.parse(decodeURIComponent(sessionData));
        setSession(parsedSession);
      } catch (error) {
        console.error("Failed to parse session:", error);
      }
    } else if (clientId) {
      setSession({ clientId, businessName: "Client", timezone: "UTC" });
    }
  }, [searchParams]);

  const clientId = session?.clientId || searchParams.get("clientId");

  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-white dark:bg-jobrun-grey-dark shadow-lg border-r border-gray-200 dark:border-gray-700 p-6 flex flex-col">
        <div className="mb-8">
          <h1 className="text-2xl font-bold jobrun-gradient bg-clip-text text-transparent">
            JobRun
          </h1>
          <p className="text-xs text-jobrun-grey mt-1">
            {session?.isImpersonating ? "Impersonating" : "Client Dashboard"}
          </p>
          {session?.businessName && (
            <p className="text-xs font-semibold text-jobrun-green mt-1">
              {session.businessName}
            </p>
          )}
        </div>

        <nav className="space-y-2 flex-1">
          <Link
            href={`/client/dashboard${clientId ? `?clientId=${clientId}` : ""}`}
            className="flex items-center gap-2 p-3 rounded-lg hover:bg-green-50 dark:hover:bg-gray-700 hover:text-jobrun-green font-medium transition-all duration-200 text-jobrun-grey-dark dark:text-jobrun-grey-light"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Dashboard
          </Link>

          <Link
            href={`/client/leads${clientId ? `?clientId=${clientId}` : ""}`}
            className="flex items-center gap-2 p-3 rounded-lg hover:bg-green-50 dark:hover:bg-gray-700 hover:text-jobrun-green font-medium transition-all duration-200 text-jobrun-grey-dark dark:text-jobrun-grey-light"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            Leads
          </Link>

          <Link
            href={`/client/messages${clientId ? `?clientId=${clientId}` : ""}`}
            className="flex items-center gap-2 p-3 rounded-lg hover:bg-green-50 dark:hover:bg-gray-700 hover:text-jobrun-green font-medium transition-all duration-200 text-jobrun-grey-dark dark:text-jobrun-grey-light"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            Messages
          </Link>

          <button
            disabled
            className="flex items-center gap-2 w-full p-3 rounded-lg text-jobrun-grey cursor-not-allowed opacity-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            Calendar
          </button>

          <Link
            href={`/client/settings${clientId ? `?clientId=${clientId}` : ""}`}
            className="flex items-center gap-2 p-3 rounded-lg hover:bg-green-50 dark:hover:bg-gray-700 hover:text-jobrun-green font-medium transition-all duration-200 text-jobrun-grey-dark dark:text-jobrun-grey-light"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Settings
          </Link>
        </nav>

        {session?.isImpersonating && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <Link
              href="/admin/clients"
              className="block w-full p-3 rounded-lg bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-100 hover:bg-amber-200 dark:hover:bg-amber-800 font-medium transition-colors text-center text-sm"
            >
              Exit Impersonation
            </Link>
          </div>
        )}

        <div className="pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
          <p className="text-xs text-jobrun-grey">Version 1.0.0</p>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-jobrun-grey-light dark:bg-jobrun-black">
        <div className="p-10">
          <div className="flex justify-end mb-4">
            <ThemeToggle />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
