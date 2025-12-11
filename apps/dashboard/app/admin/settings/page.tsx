"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage admin settings and system configuration</p>
      </div>

      <div className="bg-white dark:bg-jobrun-grey-dark rounded-xl shadow-card p-6 border-l-4 border-jobrun-green">
        <h2 className="text-lg font-semibold text-jobrun-black dark:text-jobrun-grey-light mb-4 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-jobrun-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Admin Profile
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-jobrun-grey mb-1">Email</label>
            <input
              type="email"
              className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-jobrun-green focus:border-transparent transition-all bg-white dark:bg-gray-800 text-jobrun-black dark:text-jobrun-grey-light"
              defaultValue="admin@jobrun.com"
              disabled
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-jobrun-grey mb-1">Role</label>
            <Badge variant="success">Super Admin</Badge>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-jobrun-grey-dark rounded-xl shadow-card p-6 border-l-4 border-jobrun-green-light">
        <h2 className="text-lg font-semibold text-jobrun-black dark:text-jobrun-grey-light mb-4 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-jobrun-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          System Configuration
        </h2>
        <div className="space-y-4">
          <div className="p-4 bg-green-50 dark:bg-gray-800 rounded-lg border border-green-200 dark:border-gray-700">
            <label className="block text-sm font-medium text-jobrun-grey mb-1">Environment</label>
            <p className="text-sm text-jobrun-black dark:text-jobrun-grey-light font-medium">
              {process.env.NODE_ENV === "production" ? "Production" : "Development"}
            </p>
          </div>
          <div className="p-4 bg-green-50 dark:bg-gray-800 rounded-lg border border-green-200 dark:border-gray-700">
            <label className="block text-sm font-medium text-jobrun-grey mb-1">API URL</label>
            <p className="text-sm text-jobrun-black dark:text-jobrun-grey-light font-mono bg-white dark:bg-gray-900 px-3 py-2 rounded border border-green-200 dark:border-gray-700">
              {process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-jobrun-grey-dark rounded-xl shadow-card p-6 border-l-4 border-jobrun-green-dark">
        <h2 className="text-lg font-semibold text-jobrun-black dark:text-jobrun-grey-light mb-4 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-jobrun-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          API Keys
        </h2>
        <div className="space-y-4">
          <div className="p-4 bg-green-50 dark:bg-gray-800 rounded-lg border border-green-200 dark:border-gray-700">
            <label className="block text-sm font-medium text-jobrun-grey mb-1">Twilio Account SID</label>
            <p className="text-sm text-jobrun-black dark:text-jobrun-grey-light font-mono bg-white dark:bg-gray-900 px-3 py-2 rounded border border-green-200 dark:border-gray-700">
              AC••••••••••••••••••••••••••••••••
            </p>
          </div>
          <div className="p-4 bg-green-50 dark:bg-gray-800 rounded-lg border border-green-200 dark:border-gray-700">
            <label className="block text-sm font-medium text-jobrun-grey mb-1">OpenAI API Key</label>
            <p className="text-sm text-jobrun-black dark:text-jobrun-grey-light font-mono bg-white dark:bg-gray-900 px-3 py-2 rounded border border-green-200 dark:border-gray-700">
              sk-••••••••••••••••••••••••••••••••
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-jobrun-grey-dark rounded-xl shadow-card p-6">
        <h2 className="text-lg font-semibold text-jobrun-black dark:text-jobrun-grey-light mb-4 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-jobrun-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
          JobRun Theme Preview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-jobrun-green transition-all">
            <div className="h-16 w-16 mx-auto rounded-lg bg-jobrun-green mb-2 shadow-md"></div>
            <p className="text-xs text-jobrun-grey font-semibold">Green</p>
            <p className="text-xs text-jobrun-grey font-mono">#16A34A</p>
          </div>
          <div className="text-center p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-jobrun-green-dark transition-all">
            <div className="h-16 w-16 mx-auto rounded-lg bg-jobrun-green-dark mb-2 shadow-md"></div>
            <p className="text-xs text-jobrun-grey font-semibold">Green Dark</p>
            <p className="text-xs text-jobrun-grey font-mono">#15803D</p>
          </div>
          <div className="text-center p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-jobrun-green-light transition-all">
            <div className="h-16 w-16 mx-auto rounded-lg bg-jobrun-green-light mb-2 shadow-md"></div>
            <p className="text-xs text-jobrun-grey font-semibold">Green Light</p>
            <p className="text-xs text-jobrun-grey font-mono">#22C55E</p>
          </div>
          <div className="text-center p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-jobrun-black transition-all">
            <div className="h-16 w-16 mx-auto rounded-lg bg-jobrun-black mb-2 shadow-md"></div>
            <p className="text-xs text-jobrun-grey font-semibold">Black</p>
            <p className="text-xs text-jobrun-grey font-mono">#0A0A0A</p>
          </div>
          <div className="text-center p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-jobrun-grey-dark transition-all">
            <div className="h-16 w-16 mx-auto rounded-lg bg-jobrun-grey-dark mb-2 shadow-md"></div>
            <p className="text-xs text-jobrun-grey font-semibold">Grey Dark</p>
            <p className="text-xs text-jobrun-grey font-mono">#1A1A1A</p>
          </div>
          <div className="text-center p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-jobrun-grey transition-all">
            <div className="h-16 w-16 mx-auto rounded-lg bg-jobrun-grey mb-2 shadow-md"></div>
            <p className="text-xs text-jobrun-grey font-semibold">Grey</p>
            <p className="text-xs text-jobrun-grey font-mono">#A3A3A3</p>
          </div>
          <div className="text-center p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 transition-all">
            <div className="h-16 w-16 mx-auto rounded-lg bg-jobrun-grey-light border border-gray-300 mb-2 shadow-md"></div>
            <p className="text-xs text-jobrun-grey font-semibold">Grey Light</p>
            <p className="text-xs text-jobrun-grey font-mono">#F5F5F5</p>
          </div>
          <div className="text-center p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-jobrun-green transition-all">
            <div className="h-16 w-16 mx-auto rounded-lg jobrun-gradient mb-2 shadow-md"></div>
            <p className="text-xs text-jobrun-grey font-semibold">Gradient</p>
            <p className="text-xs text-jobrun-grey font-mono">Green</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="primary" size="lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Save Settings
        </Button>
      </div>
    </div>
  );
}
