import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface BrandingData {
  appName: string;
  logo?: string;
}

interface BrandingContextType {
  appName: string;
  logo?: string;
  setBranding: (appName: string, logo?: string | null) => Promise<{ success: boolean; error?: string }>;
  reloadBranding: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType>({
  appName: 'MessMate',
  logo: undefined,
  setBranding: async () => ({ success: true }),
  reloadBranding: async () => {},
});

export function getCachedBranding(): BrandingData {
  try {
    const savedName = localStorage.getItem('messmate_branding_app_name');
    const savedLogo = localStorage.getItem('messmate_branding_logo');
    return {
      appName: savedName && savedName.trim() ? savedName.trim() : 'MessMate',
      logo: savedLogo || undefined,
    };
  } catch {
    return { appName: 'MessMate' };
  }
}

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branding, setBrandingState] = useState<BrandingData>(() => getCachedBranding());

  // Update Document Title and Favicon whenever branding changes
  useEffect(() => {
    const title = branding.appName ? `${branding.appName} - Smart Mess Meal Management` : 'MessMate - Smart Mess Meal Management';
    document.title = title;

    // Update Favicon if custom logo is present
    if (branding.logo) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'shortcut icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.type = branding.logo.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
      link.href = branding.logo;
    }
  }, [branding.appName, branding.logo]);

  // Sync latest branding from server on mount
  const reloadBranding = useCallback(async () => {
    try {
      const res = await fetch('/api/mess/branding');
      const json = await res.json();
      if (json.success && json.data) {
        const serverName = json.data.appName?.trim() || 'MessMate';
        const serverLogo = json.data.logo || undefined;

        setBrandingState({ appName: serverName, logo: serverLogo });

        try {
          localStorage.setItem('messmate_branding_app_name', serverName);
          if (serverLogo) {
            localStorage.setItem('messmate_branding_logo', serverLogo);
          } else {
            localStorage.removeItem('messmate_branding_logo');
          }
        } catch {}
      }
    } catch (e) {
      // Fallback to cache if network fails
    }
  }, []);

  useEffect(() => {
    reloadBranding();
  }, [reloadBranding]);

  // Set new branding (saves to server and updates local state without page reload)
  const setBranding = useCallback(
    async (newAppName: string, newLogo?: string | null): Promise<{ success: boolean; error?: string }> => {
      const cleanName = (newAppName || '').trim() || 'MessMate';
      const token = localStorage.getItem('messmate_auth_token');

      try {
        const res = await fetch('/api/mess/admin/branding', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            appName: cleanName,
            logo: newLogo,
          }),
        });

        const json = await res.json();
        if (!res.ok || json.success === false) {
          return { success: false, error: json.error || 'লোগো বা অ্যাপের নাম সেভ করা যায়নি।' };
        }

        const savedData: BrandingData = {
          appName: json.data?.appName || cleanName,
          logo: json.data?.logo || undefined,
        };

        setBrandingState(savedData);

        try {
          localStorage.setItem('messmate_branding_app_name', savedData.appName);
          if (savedData.logo) {
            localStorage.setItem('messmate_branding_logo', savedData.logo);
          } else {
            localStorage.removeItem('messmate_branding_logo');
          }
        } catch {}

        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || 'সার্ভার যোগাযোগে ত্রুটি হয়েছে।' };
      }
    },
    []
  );

  return (
    <BrandingContext.Provider
      value={{
        appName: branding.appName,
        logo: branding.logo,
        setBranding,
        reloadBranding,
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
};

export function useBranding(): BrandingContextType {
  return useContext(BrandingContext);
}
