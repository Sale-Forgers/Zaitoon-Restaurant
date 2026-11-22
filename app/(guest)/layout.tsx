import { Splash } from "@/components/brand";
import { GuestProvider } from "@/components/guest/GuestProvider";
import { GuestShell } from "@/components/guest/GuestShell";
import { ClientOnly, ToastProvider } from "@/components/ui";

// These screens load their data on the device, so they are exempt from the
// instant-navigation check (see next/dist/docs: route segment config "instant").
export const instant = false;

/**
 * The guest app (menu, order tracking, offers). It runs entirely on the
 * guest's phone after the first load, so the shell is a static splash.
 */
export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClientOnly fallback={<Splash />}>
      <ToastProvider>
        <GuestProvider>
          <GuestShell>{children}</GuestShell>
        </GuestProvider>
      </ToastProvider>
    </ClientOnly>
  );
}
