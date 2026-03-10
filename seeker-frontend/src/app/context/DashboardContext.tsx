import React, { createContext, useContext, useState } from 'react';

interface DashboardContextType {
  actions: React.ReactNode | null;
  setActions: (actions: React.ReactNode | null) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [actions, setActions] = useState<React.ReactNode | null>(null);

  return (
    <DashboardContext.Provider value={{ actions, setActions }}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
