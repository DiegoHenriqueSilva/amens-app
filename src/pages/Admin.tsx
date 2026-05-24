import { Routes, Route } from "react-router-dom";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminPrayers from "@/components/admin/AdminPrayers";
import AdminReports from "@/components/admin/AdminReports";
import AdminChurches from "@/components/admin/AdminChurches";
import AdminLogs from "@/components/admin/AdminLogs";
import AdminFeedback from "@/components/admin/AdminFeedback";
import AdminSettings from "@/components/admin/AdminSettings";
import { AdminGuard } from "@/components/AdminGuard";

const Admin = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route index element={<AdminGuard requireAdmin><AdminDashboard /></AdminGuard>} />
          <Route path="users" element={<AdminGuard requireAdmin><AdminUsers /></AdminGuard>} />
          <Route path="prayers" element={<AdminGuard><AdminPrayers /></AdminGuard>} />
          <Route path="reports" element={<AdminGuard><AdminReports /></AdminGuard>} />
          <Route path="churches" element={<AdminGuard requireAdmin><AdminChurches /></AdminGuard>} />
          <Route path="feedback" element={<AdminGuard><AdminFeedback /></AdminGuard>} />
          <Route path="settings" element={<AdminGuard requireAdmin><AdminSettings /></AdminGuard>} />
          <Route path="logs" element={<AdminGuard requireAdmin><AdminLogs /></AdminGuard>} />
        </Routes>
      </main>
    </div>
  );
};

export default Admin;
