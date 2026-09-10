import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
import { AuthProvider, useAuth } from "@/src/context/AuthContext";
import { supabase } from "@/src/lib/supabase";
import { Navbar } from "@/src/components/layout/Navbar";
import { Footer } from "@/src/components/layout/Footer";
import { LandingPage } from "@/src/pages/LandingPage";
import { LoginPage } from "@/src/pages/LoginPage";
import { RegisterPage } from "@/src/pages/RegisterPage";
import { ConsumerDashboard } from "@/src/pages/ConsumerDashboard";
import { AdminDashboard } from "@/src/pages/AdminDashboard";
import { ProfilePage } from "@/src/pages/ProfilePage";
import { TicketDetails } from "@/src/pages/TicketDetails";
import { AboutPage } from "@/src/pages/AboutPage";
import { ServicesPage } from "@/src/pages/ServicesPage";
import { ReconnectionServicePage } from "@/src/pages/ReconnectionServicePage";
import { BillingDisputeServicePage } from "@/src/pages/BillingDisputeServicePage";
import { OtherBillingServicePage } from "@/src/pages/OtherBillingServicePage";
import { ContactPage } from "@/src/pages/ContactPage";
import { BarangaysPage } from "@/src/pages/63barangay";
import { BarangayTicketsPage } from "@/src/pages/BarangayTicketsPage";
import { Toaster } from "@/components/ui/sonner";
import { NotificationListener } from "@/src/components/NotificationListener";
import { GoogleOnboardingModal } from "@/src/components/GoogleOnboardingModal";
import { AnnouncementMarquee } from "@/src/components/AnnouncementMarquee";

const ProtectedRoute = ({ children, adminOnly }) => {
  const { user, loading, isAdmin } = useAuth();
  const [sessionChecking, setSessionChecking] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const verifySession = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        if (!token) {
          if (isMounted) {
            setHasValidSession(false);
            setSessionChecking(false);
          }
          return;
        }

        // Verify active session with supabase.auth.getSession()
        const { data: { session } } = await supabase.auth.getSession();
        if (session || token === "mock_admin_token" || (token && user)) {
          if (isMounted) setHasValidSession(true);
        } else {
          if (isMounted) setHasValidSession(false);
        }
      } catch (err) {
        console.warn("Session verification error:", err);
        const token = localStorage.getItem("auth_token");
        if (token && user) {
          if (isMounted) setHasValidSession(true);
        } else {
          if (isMounted) setHasValidSession(false);
        }
      } finally {
        if (isMounted) setSessionChecking(false);
      }
    };

    if (!loading) {
      verifySession();
    }
  }, [loading, user]);

  if (loading || sessionChecking) {
    return (
      <div className="flex min-h-[calc(100vh-140px)] items-center justify-center bg-[#F8F6F2]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!hasValidSession || !user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
export default function App() {
  return <AuthProvider>
      <Router>
        <div className="flex flex-col min-h-screen bg-[#F8F6F2]">
          <Navbar />
          <NotificationListener />
          <GoogleOnboardingModal />
          <main className="flex-grow">
            <Routes>
              
              <Route path="/" element={<LandingPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/services/reconnection" element={<ReconnectionServicePage />} />
              <Route path="/services/billing-dispute" element={<BillingDisputeServicePage />} />
              <Route path="/services/other-billing" element={<OtherBillingServicePage />} />
              <Route path="/contact" element={<ContactPage />} />
              
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              <Route path="/dashboard" element={<ProtectedRoute>
                  <ConsumerDashboard />
                </ProtectedRoute>} />
              
              <Route path="/admin" element={<ProtectedRoute adminOnly>
                  <AdminDashboard />
                </ProtectedRoute>} />
              
              <Route path="/barangays" element={<ProtectedRoute adminOnly>
                  <BarangaysPage />
                </ProtectedRoute>} />
              
              <Route path="/barangays/:barangayName" element={<ProtectedRoute adminOnly>
                  <BarangayTicketsPage />
                </ProtectedRoute>} />
              
              <Route path="/profile" element={<ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>} />
              
              <Route path="/ticket/:id" element={<ProtectedRoute>
                  <TicketDetails />
                </ProtectedRoute>} />
              <Route path="/tickets/:id" element={<ProtectedRoute>
                  <TicketDetails />
                </ProtectedRoute>} />
            </Routes>
          </main>
          <AnnouncementMarquee />
          <Footer />
        </div>
        <Toaster position="top-right" />
      </Router>
    </AuthProvider>;
}
