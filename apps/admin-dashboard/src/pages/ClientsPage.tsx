import { useState, useEffect } from 'react';
import { apiGet, apiPatch, ApiError } from '../api/client';

interface Client {
  id: string;
  businessName: string;
  onboardingComplete: boolean;
  opsAlertsMuted: boolean;
  paymentActive: boolean;
  stuckDetectedAt?: string | null;
}

interface ClientsResponse {
  clients: Client[];
}

interface ClientUpdateResponse {
  client: Client;
}

function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingClientId, setUpdatingClientId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ clientId: string; message: string } | null>(null);

  useEffect(() => {
    async function fetchClients() {
      try {
        setLoading(true);
        setError(null);
        const data = await apiGet<ClientsResponse>('/clients');
        setClients(data.clients);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(`Error ${err.statusCode}: ${err.message}`);
        } else {
          setError('Unknown error occurred');
        }
      } finally {
        setLoading(false);
      }
    }

    fetchClients();
  }, []);

  async function handleMuteToggle(client: Client) {
    const newMutedState = !client.opsAlertsMuted;
    setUpdatingClientId(client.id);
    setActionError(null);

    // Optimistic update
    setClients(prev =>
      prev.map(c =>
        c.id === client.id
          ? { ...c, opsAlertsMuted: newMutedState }
          : c
      )
    );

    try {
      await apiPatch<ClientUpdateResponse>(
        `/clients/${client.id}/mute-alerts`,
        { muted: newMutedState }
      );
    } catch (err) {
      // Revert on error
      setClients(prev =>
        prev.map(c =>
          c.id === client.id
            ? { ...c, opsAlertsMuted: !newMutedState }
            : c
        )
      );

      if (err instanceof ApiError) {
        setActionError({
          clientId: client.id,
          message: `Failed to ${newMutedState ? 'mute' : 'unmute'} alerts: ${err.message}`
        });
      } else {
        setActionError({
          clientId: client.id,
          message: `Failed to ${newMutedState ? 'mute' : 'unmute'} alerts: Unknown error`
        });
      }
    } finally {
      setUpdatingClientId(null);
    }
  }

  function getStatusBadges(client: Client) {
    const badges = [];

    // Status: ACTIVE or INACTIVE
    if (client.onboardingComplete) {
      badges.push(
        <span
          key="active"
          style={{
            display: 'inline-block',
            padding: '4px 8px',
            background: '#d4edda',
            color: '#155724',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
            marginRight: '6px'
          }}
        >
          🟢 ACTIVE
        </span>
      );
    } else {
      badges.push(
        <span
          key="inactive"
          style={{
            display: 'inline-block',
            padding: '4px 8px',
            background: '#f8f9fa',
            color: '#6c757d',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
            marginRight: '6px'
          }}
        >
          ⚪ INACTIVE
        </span>
      );
    }

    // STUCK badge
    if (client.stuckDetectedAt) {
      badges.push(
        <span
          key="stuck"
          style={{
            display: 'inline-block',
            padding: '4px 8px',
            background: '#f8d7da',
            color: '#721c24',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
            marginRight: '6px'
          }}
        >
          🔴 STUCK
        </span>
      );
    }

    // ALERTS MUTED badge
    if (client.opsAlertsMuted) {
      badges.push(
        <span
          key="muted"
          style={{
            display: 'inline-block',
            padding: '4px 8px',
            background: '#fff3cd',
            color: '#856404',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
            marginRight: '6px'
          }}
        >
          🔕 ALERTS MUTED
        </span>
      );
    }

    return badges;
  }

  return (
    <div style={{ padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h1 style={{ marginBottom: '24px' }}>Clients</h1>

      {loading && <p>Loading clients...</p>}

      {error && (
        <div style={{
          padding: '16px',
          background: '#fee',
          border: '1px solid #c00',
          borderRadius: '4px',
          color: '#c00',
          marginBottom: '16px'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <p style={{ marginBottom: '16px', color: '#666' }}>
            {clients.length} client{clients.length !== 1 ? 's' : ''}
          </p>

          {clients.length === 0 ? (
            <p style={{ color: '#666' }}>No clients found.</p>
          ) : (
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              border: '1px solid #ddd'
            }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Business Name</th>
                  <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Client ID</th>
                  <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id}>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                      {client.businessName}
                    </td>
                    <td style={{
                      padding: '12px',
                      border: '1px solid #ddd',
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      color: '#666'
                    }}>
                      {client.id}
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                      {getStatusBadges(client)}
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                      <button
                        onClick={() => handleMuteToggle(client)}
                        disabled={updatingClientId === client.id}
                        style={{
                          padding: '8px 16px',
                          background: client.opsAlertsMuted ? '#28a745' : '#ffc107',
                          color: client.opsAlertsMuted ? 'white' : '#000',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: updatingClientId === client.id ? 'not-allowed' : 'pointer',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          opacity: updatingClientId === client.id ? 0.6 : 1
                        }}
                      >
                        {updatingClientId === client.id
                          ? 'Updating...'
                          : client.opsAlertsMuted
                          ? 'Unmute Alerts'
                          : 'Mute Alerts'}
                      </button>
                      {actionError && actionError.clientId === client.id && (
                        <div style={{
                          marginTop: '8px',
                          padding: '8px',
                          background: '#fee',
                          border: '1px solid #c00',
                          borderRadius: '4px',
                          color: '#c00',
                          fontSize: '12px'
                        }}>
                          {actionError.message}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}

export default ClientsPage;
