import { Routes, Route, Navigate } from "react-router-dom";
import { AdminMobileHeader, AdminSidebar } from "@/components/admin/AdminSidebar";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminPrayers from "@/components/admin/AdminPrayers";
import AdminReports from "@/components/admin/AdminReports";
import AdminChurches from "@/components/admin/AdminChurches";
import AdminLogs from "@/components/admin/AdminLogs";
import AdminFeedback from "@/components/admin/AdminFeedback";
import AdminSettings from "@/components/admin/AdminSettings";
import AdminDonations from "@/components/admin/AdminDonations";
import { AdminGuard } from "@/components/AdminGuard";

// requireAdmin aqui deve bater com adminOnly em ADMIN_NAV_ITEMS (AdminSidebar).
const Admin = () => {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      <AdminSidebar />
      <AdminMobileHeader />
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <Routes>
          <Route index element={<AdminGuard requireAdmin><AdminDashboard /></AdminGuard>} />
          <Route path="users" element={<AdminGuard requireAdmin><AdminUsers /></AdminGuard>} />
          <Route path="donations" element={<AdminGuard requireAdmin><AdminDonations /></AdminGuard>} />
          <Route path="prayers" element={<AdminGuard><AdminPrayers /></AdminGuard>} />
          <Route path="reports" element={<AdminGuard><AdminReports /></AdminGuard>} />
          <Route path="churches" element={<AdminGuard requireAdmin><AdminChurches /></AdminGuard>} />
          <Route path="feedback" element={<AdminGuard><AdminFeedback /></AdminGuard>} />
          <Route path="settings" element={<AdminGuard requireAdmin><AdminSettings /></AdminGuard>} />
          <Route path="logs" element={<AdminGuard requireAdmin><AdminLogs /></AdminGuard>} />
          {/* Sub-rota inexistente: evita tela vazia. Moderador é reencaminhado pelo guard. */}
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default Admin;
