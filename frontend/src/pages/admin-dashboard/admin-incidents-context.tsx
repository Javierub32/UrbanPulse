import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from 'react';

const AdminIncidentsContext = createContext<{ revision: number; retry: () => void } | null>(null);

export function AdminIncidentsProvider({ children }: PropsWithChildren) {
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision((current) => current + 1), []);
  const value = useMemo(() => ({ revision, retry }), [revision, retry]);
  return <AdminIncidentsContext.Provider value={value}>{children}</AdminIncidentsContext.Provider>;
}

export function useAdminIncidents() {
  const incidents = useContext(AdminIncidentsContext);
  if (!incidents) throw new Error('El dashboard necesita AdminIncidentsProvider.');
  return incidents;
}
