import { createContext, useContext } from 'react';

export const DrawerControls = createContext<{ toggle: () => void } | null>(null);
export const useAppDrawer = () => useContext(DrawerControls);
