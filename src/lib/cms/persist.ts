import { openDB } from "idb";
import { supabase, isCloudConfigured } from "@/lib/supabase";
import { DEFAULT_SITE } from "@/lib/cms/defaults";
import { CMS_KEY, type SiteContent } from "@/lib/cms/types";

const DB = "fluxogestao-cms-v1";

async function cmsDb() {
  return openDB(DB, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("content")) {
        db.createObjectStore("content");
      }
    },
  });
}

function merge(raw: Partial<SiteContent> | undefined): SiteContent {
  if (!raw) return DEFAULT_SITE;
  return {
    ...DEFAULT_SITE,
    ...raw,
    plans: raw.plans?.length ? raw.plans : DEFAULT_SITE.plans,
    testimonials: raw.testimonials?.length ? raw.testimonials : DEFAULT_SITE.testimonials,
  };
}

export async function loadSite(): Promise<SiteContent> {
  const db = await cmsDb();
  const local = (await db.get("content", CMS_KEY)) as SiteContent | undefined;
  if (isCloudConfigured() && supabase) {
    const { data } = await supabase.from("cms_content").select("value").eq("key", CMS_KEY).maybeSingle();
    if (data?.value) {
      const merged = merge(data.value as SiteContent);
      await db.put("content", merged, CMS_KEY);
      return merged;
    }
  }
  return merge(local);
}

export async function saveSite(next: SiteContent): Promise<SiteContent> {
  const db = await cmsDb();
  await db.put("content", next, CMS_KEY);
  if (isCloudConfigured() && supabase) {
    await supabase.from("cms_content").upsert({
      key: CMS_KEY,
      value: next,
      updated_at: new Date().toISOString(),
    });
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("fg-cms", { detail: next }));
  }
  return next;
}
