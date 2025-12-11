import { redirect } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface SearchParams {
  impersonate?: string;
}

export default async function ClientEntryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const impersonateToken = params.impersonate;

  if (!impersonateToken) {
    redirect("/sign-in");
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/impersonate/validate?token=${encodeURIComponent(impersonateToken)}`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      redirect("/admin?error=impersonation_failed");
    }

    const data = await response.json();
    const validatedData = data.data || data;

    if (!validatedData.success && !validatedData.clientId) {
      redirect("/admin?error=impersonation_failed");
    }

    const clientId = validatedData.clientId;
    const client = validatedData.client;

    redirect(
      `/client/dashboard?clientId=${clientId}&session=${encodeURIComponent(
        JSON.stringify({
          clientId: client.id,
          businessName: client.businessName,
          timezone: client.timezone,
          twilioNumber: client.twilioNumber,
          region: client.region,
          phoneNumber: client.phoneNumber,
          isImpersonating: true,
        })
      )}`
    );
  } catch (error) {
    console.error("Impersonation validation error:", error);
    redirect("/admin?error=impersonation_failed");
  }
}
