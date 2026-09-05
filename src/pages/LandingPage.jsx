import { useState, useEffect } from "react";
import { Link } from "react-router";
import { api } from "@/src/lib/api";
import { Button } from "@/components/ui/button";
import {
  Zap,
  FileText,
  ArrowRight,
  CheckCircle2,
  Megaphone,
  Calendar,
  Eye,
  MapPin,
  Phone,
  Mail,
  Shield,
  Clock,
  Award,
  HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
export const LandingPage = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [settings, setSettings] = useState({ logoUrl: null });
  const [ratingsData, setRatingsData] = useState({
    averageRating: 0.0,
    totalFeedbacks: 0,
    satisfactionPercentage: 0,
    feedbacks: []
  });

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const data = await api.announcements.list();
        setAnnouncements(data);
      } catch (error) {
        console.error("Error fetching announcements for landing:", error);
      }
    };
    fetchAnnouncements();

    const fetchRatings = async () => {
      try {
        const data = await api.public.getRatings();
        if (data) setRatingsData(data);
      } catch (e) {
        console.warn("Failed to fetch public ratings:", e);
      }
    };
    fetchRatings();

    const fetchSettings = async () => {
      try {
        const data = await api.settings.get("system");
        if (data && data.value) {
          const parsed = JSON.parse(data.value);
          setSettings({ logoUrl: parsed.logoUrl || null });
        }
      } catch (e) {
      }
    };
    fetchSettings();

    const handleSettingsUpdated = (e) => {
      if (e.detail) {
        setSettings({ logoUrl: e.detail.logoUrl || null });
      }
    };

    window.addEventListener("system-settings-updated", handleSettingsUpdated);
    return () => {
      window.removeEventListener("system-settings-updated", handleSettingsUpdated);
    };
  }, []);
  return <div className="flex flex-col min-h-screen font-sans bg-[#F8F6F2]">

      <section className="relative pt-24 pb-20 overflow-hidden bg-white">
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[10%] -left-[10%] w-[45%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
          <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(var(--color-primary)_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.03]" />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

            <div className="lg:col-span-7 space-y-8">
              <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-50 border border-slate-150 text-slate-600 text-xs font-bold uppercase tracking-widest shadow-sm"
  >
                <Zap className="h-4 w-4 text-[#F4A261] animate-pulse" />
                Sorsogon I Electric Cooperative, Inc.
              </motion.div>
              
              <motion.h1
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 font-poppins leading-[1.05]"
  >
                Reliable Power <br />
                For A <span className="text-primary italic">Brighter</span> Bulan
              </motion.h1>
              
              <motion.p
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.1 }}
    className="text-lg text-slate-500 leading-relaxed max-w-xl"
  >
                Welcome to SORECO-1's official consumer service portal. File billing disputes, submit instant reconnection requests, and track utility crew operations in real-time.
              </motion.p>
              
              <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2 }}
    className="flex flex-wrap gap-4"
  >
                <Link to="/services">
                  <Button size="lg" className="bg-gradient-to-br from-amber-500 to-orange-600 hover:opacity-90 text-white px-8 py-6 text-base rounded-2xl shadow-xl shadow-primary/20 transition-all hover:scale-105">
                    View Services
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button size="lg" variant="outline" className="border-slate-200 text-slate-700 px-8 py-6 text-base rounded-2xl hover:bg-slate-50 transition-all">
                    Contact Us
                  </Button>
                </Link>
              </motion.div>
            </div>

            <div className="lg:col-span-5 flex justify-center">
              <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="relative w-full max-w-md bg-[#FFF5EC] border-4 border-white shadow-2xl rounded-[3rem] p-8 aspect-square flex flex-col justify-between overflow-hidden"
  >
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/20 rounded-full blur-2xl" />
                <div className="flex justify-between items-center">
                  {settings.logoUrl ? (
                    <img src={settings.logoUrl} alt="SORECO-1 Logo" className="h-12 w-12 object-contain" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#F4A261] font-black text-xl shadow-md shadow-[#F4A261]/10">
                      S1
                    </div>
                  )}
                  <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest bg-white py-1.5 px-3.5 rounded-full border">Grid Active</span>
                </div>

                <div className="space-y-4 my-8">
                  <span className="text-xs uppercase font-bold tracking-widest text-[#F4A261]">Interactive Utility</span>
                  <h3 className="text-3xl font-extrabold text-slate-900 font-poppins">Powering 85,000+ Connections</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Sorsogon's first choice for cooperative electricity distribution. We utilize high-voltage smart transformers and sub-line grids for dependable voltage stability.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-100 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <span className="text-xs font-bold text-slate-700">Digital Dispatch System</span>
                  </div>
                  <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded font-bold uppercase">Online</span>
                </div>
              </motion.div>
            </div>

          </div>
        </div>
      </section>

      {/* ── DEDICATED RATINGS & ACCOMPLISHMENT BOARD ── */}
      <section className="py-16 bg-white border-b border-orange-100">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12 max-w-2xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold uppercase tracking-wider mb-3 shadow-xs border border-amber-200"
            >
              <Award className="h-4 w-4 text-amber-600" />
              <span>Customer Satisfaction Board</span>
            </motion.div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-poppins tracking-tight">
              Overall Ratings Accomplished
            </h2>
            <p className="text-slate-500 text-sm mt-2 font-medium">
              Transparent feedback metrics and ratings submitted by our member-consumers across Bulan and surrounding coverage areas.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mb-6">
            <div className="lg:col-span-4 bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-8 text-white shadow-xl flex flex-col justify-between">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-100">Overall Rating Score</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-black font-poppins">{ratingsData.averageRating}</span>
                  <span className="text-2xl font-bold text-amber-200">/ 5.0</span>
                </div>
                <div className="flex gap-1 pt-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} className="text-amber-200 text-lg">★</span>
                  ))}
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-white/20 space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span>Satisfaction Rate</span>
                  <span className="font-bold">{ratingsData.satisfactionPercentage}%</span>
                </div>
                <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                  <div className="bg-white h-full rounded-full" style={{ width: `${ratingsData.satisfactionPercentage}%` }} />
                </div>
                <p className="text-[11px] text-amber-100 pt-2">Based on {ratingsData.totalFeedbacks} verified resolved consumer tickets.</p>
              </div>
            </div>

            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#FFFDF9] border border-orange-100 p-6 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center">
                <FileText className="h-8 w-8 text-slate-800 mb-3" />
                <h4 className="font-bold text-slate-900 text-sm mb-1">Billing Dispute</h4>
                <div className="flex items-center gap-1 my-2">
                  <span className="text-3xl font-black font-poppins text-slate-800">{ratingsData.breakdown?.billing || "0.0"}</span>
                  <span className="text-amber-500 text-lg">★</span>
                </div>
                <p className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold">Average Rating</p>
              </div>

              <div className="bg-[#FFFDF9] border border-orange-100 p-6 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center">
                <Zap className="h-8 w-8 text-primary mb-3" />
                <h4 className="font-bold text-slate-900 text-sm mb-1">Reconnection Service</h4>
                <div className="flex items-center gap-1 my-2">
                  <span className="text-3xl font-black font-poppins text-slate-800">{ratingsData.breakdown?.reconnection || "0.0"}</span>
                  <span className="text-amber-500 text-lg">★</span>
                </div>
                <p className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold">Average Rating</p>
              </div>

              <div className="bg-[#FFFDF9] border border-orange-100 p-6 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center">
                <HelpCircle className="h-8 w-8 text-purple-600 mb-3" />
                <h4 className="font-bold text-slate-900 text-sm mb-1">Other Issues</h4>
                <div className="flex items-center gap-1 my-2">
                  <span className="text-3xl font-black font-poppins text-slate-800">{ratingsData.breakdown?.other || "0.0"}</span>
                  <span className="text-amber-500 text-lg">★</span>
                </div>
                <p className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold">Average Rating</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PUBLIC ANNOUNCEMENT BOARD (UP CENTER OF LANDING PAGE) ── */}
      <section className="py-16 bg-[#FFFDF9] border-y border-orange-150 relative shadow-inner">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-10 max-w-2xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100 text-[#E65100] text-xs font-bold uppercase tracking-wider mb-3 shadow-xs border border-orange-200"
            >
              <Megaphone className="h-3.5 w-3.5 text-orange-600 animate-pulse" />
              <span>Cooperative Bulletin</span>
              {announcements.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[#E65100] text-white text-[10px] font-black">
                  {announcements.length}
                </span>
              )}
            </motion.div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-poppins tracking-tight">
              Announcement Board
            </h2>
            <p className="text-slate-600 text-sm mt-2 font-medium">
              Official cooperative announcements, scheduled feeder maintenance, and public advisories for Bulan and neighboring districts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {announcements.map((ann, i) => (
                <motion.div
                  key={ann.id}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="group bg-white border border-orange-100 hover:border-orange-300 p-6 rounded-2xl shadow-sm hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300 cursor-pointer flex flex-col justify-between relative overflow-hidden"
                  onClick={() => setSelectedAnnouncement(ann)}
                >
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#E65100] via-amber-500 to-orange-400 group-hover:h-2 transition-all" />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="inline-flex items-center gap-1.5 text-slate-500 font-semibold">
                        <Calendar className="h-3.5 w-3.5 text-orange-600" />
                        {new Date(ann.createdAt || Date.now()).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 text-[11px] font-bold border border-orange-200">
                        Notice #{i + 1}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 group-hover:text-[#E65100] transition-colors line-clamp-2 font-poppins leading-snug">
                      {ann.title}
                    </h3>

                    <p className="text-slate-600 line-clamp-3 text-xs leading-relaxed">
                      {ann.content}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#E65100] group-hover:text-[#D84315]">
                    <span className="flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5" /> Read Full Advisory
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {announcements.length === 0 && (
              <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-500 text-sm shadow-xs">
                <Megaphone className="h-8 w-8 mx-auto mb-2 text-orange-300" />
                <p className="font-semibold text-slate-700">No active announcements at this moment.</p>
                <p className="text-xs text-slate-400 mt-1">Normal power distribution in effect across all 63 barangays.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="py-24 bg-[#F8F6F2] relative">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
            
            <motion.div
    initial={{ opacity: 0, x: -30 }}
    whileInView={{ opacity: 1, x: 0 }}
    viewport={{ once: true }}
    className="space-y-6"
  >
              <div className="text-primary font-bold uppercase tracking-widest text-xs">About SORECO-1</div>
              <h2 className="text-4xl font-extrabold text-slate-900 font-poppins tracking-tight">Dedicated to Powering Sorsogon's First District</h2>
              <p className="text-slate-600 leading-relaxed text-sm">
                Sorsogon I Electric Cooperative, Inc. (SORECO-1) is a non-profit electric service cooperative catering to Bulan, Irosin, Matnog, and adjacent municipalities. Incorporated on November 15, 1973 under NEA guidelines, we strive to build a resilient electric grid while facilitating complete customer transparency.
              </p>
              <p className="text-slate-600 leading-relaxed text-sm">
                With the launch of our digital consumer portal, we bring SORECO-1's billing, reconnection, and service tracking pipelines directly to your smart devices.
              </p>
              <div className="pt-2">
                <Link to="/about">
                  <Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl gap-2 text-xs font-bold px-6 py-5">
                    Read Company History <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </motion.div>

            <motion.div
    initial={{ opacity: 0, x: 30 }}
    whileInView={{ opacity: 1, x: 0 }}
    viewport={{ once: true }}
    className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-150 shadow-sm grid grid-cols-2 gap-6"
  >
              <div className="p-6 rounded-2xl bg-[#FFF5EC] border border-[#F4A261]/10 text-center space-y-2">
                <span className="text-3xl font-black text-primary font-mono block">1973</span>
                <span className="text-xs font-bold text-slate-700">Year Founded</span>
              </div>
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 text-center space-y-2">
                <span className="text-3xl font-black text-slate-900 font-mono block">85K+</span>
                <span className="text-xs font-bold text-slate-700">Member Connections</span>
              </div>
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 text-center space-y-2">
                <span className="text-3xl font-black text-slate-900 font-mono block">4</span>
                <span className="text-xs font-bold text-slate-700">Municipal Centers</span>
              </div>
              <div className="p-6 rounded-2xl bg-[#FFF5EC] border border-[#F4A261]/10 text-center space-y-2">
                <span className="text-3xl font-black text-primary font-mono block">24/7</span>
                <span className="text-xs font-bold text-slate-700">Crew Support</span>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <span className="text-[#F4A261] font-bold text-xs uppercase tracking-wider block mb-2">Portal Access</span>
            <h2 className="text-4xl font-extrabold text-slate-900 font-poppins tracking-tight">Digital Services</h2>
            <p className="text-slate-500 text-sm mt-3">Easily submit applications and formal inquiries completely online through our portal channels.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-4xl mx-auto">

            <motion.div
    whileHover={{ y: -6 }}
    className="bg-[#F8F6F2] p-8 md:p-10 rounded-[2rem] border border-slate-100 flex flex-col justify-between"
  >
              <div>
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6">
                  <Zap className="h-7 w-7" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 font-poppins mb-3">Reconnection of Service</h3>
                <p className="text-slate-600 text-xs leading-relaxed mb-6">
                  Has your power been cut off due to unpaid monthly arrears? Lodge an online reconnection request by uploading your payment receipt details.
                </p>
              </div>
              <Link to="/services/reconnection">
                <button className="text-xs font-bold uppercase tracking-widest text-[#F4A261] flex items-center gap-1.5 group">
                  Learn Reconnection Process <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
            </motion.div>

            <motion.div
    whileHover={{ y: -6 }}
    className="bg-[#F8F6F2] p-8 md:p-10 rounded-[2rem] border border-slate-100 flex flex-col justify-between"
  >
              <div>
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6">
                  <FileText className="h-7 w-7" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 font-poppins mb-3">Billing Dispute</h3>
                <p className="text-slate-600 text-xs leading-relaxed mb-6">
                  Spot a meter dial reading discrepancy or unexpected high spike? Request an official cooperative audit by submitting a meter photograph.
                </p>
              </div>
              <Link to="/services/billing-dispute">
                <button className="text-xs font-bold uppercase tracking-widest text-[#F4A261] flex items-center gap-1.5 group">
                  Learn Dispute Process <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
            </motion.div>

          </div>
        </div>
      </section>



      <section className="py-24 bg-white relative">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            <div className="space-y-8">
              <span className="text-primary font-bold text-xs uppercase tracking-wider block">Get In Touch</span>
              <h2 className="text-4xl font-extrabold text-slate-900 font-poppins tracking-tight">Quick Customer Helpdesk</h2>
              <p className="text-slate-600 leading-relaxed text-sm">
                Have questions about billing schedules, power connections, or our online services? Reach out to our friendly Bulan customer services representative today.
              </p>
              
              <div className="space-y-6">
                <div className="flex gap-4 p-5 bg-[#F8F6F2] rounded-2xl border border-slate-100">
                  <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs font-poppins">Physical Address</h5>
                    <p className="text-xs text-slate-500 mt-1">Zone-5, Immaculada Concepcion Street, Bulan, Sorsogon</p>
                  </div>
                </div>

                <div className="flex gap-4 p-5 bg-[#F8F6F2] rounded-2xl border border-slate-100">
                  <Phone className="h-5 w-5 text-primary flex-shrink-0" />
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs font-poppins">Customer Hotlines</h5>
                    <p className="text-xs text-slate-500 mt-1">(056) 555-0199 / +63 917-888-2626</p>
                  </div>
                </div>

                <div className="flex gap-4 p-5 bg-[#F8F6F2] rounded-2xl border border-slate-100">
                  <Mail className="h-5 w-5 text-primary flex-shrink-0" />
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs font-poppins">Email Support</h5>
                    <p className="text-xs text-slate-500 mt-1">info@soreco1.com.ph / billing@soreco1.com.ph</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#F8F6F2] rounded-[2.5rem] border border-slate-150 shadow-sm overflow-hidden">
              <div className="relative w-full h-[350px] bg-slate-100 rounded-3xl overflow-hidden flex flex-col items-center justify-center text-center p-6">
                <div className="absolute inset-0 bg-[#E0DEC9] opacity-30" />
                <MapPin className="h-8 w-8 text-primary mb-3 animate-bounce" />
                <h4 className="font-extrabold text-slate-900 font-poppins text-xs mb-1">SORECO-1 Bulan Main Branch</h4>
                <p className="text-[10px] text-slate-500 leading-relaxed max-w-xs mb-4">
                  Zone-5, Immaculada Concepcion Street, Bulan, Sorsogon (Near Immaculada Concepcion Parish Church).
                </p>
                <a
    href="https://maps.google.com/?q=Immaculada+Concepcion+Street+Bulan+Sorsogon"
    target="_blank"
    rel="noopener noreferrer"
    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl"
  >
                  View Directions
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      <Dialog open={!!selectedAnnouncement} onOpenChange={(open) => !open && setSelectedAnnouncement(null)}>
        <DialogContent className="sm:max-w-[620px] rounded-3xl bg-white border border-orange-100 font-sans p-6 shadow-2xl">
          <DialogHeader className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[#E65100]">
                <Megaphone className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-wider font-mono">SORECO-1 Official Notice</span>
              </div>
              <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-[10px] font-bold">
                Public Advisory
              </Badge>
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-bold font-poppins text-slate-900 leading-snug">
              {selectedAnnouncement?.title}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2 text-slate-500 text-xs pt-0.5">
              <Calendar className="h-3.5 w-3.5 text-orange-500" /> Published on {selectedAnnouncement?.createdAt && new Date(selectedAnnouncement.createdAt).toLocaleString(void 0, {
                dateStyle: "full",
                timeStyle: "short"
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 p-5 bg-[#FFFDF9] rounded-2xl border border-orange-100 text-slate-800 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
            {selectedAnnouncement?.content}
          </div>

          <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-[#E65100] shrink-0" />
              <span>Coop Dispatch Hotline: <strong>(056) 555-0199</strong></span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Bulan District Office</span>
          </div>

          <div className="pt-3">
            <Button
              onClick={() => setSelectedAnnouncement(null)}
              className="w-full h-11 bg-[#E65100] hover:bg-[#D84315] rounded-xl text-white font-bold text-xs shadow-md"
            >
              Acknowledge & Close Notice
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
};
