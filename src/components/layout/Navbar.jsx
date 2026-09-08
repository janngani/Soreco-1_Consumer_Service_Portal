import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/lib/api";
import { Button } from "@/components/ui/button";
import { LogOut, User, LayoutDashboard, Menu, X, ChevronDown, Zap, FileText, Bell, Home, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
export const Navbar = () => {
  const { user, userData, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [systemLogo, setSystemLogo] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const isLandingPage = location.pathname === "/";
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await api.settings.get("system");
        if (data.value) {
          setSystemLogo(JSON.parse(data.value).logoUrl);
        }
      } catch (error) {
        console.error("Navbar settings fetch error:", error);
      }
    };
    fetchSettings();

    const handleSettingsUpdated = (e) => {
      if (e.detail) {
        setSystemLogo(e.detail.logoUrl || null);
      }
    };

    window.addEventListener("system-settings-updated", handleSettingsUpdated);
    return () => {
      window.removeEventListener("system-settings-updated", handleSettingsUpdated);
    };
  }, []);
  useEffect(() => {
    setMobileMenuOpen(false);
    setServicesDropdownOpen(false);
  }, [location.pathname]);
  const handleLogout = async () => {
    logout();
    navigate("/");
  };

  const [notifications, setNotifications] = useState([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const fetchNotifications = async () => {
      try {
        const lastViewed = localStorage.getItem(`lastViewedBellTime_${user.id || user.uid}`) || "1970-01-01T00:00:00.000Z";
        let list = [];
        let count = 0;

        if (isAdmin) {
          const [ticketsData, inquiriesData] = await Promise.all([
            api.tickets.list().catch(() => []),
            api.inquiries.list().catch(() => [])
          ]);

          ticketsData.forEach(t => {
            const date = t.createdAt || t.createdat;
            let messages = [];
            try {
              messages = typeof t.messages === "string" ? JSON.parse(t.messages) : (t.messages || []);
            } catch {}

            if (t.status === "pending") {
              list.push({
                id: `ticket-${t.id}`,
                title: "New Ticket Request",
                description: `${t.consumerName}: ${t.category}`,
                link: `/ticket/${t.id}`,
                date: date
              });
              if (new Date(date) > new Date(lastViewed)) {
                count++;
              }
            } else if (messages.length > 0) {
              const lastMsg = messages[messages.length - 1];
              if (lastMsg && lastMsg.senderId !== "admin" && lastMsg.senderId !== "system" && !lastMsg.isAdmin) {
                const msgDate = lastMsg.timestamp || date;
                list.push({
                  id: `ticket-msg-${t.id}-${msgDate}`,
                  title: `Consumer Message: ${t.category}`,
                  description: `${lastMsg.senderName || t.consumerName}: "${lastMsg.text || 'Attached pictures'}"`,
                  link: `/ticket/${t.id}`,
                  date: msgDate
                });
                if (new Date(msgDate) > new Date(lastViewed)) {
                  count++;
                }
              }
            }
          });

          inquiriesData.forEach(inq => {
            const msgs = inq.messages || [];
            const needsReply = msgs.length === 0 || msgs[msgs.length - 1]?.senderId !== "admin";
            if (needsReply) {
              const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
              const date = lastMsg?.createdAt || inq.createdAt || inq.createdat;
              list.push({
                id: `inq-${inq.id}`,
                title: "Pending Inquiry",
                description: `${inq.fullName}: ${lastMsg ? `"${lastMsg.text || 'Sent attached picture'}"` : inq.subject}`,
                link: `/admin?tab=inquiries&inquiryId=${inq.id}`,
                date: date
              });
              if (new Date(date) > new Date(lastViewed)) {
                count++;
              }
            }
          });
        } else {
          const [ticketsData, inquiriesData] = await Promise.all([
            api.tickets.list().catch(() => []),
            api.inquiries.listMy().catch(() => [])
          ]);

          ticketsData.forEach(t => {
            let messages = [];
            try {
              messages = typeof t.messages === "string" ? JSON.parse(t.messages) : (t.messages || []);
            } catch {}
            
            if (messages.length > 0) {
              const lastMsg = messages[messages.length - 1];
              if (lastMsg && (lastMsg.senderId === "admin" || lastMsg.senderId === "system" || lastMsg.isAdmin)) {
                const date = lastMsg.timestamp || lastMsg.createdAt || t.createdAt;
                list.push({
                  id: `msg-${t.id}-${date}`,
                  title: `Ticket Update: ${t.category}`,
                  description: `${lastMsg.senderName || 'Staff'}: "${lastMsg.text || 'Sent attachments'}"`,
                  link: `/ticket/${t.id}`,
                  date: date
                });
                if (new Date(date) > new Date(lastViewed)) {
                  count++;
                }
              }
            }
          });

          inquiriesData.forEach(inq => {
            const msgs = inq.messages || [];
            if (msgs.length > 0) {
              const lastMsg = msgs[msgs.length - 1];
              if (lastMsg && (lastMsg.senderId === "admin" || lastMsg.isAdmin)) {
                const date = lastMsg.createdAt || lastMsg.timestamp || inq.createdAt;
                list.push({
                  id: `inq-reply-${inq.id}-${date}`,
                  title: `Inquiry Reply: ${inq.subject}`,
                  description: `Admin: "${lastMsg.text || 'Sent attached picture'}"`,
                  link: `/dashboard?tab=inquiries&inquiryId=${inq.id}`,
                  date: date
                });
                if (new Date(date) > new Date(lastViewed)) {
                  count++;
                }
              }
            }
          });
        }

        list.sort((a, b) => new Date(b.date) - new Date(a.date));
        setNotifications(list);
        setUnreadCount(count);
      } catch (err) {
        console.error("Navbar notifications fetch error:", err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 12000);
    return () => clearInterval(interval);
  }, [user, isAdmin, location.pathname]);

  const handleBellClick = () => {
    setBellOpen(!bellOpen);
    if (!bellOpen) {
      localStorage.setItem(`lastViewedBellTime_${user?.id || user?.uid}`, new Date().toISOString());
      setUnreadCount(0);
    }
  };
  return <nav className="sticky top-0 z-50 w-full border-b border-slate-200/50 bg-[#F8F6F2]/90 backdrop-blur-md shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">

        <Link to="/" className="flex items-center gap-2.5 group">
          {systemLogo ? <img src={systemLogo} alt="SORECO-1 Logo" className="h-10 w-10 object-contain" /> : <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white font-extrabold text-lg shadow-md shadow-[#F4A261]/20 group-hover:scale-105 transition-transform">
              S1
            </div>}
          <div className="flex flex-col">
            <span className="text-lg font-extrabold tracking-tight text-slate-900 font-poppins">
              SORECO-1
            </span>
            <span className="text-[10px] uppercase font-mono tracking-widest text-[#F4A261] font-bold -mt-1">
              Bulan Portal
            </span>
          </div>
        </Link>

        <div className="hidden lg:flex items-center gap-8">
          {!isAdmin && <>
              <Link
    to="/about"
    className={`text-sm font-semibold transition-colors hover:text-[#F4A261] ${location.pathname === "/about" ? "text-[#F4A261]" : "text-slate-600"}`}
  >
                About Us
              </Link>

              <div className="relative">
                <button
    onClick={() => setServicesDropdownOpen(!servicesDropdownOpen)}
    onMouseEnter={() => setServicesDropdownOpen(true)}
    className={`flex items-center gap-1.5 text-sm font-semibold transition-colors hover:text-[#F4A261] focus:outline-none ${location.pathname.startsWith("/services") ? "text-[#F4A261]" : "text-slate-600"}`}
  >
                  Services <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${servicesDropdownOpen ? "rotate-180" : ""}`} />
                </button>
                
                {servicesDropdownOpen && <div
    className="absolute top-full left-0 mt-2 w-64 rounded-2xl bg-white border border-slate-100 shadow-xl p-3 flex flex-col gap-1 z-50 animate-in fade-in slide-in-from-top-3 duration-200"
    onMouseLeave={() => setServicesDropdownOpen(false)}
  >
                    <Link
                      to="/services"
                      className="p-2.5 rounded-xl text-xs font-bold text-[#F4A261] hover:bg-slate-50 uppercase tracking-widest border-b border-slate-100 mb-1"
                    >
                      All Services
                    </Link>
                    {userData?.hasUnpaidBill && (
                      <Link
                        to="/services/reconnection"
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-slate-700 hover:text-slate-950"
                      >
                        <Zap className="h-4 w-4 text-[#F4A261]" />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold">Reconnection of Service</span>
                          <span className="text-[10px] text-slate-400">Restore power after cutoffs</span>
                        </div>
                      </Link>
                    )}
                    <Link
                      to="/services/billing-dispute"
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-slate-700 hover:text-slate-950"
                    >
                      <FileText className="h-4 w-4 text-[#F4A261]" />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">Billing Dispute</span>
                        <span className="text-[10px] text-slate-400">Lodge discrepancies & audits</span>
                      </div>
                    </Link>
                    <Link
                      to="/services/other-billing"
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-slate-700 hover:text-slate-950"
                    >
                      <HelpCircle className="h-4 w-4 text-[#F4A261]" />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">Other Issues</span>
                        <span className="text-[10px] text-slate-400">Inquiries & general concerns</span>
                      </div>
                    </Link>
                  </div>}
              </div>

              <Link
    to="/contact"
    className={`text-sm font-semibold transition-colors hover:text-[#F4A261] ${location.pathname === "/contact" ? "text-[#F4A261]" : "text-slate-600"}`}
  >
                Contact
              </Link>
            </>}
        </div>

        <div className="hidden lg:flex items-center gap-4">
          <Link to="/">
            <Button
              variant="ghost"
              size="icon"
              className={cn("rounded-xl hover:bg-slate-100/50", location.pathname === "/" ? "text-[#F4A261] bg-slate-100/50" : "text-slate-700")}
            >
              <Home className="h-5 w-5" />
            </Button>
          </Link>
          {user ? <>
              
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBellClick}
                  className="relative rounded-xl text-slate-700 hover:bg-slate-100/50"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    </span>
                  )}
                </Button>

                {bellOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setBellOpen(false)} />
                    <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white border border-slate-100 shadow-xl p-4 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <span className="font-bold text-slate-900 text-xs">Notifications</span>
                        {unreadCount > 0 && (
                          <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 text-[10px] font-bold">
                            {unreadCount} New
                          </Badge>
                        )}
                      </div>
                      
                      <div className="mt-2 max-h-[250px] overflow-y-auto space-y-2 py-1">
                        {notifications.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-6 text-center">
                            <Bell className="h-6 w-6 text-slate-300 mb-2" />
                            <p className="text-[11px] text-slate-400 font-medium">No new alerts or notifications.</p>
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <Link
                              key={n.id}
                              to={n.link}
                              onClick={() => setBellOpen(false)}
                              className="block p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left"
                            >
                              <div className="flex justify-between items-start gap-2">
                                <span className="font-semibold text-xs text-slate-800 line-clamp-1">{n.title}</span>
                                <span className="text-[9px] text-slate-400 whitespace-nowrap">
                                  {new Date(n.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{n.description}</p>
                            </Link>
                          ))
                        )}
                      </div>
                      
                      <div className="border-t border-slate-100 pt-2.5 mt-2 flex justify-center">
                        <Link
                          to={isAdmin ? "/admin" : "/dashboard"}
                          onClick={() => setBellOpen(false)}
                          className="text-[11px] font-bold text-[#F4A261] hover:underline"
                        >
                          View all action items
                        </Link>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <Link to={isAdmin ? "/admin" : "/dashboard"}>
                <Button variant="ghost" className="gap-2 text-slate-700 hover:bg-slate-100/50 rounded-xl">
                  <LayoutDashboard className="h-4 w-4 text-[#F4A261]" />
                  <span>Dashboard</span>
                </Button>
              </Link>
              {!isAdmin && <Link to="/profile">
                  <Button variant="ghost" className="gap-2 text-slate-700 hover:bg-slate-100/50 rounded-xl">
                    <User className="h-4 w-4 text-[#F4A261]" />
                    <span>Profile</span>
                  </Button>
                </Link>}
              <Button variant="outline" onClick={handleLogout} className="gap-2 border-[#F4A261] text-[#F4A261] hover:bg-gradient-to-br from-amber-500 to-orange-600 hover:text-white rounded-xl">
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </> : <>
              <Link to="/login">
                <Button variant="ghost" className="text-slate-600 hover:text-slate-900 rounded-xl">Login</Button>
              </Link>
              <Link to="/register">
                <Button className="bg-gradient-to-br from-amber-500 to-orange-600 hover:bg-gradient-to-br from-amber-500 to-orange-600/90 text-white rounded-xl font-bold shadow-md shadow-[#F4A261]/20">Register</Button>
              </Link>
            </>}
        </div>

        <button
    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
    className="lg:hidden p-2 rounded-xl bg-white/50 border border-slate-200/40 text-slate-700 hover:text-[#F4A261]"
  >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>

      </div>

      <AnimatePresence>
        {mobileMenuOpen && <motion.div
    initial={{ opacity: 0, height: 0 }}
    animate={{ opacity: 1, height: "auto" }}
    exit={{ opacity: 0, height: 0 }}
    className="lg:hidden border-t border-slate-200/50 bg-[#F8F6F2] overflow-hidden shadow-inner z-40"
  >
            <div className="p-5 flex flex-col gap-4">
              <Link
    to="/"
    className={`text-sm font-bold p-2 rounded-xl transition-colors hover:bg-slate-100 ${location.pathname === "/" ? "text-[#F4A261]" : "text-slate-700"}`}
  >
                Home
              </Link>
              {!isAdmin && <>
                  <Link
    to="/about"
    className={`text-sm font-bold p-2 rounded-xl transition-colors hover:bg-slate-100 ${location.pathname === "/about" ? "text-[#F4A261]" : "text-slate-700"}`}
  >
                    About Us
                  </Link>

                  <div className="p-2 border border-slate-200/40 rounded-2xl bg-white/50 space-y-2">
                    <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 block px-2 pt-1">Our Services</span>
                    <Link
                      to="/services"
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 text-slate-700"
                    >
                      <div className="h-3 w-3 rounded-full bg-slate-300" />
                      <span className="text-xs font-bold">Services Overview</span>
                    </Link>
                    {userData?.hasUnpaidBill && (
                      <Link
                        to="/services/reconnection"
                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 text-slate-700"
                      >
                        <Zap className="h-4 w-4 text-[#F4A261]" />
                        <span className="text-xs font-bold">Reconnection of Service</span>
                      </Link>
                    )}
                    <Link
                      to="/services/billing-dispute"
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 text-slate-700"
                    >
                      <FileText className="h-4 w-4 text-[#F4A261]" />
                      <span className="text-xs font-bold">Billing Dispute</span>
                    </Link>
                    <Link
                      to="/services/other-billing"
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 text-slate-700"
                    >
                      <HelpCircle className="h-4 w-4 text-[#F4A261]" />
                      <span className="text-xs font-bold">Other Issues</span>
                    </Link>
                  </div>

                  <Link
    to="/contact"
    className={`text-sm font-bold p-2 rounded-xl transition-colors hover:bg-slate-100 ${location.pathname === "/contact" ? "text-[#F4A261]" : "text-slate-700"}`}
  >
                    Contact
                  </Link>
                </>}

              {user && (
                <div className="p-3 border border-slate-200/40 rounded-2xl bg-white/50 space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400">
                      Recent Alerts
                    </span>
                    {unreadCount > 0 && (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                      </span>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <p className="text-[11px] text-slate-400 px-1 py-1">No pending notifications.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                      {notifications.slice(0, 3).map((n) => (
                        <Link
                          key={n.id}
                          to={n.link}
                          className="block p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-800 line-clamp-1">{n.title}</span>
                            <span className="text-[9px] text-slate-400">
                              {new Date(n.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{n.description}</p>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <hr className="border-slate-200/50 my-2" />

              <div className="flex flex-col gap-2">
                {user ? <>
                    <Link to={isAdmin ? "/admin" : "/dashboard"} className="w-full">
                      <Button className="w-full bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-xl font-bold py-5 gap-2">
                        <LayoutDashboard className="h-4 w-4" /> Go to Dashboard
                      </Button>
                    </Link>
                    {!isAdmin && <Link to="/profile" className="w-full">
                        <Button variant="outline" className="w-full border-slate-200 rounded-xl py-5 text-slate-700 gap-2">
                          <User className="h-4 w-4 text-[#F4A261]" /> View Profile
                        </Button>
                      </Link>}
                    <Button variant="ghost" onClick={handleLogout} className="w-full rounded-xl py-5 text-red-600 hover:bg-red-50 hover:text-red-700 gap-2">
                      <LogOut className="h-4 w-4" /> Logout
                    </Button>
                  </> : <>
                    <Link to="/login" className="w-full">
                      <Button variant="outline" className="w-full border-slate-200 text-slate-700 py-5 rounded-xl">
                        Login
                      </Button>
                    </Link>
                    <Link to="/register" className="w-full">
                      <Button className="w-full bg-gradient-to-br from-amber-500 to-orange-600 text-white py-5 rounded-xl font-bold shadow-md shadow-[#F4A261]/20">
                        Register
                      </Button>
                    </Link>
                  </>}
              </div>
            </div>
          </motion.div>}
      </AnimatePresence>
    </nav>;
};
