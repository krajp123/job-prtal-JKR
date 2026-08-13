import { createContext, useContext } from 'react';

const CandidateWorkspaceContext = createContext({ workspaceOpen: false });

export function CandidateWorkspaceProvider({ value, children }) {
    return <CandidateWorkspaceContext.Provider value={value}>{children}</CandidateWorkspaceContext.Provider>;
}

export function useCandidateWorkspace() {
    return useContext(CandidateWorkspaceContext);
}