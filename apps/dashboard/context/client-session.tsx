"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export interface ClientSession {
  clientId: string;
  businessName: string;
  timezone: string;
  twilioNumber: string | null;
  region: string;
  phoneNumber: string | null;
  isImpersonating: boolean;
}

interface ClientSessionContextType {
  session: ClientSession | null;
  setSession: (session: ClientSession | null) => void;
  clearSession: () => void;
}

const ClientSessionContext = createContext<ClientSessionContextType | undefined>(
  undefined
);

export function ClientSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ClientSession | null>(null);

  const clearSession = () => {
    setSession(null);
  };

  return (
    <ClientSessionContext.Provider value={{ session, setSession, clearSession }}>
      {children}
    </ClientSessionContext.Provider>
  );
}

export function useClientSession() {
  const context = useContext(ClientSessionContext);
  if (context === undefined) {
    throw new Error("useClientSession must be used within a ClientSessionProvider");
  }
  return context;
}
