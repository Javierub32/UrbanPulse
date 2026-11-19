import { createContext, useContext, type PropsWithChildren } from 'react';

import { useIncidents } from '@/pages/incidents/hooks/use-incidents';

type AdminIncidents = ReturnType<typeof useIncidents>;

const AdminIncidentsContext = createContext<AdminIncidents | null>(null);

export function AdminIncidentsProvider({ children }: PropsWithChildren) {
  const incidents = useIncidents();
  return <AdminIncidentsContext.Provider value={incidents}>{children}</AdminIncidentsContext.Provider>;
}

export function useAdminIncidents() {
  const incidents = useContext(AdminIncidentsContext);
  if (!incidents) throw new Error('El dashboard necesita AdminIncidentsProvider.');
  return incidents;
}
