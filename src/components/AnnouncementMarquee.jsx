import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { Megaphone, ExternalLink, X, ChevronUp, Bell } from "lucide-react";
import { api } from "@/src/lib/api";

export const AnnouncementMarquee = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;
    const fetchAnnouncements = async () => {
      try {
        const data = await api.public.getAnnouncements();
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setAnnouncements(data);
        }
      } catch (err) {
        console.warn("AnnouncementMarquee fetch warning:", err);
      }
    };

    fetchAnnouncements();

    const handleAnnouncementChange = () => {
      fetchAnnouncements();
    };

    window.addEventListener("announcements-updated", handleAnnouncementChange);
    return () => {
      isMounted = false;
      window.removeEventListener("announcements-updated", handleAnnouncementChange);
    };
  }, []);

  // Don't render on admin dashboard or if no announcements
  if (location.pathname.startsWith("/admin") || announcements.length === 0) {
    return null;
  }

  const handleRedirectToBoard = (e) => {
    if (e) e.stopPropagation();
    if (location.pathname !== "/") {
      navigate("/#announcements");
    } else {
      const el = document.getElementById("announcements");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.scrollTo({ top: 900, behavior: "smooth" });
      }
    }
  };

  if (isMinimized) {
    return (
      <aside aria-label="Announcement Notifications">
        <button
          onClick={() => setIsMinimized(false)}
          className="fixed bottom-4 right-4 z-40 flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white px-3.5 py-2 rounded-full shadow-xl border border-orange-400/40 text-xs font-bold hover:scale-105 transition-all cursor-pointer group"
          title="Open Public Announcement Recap"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-200 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
          </span>
          <Megaphone className="h-3.5 w-3.5 group-hover:rotate-12 transition-transform" />
          <span>Announcements ({announcements.length})</span>
          <ChevronUp className="h-3 w-3 opacity-80" />
        </button>
      </aside>
    );
  }

  // Duplicate items for continuous left-to-right looping
  const items = [...announcements, ...announcements];

  return (
    <div
      role="region"
      aria-label="Public Announcements Ticker"
      className="fixed bottom-4 left-3 right-3 md:left-6 md:right-6 max-w-5xl md:mx-auto z-40 select-none animate-in fade-in slide-in-from-bottom-3 duration-300"
    >
      <div
        onClick={handleRedirectToBoard}
        className="group relative flex items-center bg-slate-950/95 hover:bg-slate-950 text-white rounded-2xl p-1.5 md:p-2 shadow-2xl border border-orange-500/40 backdrop-blur-md cursor-pointer overflow-hidden transition-all duration-200 hover:border-orange-400 hover:shadow-orange-950/20"
        title="Click to view full Announcement Board"
      >
        {/* Left static badge */}
        <div className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white px-3 py-1.5 rounded-xl shrink-0 z-10 shadow-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
          </span>
          <Megaphone className="h-3.5 w-3.5 shrink-0" />
          <span className="text-[11px] md:text-xs font-black tracking-wide uppercase font-poppins">
            Public Recap
          </span>
        </div>

        {/* Floating running window: moving left to right */}
        <div className="relative flex-1 overflow-hidden mx-2 md:mx-3 py-0.5 mask-gradient">
          <div className="ticker-ltr flex items-center gap-8 py-0.5">
            {items.map((ann, idx) => (
              <div
                key={`${ann.id || idx}-${idx}`}
                className="inline-flex items-center gap-2.5 text-xs text-slate-200 hover:text-white shrink-0 group-hover:underline-offset-2"
              >
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-orange-500/20 text-orange-400 text-[10px] font-bold uppercase tracking-wider border border-orange-500/30">
                  {ann.category || "Bulletin"}
                </span>
                <span className="font-bold text-white tracking-tight">
                  {ann.title}
                </span>
                {ann.content && (
                  <span className="text-slate-400 text-[11px] font-normal hidden sm:inline truncate max-w-md">
                    — {ann.content.replace(/\s+/g, " ").slice(0, 95)}...
                  </span>
                )}
                <span className="text-orange-500/50 font-mono text-xs px-2">•</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Action buttons */}
        <div className="flex items-center gap-1.5 shrink-0 z-10 pl-1 pr-1">
          <button
            type="button"
            onClick={handleRedirectToBoard}
            className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
            title="Redirect to Public Announcement Board"
          >
            <span className="hidden sm:inline">Announcement Board</span>
            <ExternalLink className="h-3.5 w-3.5 text-orange-400" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(true);
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Minimize announcement marquee"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
