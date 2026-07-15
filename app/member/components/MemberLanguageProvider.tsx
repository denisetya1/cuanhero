"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";

export type MemberLanguage = "en" | "id";

type MemberLanguageContextValue = {
  language: MemberLanguage;
  setLanguage: (language: MemberLanguage) => void;
};

const STORAGE_KEY = "cuanhero-member-language";
const LANGUAGE_CHANGE_EVENT = "cuanhero-member-language-change";

const MemberLanguageContext = createContext<MemberLanguageContextValue | null>(
  null,
);

export function MemberLanguageProvider({ children }: { children: ReactNode }) {
  const language = useSyncExternalStore<MemberLanguage>(
    (onStoreChange) => {
      window.addEventListener("storage", onStoreChange);
      window.addEventListener(LANGUAGE_CHANGE_EVENT, onStoreChange);

      return () => {
        window.removeEventListener("storage", onStoreChange);
        window.removeEventListener(LANGUAGE_CHANGE_EVENT, onStoreChange);
      };
    },
    () => {
      const storedLanguage = window.localStorage.getItem(STORAGE_KEY);
      return storedLanguage === "id" ? "id" : "en";
    },
    // English remains the member-area fallback until Indonesian UI copy is added.
    () => "en" as const,
  );

  const value = useMemo<MemberLanguageContextValue>(
    () => ({
      language,
      setLanguage: (nextLanguage) => {
        window.localStorage.setItem(STORAGE_KEY, nextLanguage);
        window.dispatchEvent(new Event(LANGUAGE_CHANGE_EVENT));
      },
    }),
    [language],
  );

  return (
    <MemberLanguageContext.Provider value={value}>
      {children}
    </MemberLanguageContext.Provider>
  );
}

export function useMemberLanguage() {
  const context = useContext(MemberLanguageContext);

  if (!context) {
    throw new Error(
      "useMemberLanguage must be used inside MemberLanguageProvider.",
    );
  }

  return context;
}
