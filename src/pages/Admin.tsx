import { Routes, Route } from "react-router-dom";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminPrayers from "@/components/admin/AdminPrayers";
import AdminReports from "@/components/admin/AdminReports";
import AdminChurches from "@/components/admin/AdminChurches";
import AdminLogs from "@/components/admin/AdminLogs";
import AdminPrayerChain from "@/components/admin/AdminPrayerChain";
import { AdminGuard } from "@/components/AdminGuard";

const Admin = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="prayers" element={<AdminPrayers />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="churches" element={<AdminGuard requireAdmin><AdminChurches /></AdminGuard>} />
          <Route path="prayer-chain" element={<AdminPrayerChain />} />
          <Route path="logs" element={<AdminGuard requireAdmin><AdminLogs /></AdminGuard>} />
        </Routes>
      </main>
    </div>
  );
};

export default Admin;
