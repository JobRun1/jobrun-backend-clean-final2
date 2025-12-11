import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export const metadata: Metadata = {
  title: "JobRun Dashboard",
  description: "JobRun admin control panel",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-jobrun-grey-light dark:bg-jobrun-black text-jobrun-black dark:text-jobrun-grey-light">
        <div className="flex h-screen">

          {/* Sidebar */}
          <aside className="w-64 bg-white dark:bg-jobrun-grey-dark shadow-lg border-r border-gray-200 dark:border-gray-700 p-6 flex flex-col">
            <div className="mb-8">
              <h1 className="text-2xl font-bold jobrun-gradient bg-clip-text text-transparent">JobRun</h1>
              <p className="text-xs text-jobrun-grey mt-1">Admin Dashboard</p>
            </div>

            <nav className="space-y-2 flex-1">
              <Link
                href="/admin"
                className="block p-3 rounded-lg hover:bg-green-50 dark:hover:bg-gray-700 hover:text-jobrun-green font-medium transition-all duration-200 text-jobrun-grey-dark dark:text-jobrun-grey-light"
              >
                📊 Dashboard
              </Link>
              <Link
                href="/admin/clients"
                className="block p-3 rounded-lg hover:bg-green-50 dark:hover:bg-gray-700 hover:text-jobrun-green font-medium transition-all duration-200 text-jobrun-grey-dark dark:text-jobrun-grey-light"
              >
                👥 Clients
              </Link>
              <Link
                href="/admin/messages"
                className="block p-3 rounded-lg hover:bg-green-50 dark:hover:bg-gray-700 hover:text-jobrun-green font-medium transition-all duration-200 text-jobrun-grey-dark dark:text-jobrun-grey-light"
              >
                💬 Messages
              </Link>
              <Link
                href="/admin/settings"
                className="block p-3 rounded-lg hover:bg-green-50 dark:hover:bg-gray-700 hover:text-jobrun-green font-medium transition-all duration-200 text-jobrun-grey-dark dark:text-jobrun-grey-light"
              >
                ⚙️ Settings
              </Link>
            </nav>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-jobrun-grey">Version 1.0.0</p>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto bg-jobrun-grey-light dark:bg-jobrun-black">
            <div className="p-10">
              <div className="flex justify-end mb-4">
                <ThemeToggle />
              </div>
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
