import DashboardClient from "./DashboardClient";

export default function DashboardEntry() {
  // Use client-side rendering to handle custom login data
  // This allows localStorage checks to work properly
  return <DashboardClient />;
}
