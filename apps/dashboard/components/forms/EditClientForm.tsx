"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface EditClientFormProps {
  client: {
    id: string;
    businessName: string;
    phoneNumber: string | null;
    twilioNumber: string | null;
    region: string;
    timezone: string;
  };
}

export function EditClientForm({ client }: EditClientFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    businessName: client.businessName || "",
    phoneNumber: client.phoneNumber || "",
    twilioNumber: client.twilioNumber || "",
    region: client.region || "",
    timezone: client.timezone || "America/New_York",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validate
    if (!formData.businessName.trim()) {
      setError("Business name is required");
      setIsLoading(false);
      return;
    }

    if (!formData.timezone.trim()) {
      setError("Timezone is required");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/clients/${client.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessName: formData.businessName.trim(),
            phoneNumber: formData.phoneNumber.trim() || null,
            twilioNumber: formData.twilioNumber.trim() || null,
            region: formData.region.trim() || null,
            timezone: formData.timezone.trim(),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to update client");
      }

      setSuccess(true);

      // Show success briefly, then redirect
      setTimeout(() => {
        router.push(`/admin/clients/${client.id}`);
        router.refresh();
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Failed to update client");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-200 flex items-center">
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
                d="M5 13l4 4L19 7"
              />
            </svg>
            Client updated successfully! Redirecting...
          </p>
        </div>
      )}

      <div>
        <label
          htmlFor="businessName"
          className="block text-sm font-medium text-jobrun-grey-dark dark:text-jobrun-grey-light mb-2"
        >
          Business Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="businessName"
          name="businessName"
          value={formData.businessName}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-jobrun-green focus:border-transparent transition-all bg-white dark:bg-gray-800 text-jobrun-black dark:text-jobrun-grey-light"
          placeholder="Enter business name"
          disabled={isLoading || success}
        />
      </div>

      <div>
        <label
          htmlFor="phoneNumber"
          className="block text-sm font-medium text-jobrun-grey-dark dark:text-jobrun-grey-light mb-2"
        >
          Phone Number
        </label>
        <input
          type="tel"
          id="phoneNumber"
          name="phoneNumber"
          value={formData.phoneNumber}
          onChange={handleChange}
          className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-jobrun-green focus:border-transparent transition-all bg-white dark:bg-gray-800 text-jobrun-black dark:text-jobrun-grey-light"
          placeholder="Enter phone number"
          disabled={isLoading || success}
        />
      </div>

      <div>
        <label
          htmlFor="twilioNumber"
          className="block text-sm font-medium text-jobrun-grey-dark dark:text-jobrun-grey-light mb-2"
        >
          Twilio Number
        </label>
        <input
          type="tel"
          id="twilioNumber"
          name="twilioNumber"
          value={formData.twilioNumber}
          onChange={handleChange}
          className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-jobrun-green focus:border-transparent transition-all bg-white dark:bg-gray-800 text-jobrun-black dark:text-jobrun-grey-light"
          placeholder="Enter Twilio number"
          disabled={isLoading || success}
        />
      </div>

      <div>
        <label
          htmlFor="region"
          className="block text-sm font-medium text-jobrun-grey-dark dark:text-jobrun-grey-light mb-2"
        >
          Region
        </label>
        <input
          type="text"
          id="region"
          name="region"
          value={formData.region}
          onChange={handleChange}
          className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-jobrun-green focus:border-transparent transition-all bg-white dark:bg-gray-800 text-jobrun-black dark:text-jobrun-grey-light"
          placeholder="Enter region"
          disabled={isLoading || success}
        />
      </div>

      <div>
        <label
          htmlFor="timezone"
          className="block text-sm font-medium text-jobrun-grey-dark dark:text-jobrun-grey-light mb-2"
        >
          Timezone <span className="text-red-500">*</span>
        </label>
        <select
          id="timezone"
          name="timezone"
          value={formData.timezone}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-jobrun-green focus:border-transparent transition-all bg-white dark:bg-gray-800 text-jobrun-black dark:text-jobrun-grey-light"
          disabled={isLoading || success}
        >
          <option value="America/New_York">America/New_York (EST/EDT)</option>
          <option value="America/Chicago">America/Chicago (CST/CDT)</option>
          <option value="America/Denver">America/Denver (MST/MDT)</option>
          <option value="America/Phoenix">America/Phoenix (MST - No DST)</option>
          <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
          <option value="America/Anchorage">America/Anchorage (AKST/AKDT)</option>
          <option value="Pacific/Honolulu">Pacific/Honolulu (HST)</option>
        </select>
      </div>

      <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Link href={`/admin/clients/${client.id}`}>
          <Button variant="outline" type="button" disabled={isLoading || success}>
            Cancel
          </Button>
        </Link>
        <Button variant="primary" type="submit" disabled={isLoading || success}>
          {isLoading ? (
            <>
              <svg
                className="animate-spin h-5 w-5 mr-2"
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
              Saving...
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Save Changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
