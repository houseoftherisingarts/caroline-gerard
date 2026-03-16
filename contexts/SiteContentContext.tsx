import React, { createContext, useContext, useState } from 'react';

export type SiteContent = Record<string, string>;

interface SiteContentContextValue {
  content: SiteContent;
  mediaLibrary: string[];
  isEditMode: boolean;
  pendingChanges: SiteContent;
  updateContent: (key: string, value: string) => void;
  enterEditMode: () => void;
  exitEditMode: () => void;
  saveChanges: () => Promise<void>;
}

const SiteContentContext = createContext<SiteContentContextValue>({
  content: {},
  mediaLibrary: [],
  isEditMode: false,
  pendingChanges: {},
  updateContent: () => {},
  enterEditMode: () => {},
  exitEditMode: () => {},
  saveChanges: async () => {},
});

export const useSiteContent = () => useContext(SiteContentContext);

export const SiteContentProvider = ({
  children,
  content,
  mediaLibrary,
  onSave,
}: {
  children: React.ReactNode;
  content: SiteContent;
  mediaLibrary: string[];
  onSave: (content: SiteContent) => Promise<void>;
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<SiteContent>({});

  const updateContent = (key: string, value: string) =>
    setPendingChanges(prev => ({ ...prev, [key]: value }));

  const enterEditMode = () => setIsEditMode(true);

  const exitEditMode = () => {
    setIsEditMode(false);
    setPendingChanges({});
  };

  const saveChanges = async () => {
    await onSave({ ...content, ...pendingChanges });
    setPendingChanges({});
  };

  const mergedContent = { ...content, ...pendingChanges };

  return (
    <SiteContentContext.Provider
      value={{ content: mergedContent, mediaLibrary, isEditMode, pendingChanges, updateContent, enterEditMode, exitEditMode, saveChanges }}
    >
      {children}
    </SiteContentContext.Provider>
  );
};
