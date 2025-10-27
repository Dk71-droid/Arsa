import { useContext } from 'react';
import { AppContext, AppContextType } from '../contexts/AppContext';

export const useAppData = (): AppContextType => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppData must be used within an AppProvider');
    }
    return context;
};
