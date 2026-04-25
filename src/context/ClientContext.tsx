import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import mqttService from '../services/mqttService';

interface ClientDetail {
  client_id: string;
  name: string;
  description: string;
  emoji: string;
  online: boolean;
}

interface ClientContextType {
  clients: ClientDetail[];
  refreshClients: () => void;
  updateClient: (clientId: string, details: Partial<ClientDetail>) => void;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export const ClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<ClientDetail[]>([]);

  const refreshClients = useCallback(() => {
    const storedClients = mqttService.getAllStoredClients();
    setClients(storedClients);
  }, []);

  const updateClient = useCallback((clientId: string, details: Partial<ClientDetail>) => {
    const existing = mqttService.getClientDetails(clientId);
    if (existing) {
      mqttService.storeClientDetails(clientId, {
        ...existing,
        ...details,
      });
    }
    refreshClients();
  }, [refreshClients]);

  useEffect(() => {
    refreshClients();
  }, [refreshClients]);

  return (
    <ClientContext.Provider value={{ clients, refreshClients, updateClient }}>
      {children}
    </ClientContext.Provider>
  );
};

export const useClients = (): ClientContextType => {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error('useClients must be used within a ClientProvider');
  }
  return context;
};

export const clientContextRef = {
  refreshClients: () => {},
  updateClient: (_clientId: string, _details: Partial<ClientDetail>) => {},
};

let globalRefreshClients: () => void = () => {};
let globalUpdateClient: (clientId: string, details: Partial<ClientDetail>) => void = () => {};

export const registerClientContext = (
  refresh: () => void,
  update: (clientId: string, details: Partial<ClientDetail>) => void
) => {
  globalRefreshClients = refresh;
  globalUpdateClient = update;
};

export const refreshClientList = () => {
  globalRefreshClients();
};

export const updateClientInfo = (clientId: string, details: Partial<ClientDetail>) => {
  globalUpdateClient(clientId, details);
};