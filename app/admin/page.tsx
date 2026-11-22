import { Dashboard } from "@/components/admin/Dashboard";

// Admin pages render in the browser after the PIN check, so there is nothing
// for Next.js to prerender or validate for instant navigation.
export const instant = false;

export default function AdminDashboardPage() {
  return <Dashboard />;
}
