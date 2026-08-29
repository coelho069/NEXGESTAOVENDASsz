"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_SITE } from "@/lib/cms/defaults";
import { loadSite, saveSite } from "@/lib/cms/persist";
import type { SiteContent } from "@/lib/cms/types";

const CmsContext = createContext<{
  content: SiteContent;
  ready: boolean;
  save: (next: SiteContent) => Promise<void>;
  patch: (partial: Partial<SiteContent>) => Promise<void>;
} | null>(null);

export function CmsProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<SiteContent>(DEFAULT_SITE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let live = true;
    loadSite().then((c) => {
      if (!live) return;
      setContent(c);
      setReady(true);
    });
    const on = (e: Event) => {
      const detail = (e as CustomEvent<SiteContent>).detail;
      if (detail) setContent(detail);
    };
    window.addEventListener("fg-cms", on);
    return () => {
      live = false;
      window.removeEventListener("fg-cms", on);
    };
  }, []);

  const save = useCallback(async (next: SiteContent) => {
    setContent(next);
    await saveSite(next);
  }, []);

  const patch = useCallback(
    async (partial: Partial<SiteContent>) => {
      const next = { ...content, ...partial };
      setContent(next);
      await saveSite(next);
    },
    [content]
  );

  return (
    <CmsContext.Provider value={{ content, ready, save, patch }}>{children}</CmsContext.Provider>
  );
}

export function useCms() {
  const ctx = useContext(CmsContext);
  if (!ctx) throw new Error("useCms must be used within CmsProvider");
  return ctx;
}
