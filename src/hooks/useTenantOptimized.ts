import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TenantData {
  id: string;
  slug: string;
  name: string;
  branding?: {
    accent_hue: number;
    accent_saturation: number;
    accent_lightness: number;
    radius_scale: number;
  } | null;
}

interface TenantResult {
  status: "idle" | "loading" | "ready" | "error";
  school: { id: string; slug: string; name: string } | null;
  schoolId: string | null;
  branding: TenantData["branding"];
  error: string | null;
  slug: string;
}

// Global cache for applied branding to avoid re-applying
const appliedBrandingCache = new Map<string, boolean>();

function applyBranding(schoolId: string, branding: TenantData["branding"]) {
  if (!branding || appliedBrandingCache.get(schoolId)) return;
  
  const root = document.documentElement;
  root.style.setProperty("--brand", `${branding.accent_hue} ${branding.accent_saturation}% ${branding.accent_lightness}%`);
  root.style.setProperty("--radius", `${0.85 * (branding.radius_scale || 1)}rem`);
  appliedBrandingCache.set(schoolId, true);
}

export function useTenantOptimized(schoolSlug: string | undefined): TenantResult {
  const normalizedSlug = useMemo(
    () => (schoolSlug ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/g, ""),
    [schoolSlug]
  );

  const { data, error, isLoading, isError } = useQuery({
    queryKey: ["tenant", normalizedSlug],
    queryFn: async (): Promise<TenantData | null> => {
      // Get school data
      const { data: schoolData, error: schoolError } = await supabase
        .rpc("get_school_public_by_slug", { _slug: normalizedSlug })
        .maybeSingle();

      if (schoolError) throw new Error(schoolError.message);
      if (!schoolData) return null;

      // Fetch branding in parallel - but don't block on it
      const { data: branding } = await supabase
        .from("school_branding")
        .select("accent_hue,accent_saturation,accent_lightness,radius_scale")
        .eq("school_id", schoolData.id)
        .maybeSingle();

      return {
        id: schoolData.id,
        slug: schoolData.slug,
        name: schoolData.name,
        branding: branding || null,
      };
    },
    enabled: !!normalizedSlug,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  // Apply branding when data is available
  if (data?.id && data.branding) {
    applyBranding(data.id, data.branding);
  }

  if (!normalizedSlug) {
    return { status: "idle", school: null, schoolId: null, branding: null, error: null, slug: "" };
  }

  if (isLoading) {
    return { status: "loading", school: null, schoolId: null, branding: null, error: null, slug: normalizedSlug };
  }

  if (isError || !data) {
    return { 
      status: "error", 
      school: null, 
      schoolId: null, 
      branding: null, 
      error: error?.message || "School not found.", 
      slug: normalizedSlug 
    };
  }

  return {
    status: "ready",
    school: { id: data.id, slug: data.slug, name: data.name },
    schoolId: data.id,
    branding: data.branding,
    error: null,
    slug: normalizedSlug,
  };
}
