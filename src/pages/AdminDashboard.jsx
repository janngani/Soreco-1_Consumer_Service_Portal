import { useState, useEffect, useRef } from "react";
import { api } from "@/src/lib/api";
import { compressImage } from "@/src/lib/imageCompressor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Link, useLocation, useNavigate } from "react-router";
import {
  BarChart3,
  Users,
  Ticket,
  Megaphone,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Truck,
  Clock,
  Trash2,
  Plus,
  FileText,
  Zap,
  Settings,
  Image as ImageIcon,
  Save,
  Star,
  AlertCircle,
  Edit,
  UserPlus,
  Shield,
  Lock,
  MapPin,
  Phone,
  Mail,
  Facebook,
  Globe,
  Database,
  Copy,
  ShieldAlert,
  MessageSquare,
  Send,
  Paperclip,
  X,
  ZoomIn,
  Download,
  History,
  HelpCircle,
  Pencil,
  GripVertical,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { ConsumerTransactionHistoryModal } from "@/src/components/ConsumerTransactionHistoryModal";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Legend, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
export const AdminDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const urlBarangay = searchParams.get("barangay") || "";

  const [activeTab, setActiveTab] = useState("analytics");
  const [tickets, setTickets] = useState([]);
  const [ticketToDelete, setTicketToDelete] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [draggedAnnouncementIndex, setDraggedAnnouncementIndex] = useState(null);
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Feedback States
  const [feedbackRatingFilter, setFeedbackRatingFilter] = useState("all");
  const [feedbackDateFilter, setFeedbackDateFilter] = useState("");
  const [feedbackServiceFilter, setFeedbackServiceFilter] = useState("all");

  // Multi-series chart states
  const [timeSeriesFilter, setTimeSeriesFilter] = useState("daily");
  const [chartStartDate, setChartStartDate] = useState("");
  const [chartEndDate, setChartEndDate] = useState("");
  const [timeSeriesTypeFilter, setTimeSeriesTypeFilter] = useState("all");

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get("tab");
    const inquiryIdParam = searchParams.get("inquiryId");
    const ticketIdParam = searchParams.get("ticketId");

    if (ticketIdParam) {
      navigate(`/ticket/${ticketIdParam}`);
      return;
    }

    if (tabParam) {
      setActiveTab(tabParam);
    }

    if (inquiryIdParam) {
      setActiveTab("inquiries");
      setActiveInquiryChatId(inquiryIdParam);
      setTimeout(() => {
        const el = document.getElementById(`inquiry-card-${inquiryIdParam}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 300);
    }
  }, [location.search, navigate]);
  const [searchFilter, setSearchFilter] = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateSort, setDateSort] = useState("newest");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [users, setUsers] = useState([]);
  const [userSearchFilter, setUserSearchFilter] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [editingUser, setEditingUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);

  const [selectedHistoryConsumer, setSelectedHistoryConsumer] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const openConsumerHistory = (consumer) => {
    setSelectedHistoryConsumer(consumer);
    setIsHistoryModalOpen(true);
  };

  const [activeInquiryChatId, setActiveInquiryChatId] = useState(null);
  const [inquiryReplyText, setInquiryReplyText] = useState("");
  const [isSendingInquiryReply, setIsSendingInquiryReply] = useState(false);
  const [adminInquiryImages, setAdminInquiryImages] = useState([]);
  const [isProcessingAdminImages, setIsProcessingAdminImages] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const adminFileInputRef = useRef(null);

  const handleAdminFilesChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setIsProcessingAdminImages(true);
    try {
      const compressedResults = await Promise.all(
        files.map(async (file) => {
          try {
            return await compressImage(file, 800, 0.7);
          } catch (err) {
            console.warn("Image compression error:", err);
            return null;
          }
        })
      );
      const validImages = compressedResults.filter(Boolean);
      if (validImages.length > 0) {
        setAdminInquiryImages((prev) => [...prev, ...validImages]);
        toast.success(`Attached ${validImages.length} picture${validImages.length > 1 ? "s" : ""}`);
      }
    } catch (err) {
      toast.error("Error attaching pictures");
    } finally {
      setIsProcessingAdminImages(false);
      if (adminFileInputRef.current) {
        adminFileInputRef.current.value = "";
      }
    }
  };

  const removeAdminImage = (indexToRemove) => {
    setAdminInquiryImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSendInquiryReply = async (inqId) => {
    if (!inquiryReplyText.trim() && adminInquiryImages.length === 0) return;
    setIsSendingInquiryReply(true);
    try {
      const targetInq = inquiries.find((i) => i.id === inqId);
      if (!targetInq) return;
      const currentMessages = targetInq.messages || [];
      const newMessage = {
        senderId: "admin",
        senderName: "SORECO-1 Admin",
        text: inquiryReplyText.trim(),
        images: adminInquiryImages.length > 0 ? adminInquiryImages : undefined,
        createdAt: new Date().toISOString()
      };
      const updatedMessages = [...currentMessages, newMessage];
      await api.inquiries.update(inqId, { messages: updatedMessages });
      toast.success("Reply sent successfully!");
      setInquiryReplyText("");
      setAdminInquiryImages([]);
      const inquiriesData = await api.inquiries.list();
      setInquiries(inquiriesData);
    } catch (err) {
      console.error(err);
      toast.error("Failed to send reply");
    } finally {
      setIsSendingInquiryReply(false);
    }
  };
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUser, setNewUser] = useState({
    fullName: "",
    email: "",
    password: "",
    accountNumber: "",
    role: "consumer",
    phoneNumber: "",
    address: ""
  });
  const [newAnnouncement, setNewAnnouncement] = useState({ title: "", content: "" });
  const [logoPreview, setLogoPreview] = useState(null);
  const [settingPhoneNumber, setSettingPhoneNumber] = useState("(056) 555-0199 / +63 917-888-2626");
  const [settingEmail, setSettingEmail] = useState("info@soreco1.com.ph");
  const [settingFacebookUrl, setSettingFacebookUrl] = useState("https://facebook.com/soreco1");
  const [settingWebsiteUrl, setSettingWebsiteUrl] = useState("https://soreco1.com.ph");
  const [settingAddress, setSettingAddress] = useState("Zone-5, Immaculada Concepcion Street, Bulan, Sorsogon, Philippines");
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const fileInputRef = useRef(null);
  const [backendStatus, setBackendStatus] = useState(null);
  const fetchBackendStatus = async () => {
    try {
      const status = await api.backend.status();
      setBackendStatus(status);
    } catch (err) {
      console.error("Failed to fetch backend status:", err);
    }
  };
  const fetchData = async () => {
    try {
      const [ticketsResult, announcementsResult, settingsResult, usersResult] = await Promise.allSettled([
        api.tickets.list(),
        api.announcements.list(),
        api.settings.get("system"),
        api.users.list()
      ]);

      if (ticketsResult.status === "fulfilled" && Array.isArray(ticketsResult.value)) {
        setTickets(ticketsResult.value);
      }
      if (announcementsResult.status === "fulfilled" && Array.isArray(announcementsResult.value)) {
        setAnnouncements(announcementsResult.value);
      }
      if (settingsResult.status === "fulfilled" && settingsResult.value?.value) {
        try {
          const parsed = JSON.parse(settingsResult.value.value);
          if (parsed) {
            if (parsed.logoUrl !== undefined) setLogoPreview(parsed.logoUrl);
            if (parsed.phoneNumber !== undefined) setSettingPhoneNumber(parsed.phoneNumber);
            if (parsed.email !== undefined) setSettingEmail(parsed.email);
            if (parsed.facebookUrl !== undefined) setSettingFacebookUrl(parsed.facebookUrl);
            if (parsed.websiteUrl !== undefined) setSettingWebsiteUrl(parsed.websiteUrl);
            if (parsed.address !== undefined) setSettingAddress(parsed.address);
          }
        } catch (e) {
        }
      }
      if (usersResult.status === "fulfilled" && Array.isArray(usersResult.value)) {
        const unique = [];
        const seen = new Set();
        for (const u of usersResult.value) {
          if (u && u.id && !seen.has(u.id)) {
            seen.add(u.id);
            unique.push(u);
          }
        }
        setUsers(unique);
      }

      try {
        const inquiriesData = await api.inquiries.list();
        if (Array.isArray(inquiriesData)) {
          setInquiries(inquiriesData);
        }
      } catch (inqErr) {
        console.warn("Failed to load inquiries:", inqErr);
      }
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
    fetchBackendStatus();
    const interval = setInterval(() => {
      fetchData();
      fetchBackendStatus();
    }, 3e4);
    return () => clearInterval(interval);
  }, []);
  if (loading) {
    return <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Clock className="h-8 w-8 animate-spin text-primary" />
          <p className="text-slate-500 animate-pulse">Loading Admin Dashboard...</p>
        </div>
      </div>;
  }
  const handleAddAnnouncement = async (e) => {
    e.preventDefault();
    try {
      await api.announcements.create(newAnnouncement);
      toast.success("Announcement published");
      setNewAnnouncement({ title: "", content: "" });
      fetchData();
    } catch (error) {
      toast.error("Failed to publish announcement");
    }
  };
  const handleDeleteAnnouncement = async (id) => {
    try {
      await api.announcements.delete(id);
      toast.success("Announcement deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const handleEditAnnouncement = (ann) => {
    setEditingAnnouncement({
      id: ann.id,
      title: ann.title || "",
      content: ann.content || ""
    });
  };

  const handleSaveEditAnnouncement = async (e) => {
    if (e) e.preventDefault();
    if (!editingAnnouncement) return;
    try {
      await api.announcements.update(editingAnnouncement.id, {
        title: editingAnnouncement.title,
        content: editingAnnouncement.content
      });
      toast.success("Announcement updated successfully");
      setEditingAnnouncement(null);
      fetchData();
    } catch (error) {
      toast.error("Failed to update announcement: " + error.message);
    }
  };

  const handleAnnouncementDragStart = (index, e) => {
    setDraggedAnnouncementIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleAnnouncementDragOver = (index, e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleAnnouncementDrop = async (targetIndex, e) => {
    e.preventDefault();
    if (draggedAnnouncementIndex === null || draggedAnnouncementIndex === targetIndex) return;
    const items = [...announcements];
    const [moved] = items.splice(draggedAnnouncementIndex, 1);
    items.splice(targetIndex, 0, moved);
    setAnnouncements(items);
    setDraggedAnnouncementIndex(null);
    try {
      await api.announcements.reorder(items);
      toast.success("Announcement order saved!");
    } catch (err) {
      console.error("Failed to save reorder", err);
    }
  };

  const handleMoveAnnouncement = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= announcements.length) return;
    const items = [...announcements];
    const [moved] = items.splice(index, 1);
    items.splice(targetIndex, 0, moved);
    setAnnouncements(items);
    try {
      await api.announcements.reorder(items);
      toast.success("Announcement order updated!");
    } catch (err) {
      console.error("Order error", err);
    }
  };

  const handleDeleteTicket = async () => {
    if (!ticketToDelete) return;
    try {
      await api.tickets.delete(ticketToDelete.id);
      toast.success("Ticket deleted successfully!");
      setTickets((prev) => prev.filter((t) => t.id !== ticketToDelete.id));
      setTicketToDelete(null);
    } catch (err) {
      toast.error("Failed to delete ticket.");
    }
  };
  const handleEditUser = (user) => {
    setEditingUser(user);
  };
  const handleUpdateUserSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await api.users.update(editingUser.id, {
        fullName: editingUser.fullName,
        email: editingUser.email,
        accountNumber: editingUser.accountNumber,
        role: editingUser.role,
        phoneNumber: editingUser.phoneNumber || "",
        address: editingUser.address || "",
        hasUnpaidBill: Boolean(editingUser.hasUnpaidBill)
      });
      toast.success("User updated successfully");
      setEditingUser(null);
      fetchData();
    } catch (error) {
      toast.error(error.message || "Failed to update user");
    }
  };
  const handleDeleteUser = (id) => {
    const user = users.find((u) => u.id === id);
    if (user) {
      setUserToDelete(user);
    }
  };
  const handleCreateUserSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.users.create(newUser);
      toast.success("User created successfully");
      setIsCreatingUser(false);
      setNewUser({
        fullName: "",
        email: "",
        password: "",
        accountNumber: "",
        role: "consumer",
        phoneNumber: "",
        address: ""
      });
      fetchData();
    } catch (error) {
      toast.error(error.message || "Failed to create user");
    }
  };
  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 256, 0.7);
        setLogoPreview(compressed);
      } catch (err) {
        console.warn("Error compressing logo, falling back:", err);
        const reader = new FileReader();
        reader.onloadend = () => {
          setLogoPreview(reader.result);
        };
        reader.readAsDataURL(file);
      }
    }
  };
  const handleUpdateSettings = async () => {
    setIsUpdatingSettings(true);
    try {
      const settingsPayload = {
        logoUrl: logoPreview,
        phoneNumber: settingPhoneNumber,
        email: settingEmail,
        facebookUrl: settingFacebookUrl,
        websiteUrl: settingWebsiteUrl,
        address: settingAddress,
        updatedAt: new Date().toISOString()
      };
      await api.settings.set("system", JSON.stringify(settingsPayload));
      window.dispatchEvent(new CustomEvent("system-settings-updated", { detail: settingsPayload }));
      toast.success("System & Contact settings updated successfully");
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("Failed to update settings");
    } finally {
      setIsUpdatingSettings(false);
    }
  };
  const getRelativeAge = (dateString) => {
    if (!dateString) return "Just now";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Just now";
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return "1 day";
    if (diffInDays < 30) return `${diffInDays} days`;
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths === 1) return "1 month";
    return `${diffInMonths} months`;
  };

  const stats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === "pending" || t.status === "reviewing" || t.status === "dispatched").length,
    pending: tickets.filter((t) => t.status === "pending").length,
    reviewing: tickets.filter((t) => t.status === "reviewing").length,
    dispatched: tickets.filter((t) => t.status === "dispatched").length,
    resolved: tickets.filter((t) => t.status === "resolved").length
  };
  const chartData = [
    { name: "Pending", value: stats.pending, color: "#f59e0b" },
    { name: "Reviewing", value: stats.reviewing, color: "#3b82f6" },
    { name: "Dispatched", value: stats.dispatched, color: "#8b5cf6" },
    { name: "Resolved", value: stats.resolved, color: "#10b981" }
  ];
  const filteredTickets = tickets.filter((ticket) => {
    const term = searchFilter.trim().toLowerCase();
    const searchMatch = !term || 
      (ticket.consumerName && ticket.consumerName.toLowerCase().includes(term)) ||
      (ticket.accountNumber && ticket.accountNumber.toLowerCase().includes(term)) ||
      (ticket.category && ticket.category.toLowerCase().includes(term)) ||
      (ticket.type && ticket.type.toLowerCase().includes(term));

    const statusMatch = statusTab === "all" || 
      (statusTab === "pending" && ticket.status === "pending") ||
      (statusTab === "open" && ticket.status === "pending") ||
      ticket.status === statusTab;

    const typeMatch = typeFilter === "all" || 
      (ticket.type && ticket.type.toLowerCase() === typeFilter.toLowerCase()) ||
      (ticket.category && ticket.category.toLowerCase().includes(typeFilter.toLowerCase()));

    const barangayMatch = !urlBarangay || (ticket.address && ticket.address.toLowerCase().includes(urlBarangay.toLowerCase()));

    let dateMatch = true;
    if (startDate || endDate) {
      const ticketDate = new Date(ticket.createdAt);
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (ticketDate < start) dateMatch = false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (ticketDate > end) dateMatch = false;
      }
    }
    return searchMatch && statusMatch && typeMatch && barangayMatch && dateMatch;
  }).sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateSort === "oldest" ? dateA - dateB : dateB - dateA;
  });
  const pendingTicketsCount = tickets.filter((t) => t.status === "pending").length;
  // A feedback is considered "unread/new" if there is no admin response yet
  const newFeedbacksCount = tickets.filter((t) => t.feedback && !t.feedback.adminResponse).length;
  
  const pendingInquiriesCount = inquiries.filter((inq) => {
    const msgs = inq.messages || [];
    return msgs.length === 0 || msgs[msgs.length - 1]?.senderId !== "admin";
  }).length;

  const getFeedbackChartData = () => {
    const feedbacks = tickets.filter((t) => t.feedback).filter(t => {
      if (feedbackServiceFilter !== "all" && t.type !== feedbackServiceFilter) return false;
      if (feedbackDateFilter) {
        const ticketDate = new Date(t.feedback.createdAt);
        const filterDate = new Date(feedbackDateFilter);
        if (ticketDate.getFullYear() !== filterDate.getFullYear() || 
            ticketDate.getMonth() !== filterDate.getMonth() || 
            ticketDate.getDate() !== filterDate.getDate()) {
          return false;
        }
      }
      return true;
    });
    const dataMap = {};
    
    feedbacks.forEach(t => {
      const dateObj = new Date(t.feedback.createdAt);
      let key = dateObj.toLocaleDateString();
      let timestamp = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()).getTime();
      
      if (!dataMap[key]) {
        dataMap[key] = { key, count: 0, sum: 0, timestamp };
      }
      dataMap[key].count += 1;
      dataMap[key].sum += t.feedback.rating;
    });

    return Object.values(dataMap)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(item => ({
        name: item.key,
        averageRating: Number((item.sum / item.count).toFixed(1))
      }));
  };

  const getMultiSeriesLineChartData = () => {
    const formatMMDDYYYY = (date) => {
      if (!date) return "";
      const d = new Date(date);
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const y = d.getFullYear();
      return `${m}/${day}/${y}`;
    };

    const formatMonthYear = (date) => {
      if (!date) return "";
      const d = new Date(date);
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const y = d.getFullYear();
      return `${m}/${y}`;
    };

    // Find anchor reference date (prefer custom start date, else most recent feedback date, else today)
    let refDate = chartStartDate ? new Date(chartStartDate) : null;
    if (!refDate || isNaN(refDate.getTime())) {
      let latest = null;
      tickets.forEach(t => {
        let fb = t.feedback;
        if (typeof fb === "string") {
          try { fb = JSON.parse(fb); } catch (e) {}
        }
        if (fb && fb.rating) {
          const d = new Date(fb.createdAt || t.createdAt || Date.now());
          if (!latest || d > latest) latest = d;
        }
      });
      refDate = latest ? new Date(latest) : new Date();
    }

    const dateSlots = [];

    if (timeSeriesFilter === "weekly") {
      // Show all 7 days inside that week
      let weekStart;
      if (chartStartDate) {
        weekStart = new Date(chartStartDate);
      } else {
        // Monday-to-Sunday week containing refDate
        const day = refDate.getDay();
        const diff = refDate.getDate() - day + (day === 0 ? -6 : 1);
        weekStart = new Date(refDate);
        weekStart.setDate(diff);
      }
      weekStart.setHours(0, 0, 0, 0);

      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        dateSlots.push({
          date: d,
          key: formatMMDDYYYY(d),
          name: formatMMDDYYYY(d),
          timestamp: d.getTime()
        });
      }
    } else if (timeSeriesFilter === "monthly") {
      // Show all days inside the selected month
      const year = refDate.getFullYear();
      const month = refDate.getMonth();
      const totalDays = new Date(year, month + 1, 0).getDate();

      for (let day = 1; day <= totalDays; day++) {
        const d = new Date(year, month, day);
        d.setHours(0, 0, 0, 0);
        dateSlots.push({
          date: d,
          key: formatMMDDYYYY(d),
          name: formatMMDDYYYY(d),
          timestamp: d.getTime()
        });
      }
    } else if (timeSeriesFilter === "annual") {
      // Show all 12 months inside that year
      const year = refDate.getFullYear();
      for (let m = 0; m < 12; m++) {
        const d = new Date(year, m, 1);
        d.setHours(0, 0, 0, 0);
        const mKey = formatMonthYear(d);
        dateSlots.push({
          date: d,
          key: mKey,
          name: mKey,
          timestamp: d.getTime()
        });
      }
    } else {
      // Daily / Custom Date Range
      if (chartStartDate && chartEndDate) {
        const start = new Date(chartStartDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(chartEndDate);
        end.setHours(0, 0, 0, 0);
        let curr = new Date(start);
        while (curr <= end && dateSlots.length < 60) {
          dateSlots.push({
            date: new Date(curr),
            key: formatMMDDYYYY(curr),
            name: formatMMDDYYYY(curr),
            timestamp: curr.getTime()
          });
          curr.setDate(curr.getDate() + 1);
        }
      } else {
        // Default to the 7 days of the current week
        const day = refDate.getDay();
        const diff = refDate.getDate() - day + (day === 0 ? -6 : 1);
        const start = new Date(refDate);
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);
        for (let i = 0; i < 7; i++) {
          const d = new Date(start);
          d.setDate(start.getDate() + i);
          dateSlots.push({
            date: d,
            key: formatMMDDYYYY(d),
            name: formatMMDDYYYY(d),
            timestamp: d.getTime()
          });
        }
      }
    }

    const slotMap = {};
    dateSlots.forEach(slot => {
      slotMap[slot.key] = {
        ...slot,
        billingSum: 0, billingCount: 0,
        otherSum: 0, otherCount: 0,
        reconnSum: 0, reconnCount: 0
      };
    });

    tickets.forEach(t => {
      if (!t.feedback) return;
      let fb = t.feedback;
      if (typeof fb === "string") {
        try { fb = JSON.parse(fb); } catch (e) {}
      }
      if (!fb || !fb.rating) return;

      const originalDate = new Date(fb.createdAt || t.createdAt || Date.now());
      const rating = Number(fb.rating);
      const type = t.type || "billing";

      let matchKey = null;
      if (timeSeriesFilter === "annual") {
        const mKey = formatMonthYear(originalDate);
        if (slotMap[mKey]) matchKey = mKey;
      } else {
        const dayKey = formatMMDDYYYY(originalDate);
        if (slotMap[dayKey]) matchKey = dayKey;
      }

      if (matchKey && slotMap[matchKey]) {
        if (type === "billing" || type === "billing-dispute") {
          slotMap[matchKey].billingSum += rating;
          slotMap[matchKey].billingCount += 1;
        } else if (type === "other-billing") {
          slotMap[matchKey].otherSum += rating;
          slotMap[matchKey].otherCount += 1;
        } else if (type === "reconnection") {
          slotMap[matchKey].reconnSum += rating;
          slotMap[matchKey].reconnCount += 1;
        }
      }
    });

    return dateSlots.map(slot => {
      const s = slotMap[slot.key];
      return {
        name: slot.name,
        timestamp: slot.timestamp,
        "Billing Dispute": s.billingCount > 0 ? Number((s.billingSum / s.billingCount).toFixed(1)) : null,
        "Other Billing Issue": s.otherCount > 0 ? Number((s.otherSum / s.otherCount).toFixed(1)) : null,
        "Reconnection": s.reconnCount > 0 ? Number((s.reconnSum / s.reconnCount).toFixed(1)) : null,
      };
    });
  };

  const getRatingsDonutChartData = () => {
    // Reverting donut chart back to request trend
    const counts = { billing: 0, reconnection: 0, "other-billing": 0 };
    tickets.forEach(t => {
      const type = t.type || "billing";
      if (counts[type] !== undefined) counts[type] += 1;
      else counts.billing += 1;
    });
    return [
      { name: "Billing Dispute", value: counts.billing, color: "#3b82f6" },
      { name: "Reconnection", value: counts.reconnection, color: "#f59e0b" },
      { name: "Other Billing Issue", value: counts["other-billing"], color: "#8b5cf6" }
    ];
  };

  const getOverallRatingsStats = () => {
    let count = 0;
    let total = 0;
    const breakdown = {
      billing: { total: 0, count: 0 },
      reconnection: { total: 0, count: 0 },
      other: { total: 0, count: 0 }
    };

    tickets.forEach(t => {
      let fb = t.feedback;
      if (typeof fb === "string") {
        try { fb = JSON.parse(fb); } catch (e) {}
      }
      if (fb && fb.rating) {
        const r = Number(fb.rating);
        total += r;
        count += 1;
        const rawType = t.type || "other";
        const type = (rawType === "billing" || rawType === "billing-dispute") 
          ? "billing" 
          : (rawType === "reconnection" ? "reconnection" : "other");
        if (breakdown[type]) {
          breakdown[type].total += r;
          breakdown[type].count += 1;
        } else {
          breakdown.other.total += r;
          breakdown.other.count += 1;
        }
      }
    });

    const avg = count > 0 ? (total / count).toFixed(1) : "0.0";
    const percentage = count > 0 ? Math.round((total / (count * 5)) * 100) : 0;
    return { 
      avg, 
      percentage, 
      count,
      breakdown: {
        billing: breakdown.billing.count > 0 ? (breakdown.billing.total / breakdown.billing.count).toFixed(1) : "0.0",
        reconnection: breakdown.reconnection.count > 0 ? (breakdown.reconnection.total / breakdown.reconnection.count).toFixed(1) : "0.0",
        other: breakdown.other.count > 0 ? (breakdown.other.total / breakdown.other.count).toFixed(1) : "0.0"
      }
    };
  };

  const filteredFeedbacks = tickets
    .filter((t) => {
      let fb = t.feedback;
      if (typeof fb === "string") {
        try { fb = JSON.parse(fb); } catch (e) {}
      }
      return fb && fb.rating;
    })
    .map(t => {
      let fb = t.feedback;
      if (typeof fb === "string") {
        try { fb = JSON.parse(fb); } catch (e) {}
      }
      return { ...t, feedback: fb };
    })
    .filter((t) => feedbackRatingFilter === "all" || t.feedback.rating === parseInt(feedbackRatingFilter))
    .filter((t) => {
      if (feedbackServiceFilter === "all") return true;
      return t.type === feedbackServiceFilter;
    })
    .filter((t) => {
      if (!feedbackDateFilter) return true;
      const ticketDate = new Date(t.feedback.createdAt);
      const filterDate = new Date(feedbackDateFilter);
      return ticketDate.getFullYear() === filterDate.getFullYear() && 
             ticketDate.getMonth() === filterDate.getMonth() && 
             ticketDate.getDate() === filterDate.getDate();
    })
    .sort((a, b) => new Date(b.feedback.createdAt) - new Date(a.feedback.createdAt));

  return <div className="min-h-screen bg-[#F8F6F2] py-8">
      <div className="container mx-auto px-4 max-w-7xl space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Admin Control Center</h1>
        <p className="text-slate-500">Manage consumer requests and cooperative announcements</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white border p-1 rounded-xl flex-wrap h-auto gap-1">
          <TabsTrigger value="analytics" className="gap-2 rounded-lg">
            <BarChart3 className="h-4 w-4" /> Analytics
          </TabsTrigger>
          <TabsTrigger value="tickets" className="gap-2 rounded-lg relative">
            <Ticket className="h-4 w-4" /> 
            <span>Ticket Management</span>
            {pendingTicketsCount > 0 && (
              <span className="flex h-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white shadow-sm">
                {pendingTicketsCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2 rounded-lg">
            <Users className="h-4 w-4" /> Users
          </TabsTrigger>
          <TabsTrigger value="announcements" className="gap-2 rounded-lg">
            <Megaphone className="h-4 w-4" /> Announcements
          </TabsTrigger>
          <TabsTrigger value="feedbacks" className="gap-2 rounded-lg relative">
            <Star className="h-4 w-4" /> 
            <span>Feedbacks</span>
            {newFeedbacksCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold h-5 min-w-[20px] flex items-center justify-center rounded-full px-1.5 shadow-sm border-2 border-white animate-in zoom-in duration-300">
                {newFeedbacksCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2 rounded-lg">
            <Settings className="h-4 w-4" /> Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
    { label: "Total Tickets", value: stats.total, icon: <Ticket className="h-5 w-5" />, color: "bg-slate-100 text-slate-600" },
    { label: "Urgent", value: stats.urgent, icon: <AlertCircle className="h-5 w-5" />, color: "bg-red-100 text-red-600" },
    { label: "Pending", value: stats.pending, icon: <Clock className="h-5 w-5" />, color: "bg-yellow-100 text-yellow-600" },
    { label: "In Progress", value: stats.reviewing + stats.dispatched, icon: <Truck className="h-5 w-5" />, color: "bg-blue-100 text-blue-600" },
    { label: "Resolved", value: stats.resolved, icon: <CheckCircle2 className="h-5 w-5" />, color: "bg-green-100 text-green-600" }
  ].map((stat, i) => <Card key={i} className="border-slate-100 shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                      <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                    </div>
                    <div className={cn("p-3 rounded-xl", stat.color)}>
                      {stat.icon}
                    </div>
                  </div>
                </CardContent>
              </Card>)}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-slate-100 shadow-sm">
              <CardHeader>
                <CardTitle>Ticket Status Distribution</CardTitle>
                <CardDescription>Real-time volume of requests by status</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                    <Tooltip
    contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
    cursor={{ fill: "#f8fafc" }}
  />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-slate-100 shadow-sm">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest updates from consumers</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[260px]">
                  <div className="space-y-4">
                    {tickets.slice(0, 5).map((ticket) => <div key={ticket.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                        <div className={cn(
    "h-10 w-10 rounded-full flex items-center justify-center",
    ticket.type === "billing" ? "bg-blue-100 text-blue-600" : ticket.type === "other-billing" ? "bg-purple-100 text-purple-600" : "bg-orange-100 text-orange-600"
  )}>
                          {ticket.type === "billing" ? <FileText className="h-5 w-5" /> : ticket.type === "other-billing" ? <HelpCircle className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
                        </div>
                        <div className="flex-grow">
                          <p className="text-sm font-bold text-slate-900">{ticket.consumerName}</p>
                          <p className="text-xs text-slate-500">{ticket.category}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                          {ticket.status}
                        </Badge>
                      </div>)}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>


        </TabsContent>

        <TabsContent value="tickets" className="space-y-6">
          
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                SORECO-1 Consumer Request Management
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Real-time tracking, prioritization, and management of member-consumer requests.
              </p>
            </div>
            <div className="text-xs text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 font-mono self-start md:self-auto">
              Total Requests: <span className="font-bold text-slate-700">{tickets.length}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setStatusTab(statusTab === "pending" ? "all" : "pending")}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border shadow-sm",
                statusTab === "pending"
                  ? "bg-amber-600 text-white border-amber-600 ring-2 ring-amber-200"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <span>Pending</span>
              <span className={cn("px-2 py-0.5 rounded-full text-xs font-extrabold", statusTab === "pending" ? "bg-white/20 text-white" : "bg-amber-50 text-amber-800")}>
                {stats.pending}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusTab(statusTab === "reviewing" ? "all" : "reviewing")}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border shadow-sm",
                statusTab === "reviewing"
                  ? "bg-blue-600 text-white border-blue-600 ring-2 ring-blue-200"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <span>Reviewing</span>
              <span className={cn("px-2 py-0.5 rounded-full text-xs font-extrabold", statusTab === "reviewing" ? "bg-white/20 text-white" : "bg-blue-50 text-blue-700")}>
                {stats.reviewing}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusTab(statusTab === "resolved" ? "all" : "resolved")}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border shadow-sm",
                statusTab === "resolved"
                  ? "bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-200"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <span>Resolved</span>
              <span className={cn("px-2 py-0.5 rounded-full text-xs font-extrabold", statusTab === "resolved" ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700")}>
                {stats.resolved}
              </span>
            </button>

            {(statusTab !== "all" || typeFilter !== "all" || searchFilter || urlBarangay) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusTab("all");
                  setTypeFilter("all");
                  setSearchFilter("");
                  setStartDate("");
                  setEndDate("");
                  if (urlBarangay) navigate("/admin");
                }}
                className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 ml-auto"
              >
                Reset Filters
              </Button>
            )}
          </div>

          <Card className="border-slate-100 shadow-sm p-4 space-y-4 bg-white">
            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="🔍 Search consumer name or account number..."
                className="pl-10 bg-slate-50/60 border-slate-200 h-10 text-sm focus:bg-white transition-colors"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
              
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                  brgy <span className="text-slate-400">▼</span>
                </label>
                <div 
                  onClick={() => navigate('/barangays')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 cursor-pointer flex items-center justify-between hover:bg-slate-100 transition-colors"
                >
                  <span className="truncate">{urlBarangay || "Barangay"}</span>
                  {urlBarangay && (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/admin');
                      }}
                      className="text-slate-400 hover:text-red-500 rounded-full ml-2 w-4 h-4 flex items-center justify-center font-bold"
                    >
                      ×
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                  Type <span className="text-slate-400">▼</span>
                </label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="all">All Types</option>
                  <option value="billing">Billing Dispute</option>
                  <option value="other-billing">Other Billing Issue</option>
                  <option value="reconnection">Reconnection</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                  Date <span className="text-slate-400">▼</span>
                </label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={dateSort}
                  onChange={(e) => setDateSort(e.target.value)}
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>
            </div>
          </Card>

          <Card className="border-slate-100 shadow-sm overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-slate-50/90 border-b border-slate-200">
                <TableRow>
                  <TableHead className="font-bold text-slate-800 text-xs uppercase tracking-wider py-3.5">Consumer</TableHead>
                  <TableHead className="font-bold text-slate-800 text-xs uppercase tracking-wider py-3.5">Type</TableHead>
                  <TableHead className="font-bold text-slate-800 text-xs uppercase tracking-wider py-3.5">Status</TableHead>
                  <TableHead className="font-bold text-slate-800 text-xs uppercase tracking-wider py-3.5">Age</TableHead>
                  <TableHead className="text-right font-bold text-slate-800 text-xs uppercase tracking-wider py-3.5">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                    
                    <TableCell className="py-4">
                      <div className="font-bold text-slate-900 text-base">
                        {ticket.consumerName}
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        Acc {ticket.accountNumber || "N/A"}
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      <span className="text-sm font-semibold text-slate-800 capitalize">
                        {ticket.type || ticket.category || "General"}
                      </span>
                    </TableCell>

                    <TableCell className="py-4">
                      <Badge className={cn(
                        "capitalize px-3 py-1 text-xs font-bold rounded-md shadow-none",
                        ticket.status === "pending" && "bg-amber-100 text-amber-800 hover:bg-amber-100",
                        ticket.status === "reviewing" && "bg-blue-100 text-blue-800 hover:bg-blue-100",
                        ticket.status === "dispatched" && "bg-purple-100 text-purple-800 hover:bg-purple-100",
                        ticket.status === "resolved" && "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                      )}>
                        {ticket.status === "pending" ? "Pending" : ticket.status === "reviewing" ? "Reviewing" : ticket.status === "dispatched" ? "Crew Dispatched" : "Resolved"}
                      </Badge>
                    </TableCell>

                    <TableCell className="py-4 text-xs font-medium text-slate-600 whitespace-nowrap">
                      {getRelativeAge(ticket.createdAt)}
                    </TableCell>

                    <TableCell className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs font-bold px-2.5 border-indigo-200 text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 rounded-lg shadow-sm"
                          onClick={() => openConsumerHistory({
                            fullName: ticket.consumerName,
                            consumerName: ticket.consumerName,
                            accountNumber: ticket.accountNumber
                          })}
                          title="View Consumer Past Transaction History"
                        >
                          <History className="h-3.5 w-3.5 mr-1" />
                          History
                        </Button>
                        <Link to={`/ticket/${ticket.id}`}>
                          <Button variant="default" size="sm" className="h-8 text-xs font-bold px-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-sm">
                            Manage
                          </Button>
                        </Link>
                        <Button 
                          variant="destructive" 
                          size="icon" 
                          className="h-8 w-8 rounded-lg shadow-sm bg-red-500 hover:bg-red-600"
                          onClick={() => setTicketToDelete(ticket)}
                          title="Delete Ticket"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {filteredTickets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                      No requests matching your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="announcements" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-4 border-slate-100 shadow-sm h-fit">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-t-xl py-5">
                <CardTitle className="text-white flex items-center gap-2">
                  <Megaphone className="h-5 w-5" /> New Public Notice
                </CardTitle>
                <CardDescription className="text-orange-100 text-xs">
                  Broadcast maintenance advisories or urgent news to consumers
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleAddAnnouncement} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-xs font-semibold text-slate-700">Notice Headline</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Scheduled Feeder Maintenance - Zone 3 & 4"
                      required
                      value={newAnnouncement.title}
                      onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                      className="text-sm focus-visible:ring-orange-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content" className="text-xs font-semibold text-slate-700">Full Announcement Content</Label>
                    <Textarea
                      id="content"
                      placeholder="Specify affected barangays, duration, restoration estimates, and precautionary measures..."
                      className="min-h-[140px] text-sm focus-visible:ring-orange-500"
                      required
                      value={newAnnouncement.content}
                      onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                    />
                  </div>
                  <Button type="submit" className="w-full bg-[#E65100] hover:bg-[#D84315] text-white font-bold h-11 rounded-xl shadow-md">
                    <Plus className="h-4 w-4 mr-2" /> Publish Notice
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="lg:col-span-8 border-slate-100 shadow-sm">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <span>Manage Public Announcements</span>
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                      {announcements.length} {announcements.length === 1 ? "Notice" : "Notices"}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Drag items or click arrows to sort how notices display on the Landing Page
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {announcements.map((ann, index) => (
                    <div
                      key={ann.id}
                      draggable
                      onDragStart={(e) => handleAnnouncementDragStart(index, e)}
                      onDragOver={(e) => handleAnnouncementDragOver(index, e)}
                      onDrop={(e) => handleAnnouncementDrop(index, e)}
                      className={cn(
                        "p-4 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white",
                        draggedAnnouncementIndex === index 
                          ? "opacity-50 border-dashed border-orange-500 bg-orange-50/40 shadow-inner" 
                          : "border-slate-200 hover:border-orange-300 hover:shadow-md"
                      )}
                    >
                      {/* Left: Drag Handle & Ordering Info */}
                      <div className="flex items-start sm:items-center gap-3 w-full sm:w-auto">
                        <div 
                          className="cursor-grab active:cursor-grabbing p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0 transition-colors"
                          title="Drag to reorder"
                        >
                          <GripVertical className="h-5 w-5" />
                        </div>

                        <span className="h-6 w-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">
                          #{index + 1}
                        </span>

                        <div className="space-y-1 min-w-0 flex-1">
                          <h4 className="font-bold text-slate-900 text-sm leading-tight line-clamp-1">{ann.title}</h4>
                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{ann.content}</p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            Published: {ann.createdAt ? new Date(ann.createdAt).toLocaleString() : "Just now"}
                          </p>
                        </div>
                      </div>

                      {/* Right: Actions (Move up/down, Edit, Delete) */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={index === 0}
                          onClick={() => handleMoveAnnouncement(index, -1)}
                          className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                          title="Move up"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={index === announcements.length - 1}
                          onClick={() => handleMoveAnnouncement(index, 1)}
                          className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                          title="Move down"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>

                        {/* Working Edit Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditAnnouncement(ann)}
                          className="h-8 text-xs font-semibold gap-1.5 border-slate-200 text-slate-700 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 rounded-lg"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>

                        {/* Delete Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteAnnouncement(ann.id)}
                          title="Delete notice"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {announcements.length === 0 && (
                    <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm">
                      <Megaphone className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                      No announcements published yet. Use the form on the left to broadcast your first advisory.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Working Edit Announcement Modal */}
          <Dialog open={!!editingAnnouncement} onOpenChange={(open) => !open && setEditingAnnouncement(null)}>
            <DialogContent className="sm:max-w-[550px] bg-white rounded-2xl p-6">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Pencil className="h-5 w-5 text-orange-600" /> Edit Announcement
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Update the headline and detailed content for this notice. Changes take effect on the landing page immediately.
                </DialogDescription>
              </DialogHeader>

              {editingAnnouncement && (
                <form onSubmit={handleSaveEditAnnouncement} className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-title" className="text-xs font-semibold text-slate-700">Notice Headline</Label>
                    <Input
                      id="edit-title"
                      required
                      value={editingAnnouncement.title}
                      onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, title: e.target.value })}
                      className="text-sm focus-visible:ring-orange-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-content" className="text-xs font-semibold text-slate-700">Detailed Information</Label>
                    <Textarea
                      id="edit-content"
                      required
                      className="min-h-[160px] text-sm focus-visible:ring-orange-500"
                      value={editingAnnouncement.content}
                      onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, content: e.target.value })}
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditingAnnouncement(null)}
                      className="rounded-xl"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-[#E65100] hover:bg-[#D84315] text-white font-bold rounded-xl shadow-md"
                    >
                      <Save className="h-4 w-4 mr-1.5" /> Save Changes
                    </Button>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="feedbacks" className="space-y-6">
          {/* Multi-Series Time-Series Line Chart Card */}
          <Card className="border-slate-100 shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
              <div>
                <CardTitle className="text-xl font-bold text-slate-900 tracking-wider uppercase">Average Ratings by Service</CardTitle>
                <div className="flex items-center gap-2 mt-2 mb-1">
                  <h2 className="text-2xl font-semibold text-slate-800">
                    {(() => {
                      const data = getMultiSeriesLineChartData();
                      if (data.length === 0) return "No data available";
                      if (timeSeriesFilter === "annual") {
                        const yr = data[0].name.split("/")[1] || new Date().getFullYear();
                        return `(01/01/${yr}) - (12/31/${yr})`;
                      }
                      const first = data[0].name;
                      const last = data[data.length - 1].name;
                      if (first === last) return `(${first})`;
                      return `(${first}) - (${last})`;
                    })()}
                  </h2>
                </div>
                <CardDescription className="text-slate-500 font-medium mt-2">Tracking average feedback ratings (0-5 stars) across different service types.</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md p-1 px-2">
                  <span>Custom:</span>
                  <input 
                    type="date" 
                    className="bg-transparent border-none outline-none text-slate-800 focus:ring-0 p-0 text-xs w-[100px]"
                    value={chartStartDate}
                    onChange={(e) => setChartStartDate(e.target.value)}
                  />
                  <span>-</span>
                  <input 
                    type="date" 
                    className="bg-transparent border-none outline-none text-slate-800 focus:ring-0 p-0 text-xs w-[100px]"
                    value={chartEndDate}
                    onChange={(e) => setChartEndDate(e.target.value)}
                  />
                  {(chartStartDate || chartEndDate) && (
                    <button
                      type="button"
                      onClick={() => {
                        setChartStartDate("");
                        setChartEndDate("");
                      }}
                      className="text-slate-400 hover:text-slate-600 font-bold ml-1"
                      title="Clear custom dates"
                    >
                      ×
                    </button>
                  )}
                </div>
                <Select value={timeSeriesFilter} onValueChange={setTimeSeriesFilter}>
                  <SelectTrigger className="w-[110px] text-xs h-8">
                    <SelectValue placeholder="Time Period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getMultiSeriesLineChartData()} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: timeSeriesFilter === "monthly" ? 10 : 12, fill: "#64748b" }} 
                    dy={10} 
                    interval={timeSeriesFilter === "monthly" ? "preserveStartEnd" : 0}
                  />
                  <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} dx={-10} />
                  <Tooltip 
                    labelFormatter={(label) => `Date: ${label}`}
                    formatter={(value, name) => [value !== null ? `${value} ★` : "No ratings", name]}
                    contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} 
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Line connectNulls type="monotone" dataKey="Billing Dispute" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 1.5, fill: "#3b82f6" }} activeDot={{ r: 6 }} />
                  <Line connectNulls type="monotone" dataKey="Other Billing Issue" stroke="#a855f7" strokeWidth={3} dot={{ r: 4, strokeWidth: 1.5, fill: "#a855f7" }} activeDot={{ r: 6 }} />
                  <Line connectNulls type="monotone" dataKey="Reconnection" stroke="#f97316" strokeWidth={3} dot={{ r: 4, strokeWidth: 1.5, fill: "#f97316" }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Donut Chart & Overall Ratings Card Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-slate-100 shadow-sm">
              <CardHeader>
                <CardTitle>Frequent Request Distribution</CardTitle>
                <CardDescription>Percentage breakdown of frequent requests for the three services</CardDescription>
              </CardHeader>
              <CardContent className="h-[280px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getRatingsDonutChartData()}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {getRatingsDonutChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-8 text-white shadow-xl flex flex-col justify-between">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-100">Overall Rating Score</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-black font-poppins">{getOverallRatingsStats().avg}</span>
                  <span className="text-2xl font-bold text-amber-200">/ 5.0</span>
                </div>
                <div className="flex gap-1 pt-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} className="text-amber-200 text-lg">★</span>
                  ))}
                </div>
              </div>

              {/* Service Average Breakdown Matching Landing Page Metrics */}
              {(() => {
                const stats = getOverallRatingsStats();
                return (
                  <div className="grid grid-cols-3 gap-2.5 my-4">
                    <div className="bg-white/15 backdrop-blur-xs border border-white/20 rounded-2xl p-2.5 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-100 truncate">Billing Dispute</p>
                      <div className="flex items-center justify-center gap-1 my-0.5">
                        <span className="text-xl font-black font-poppins text-white">{stats.breakdown?.billing || "0.0"}</span>
                        <span className="text-amber-200 text-sm">★</span>
                      </div>
                      <p className="text-[9px] text-amber-100/80 font-medium">Average Rating</p>
                    </div>
                    <div className="bg-white/15 backdrop-blur-xs border border-white/20 rounded-2xl p-2.5 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-100 truncate">Reconnection</p>
                      <div className="flex items-center justify-center gap-1 my-0.5">
                        <span className="text-xl font-black font-poppins text-white">{stats.breakdown?.reconnection || "0.0"}</span>
                        <span className="text-amber-200 text-sm">★</span>
                      </div>
                      <p className="text-[9px] text-amber-100/80 font-medium">Average Rating</p>
                    </div>
                    <div className="bg-white/15 backdrop-blur-xs border border-white/20 rounded-2xl p-2.5 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-100 truncate">Other Issues</p>
                      <div className="flex items-center justify-center gap-1 my-0.5">
                        <span className="text-xl font-black font-poppins text-white">{stats.breakdown?.other || "0.0"}</span>
                        <span className="text-amber-200 text-sm">★</span>
                      </div>
                      <p className="text-[9px] text-amber-100/80 font-medium">Average Rating</p>
                    </div>
                  </div>
                );
              })()}

              <div className="mt-4 pt-4 border-t border-white/20 space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span>Satisfaction Rate</span>
                  <span className="font-bold">{getOverallRatingsStats().percentage}%</span>
                </div>
                <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                  <div className="bg-white h-full rounded-full transition-all duration-500" style={{ width: `${getOverallRatingsStats().percentage}%` }} />
                </div>
                <p className="text-[11px] text-amber-100 pt-1">Based on {getOverallRatingsStats().count} verified resolved consumer tickets.</p>
              </div>
            </div>
          </div>

          <Card className="border-slate-100 shadow-sm overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
              <div>
                <CardTitle>Consumer Feedbacks</CardTitle>
                <CardDescription>Review ratings and comments from resolved tickets</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={feedbackServiceFilter} onValueChange={setFeedbackServiceFilter}>
                  <SelectTrigger className="w-full sm:w-[220px]">
                    <SelectValue placeholder="Filter by service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Services</SelectItem>
                    <SelectItem value="billing">Billing Error / Discrepancy</SelectItem>
                    <SelectItem value="reconnection">Reconnection Service</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={feedbackRatingFilter} onValueChange={setFeedbackRatingFilter}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue placeholder="Filter by rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ratings</SelectItem>
                    <SelectItem value="5">5 Stars</SelectItem>
                    <SelectItem value="4">4 Stars</SelectItem>
                    <SelectItem value="3">3 Stars</SelectItem>
                    <SelectItem value="2">2 Stars</SelectItem>
                    <SelectItem value="1">1 Star</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredFeedbacks.length > 0 ? filteredFeedbacks.map((ticket) => <div key={ticket.id} className="p-4 border rounded-xl bg-slate-50/50 flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-slate-900">{ticket.consumerName}</h4>
                          <p className="text-xs text-slate-500">Ticket: {ticket.category} (#{ticket.id.substring(0, 8).toUpperCase()})</p>
                        </div>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((s) => <Star
    key={s}
    className={cn(
      "h-4 w-4",
      s <= ticket.feedback.rating ? "text-yellow-500 fill-yellow-500" : "text-slate-200"
    )}
  />)}
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 italic">"{ticket.feedback.comment}"</p>
                      <div className="flex justify-between items-center">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                          Submitted: {new Date(ticket.feedback.createdAt).toLocaleString()}
                        </p>
                        <Link to={`/ticket/${ticket.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 text-[10px]">View Ticket</Button>
                        </Link>
                      </div>

                      {ticket.feedback.adminResponse ? (
                        <div className="mt-2 p-3 bg-blue-50/80 border border-blue-100 rounded-lg text-xs space-y-1">
                          <p className="font-bold text-blue-900 flex items-center gap-1.5">
                            <MessageSquare className="h-3.5 w-3.5 text-blue-600" /> Admin Official Response:
                          </p>
                          <p className="text-slate-700">{ticket.feedback.adminResponse}</p>
                        </div>
                      ) : (
                        <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center gap-2">
                          <Input
                            placeholder="Type official admin response to this feedback..."
                            className="text-xs h-8 bg-white"
                            id={`reply-input-${ticket.id}`}
                            defaultValue=""
                          />
                          <Button
                            size="sm"
                            className="h-8 bg-gradient-to-br from-amber-500 to-orange-600 hover:opacity-90 text-xs text-white shrink-0"
                            onClick={async () => {
                              const inputEl = document.getElementById(`reply-input-${ticket.id}`);
                              const text = inputEl ? inputEl.value.trim() : "";
                              if (!text) return;
                              try {
                                const updatedFeedback = {
                                  ...ticket.feedback,
                                  adminResponse: text,
                                  adminResponseAt: new Date().toISOString()
                                };
                                await api.tickets.update(ticket.id, { feedback: updatedFeedback });
                                setTickets(tickets.map(t => t.id === ticket.id ? { ...t, feedback: updatedFeedback } : t));
                                toast.success("Admin response sent successfully!");
                              } catch (err) {
                                toast.error("Failed to send response");
                              }
                            }}
                          >
                            Send Response
                          </Button>
                        </div>
                      )}
                    </div>) : <div className="text-center py-12 text-slate-400">
                    No feedbacks found for this filter.
                  </div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-slate-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" /> System & Contact Settings
                </CardTitle>
                <CardDescription>
                  Configure cooperative branding, hotlines, email, social media links, and address. Updates automatically across the Landing Page and Consumer Footer.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                <div className="space-y-3 pb-6 border-b border-slate-100">
                  <Label className="font-bold text-slate-800">Cooperative Logo & Branding</Label>
                  <div className="flex flex-col sm:flex-row items-center gap-6 p-5 border-2 border-dashed rounded-xl bg-slate-50/80">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo Preview" className="h-24 w-24 object-contain rounded-lg border border-slate-200 bg-white p-2" />
                    ) : (
                      <div className="h-24 w-24 bg-slate-200/80 rounded-lg flex items-center justify-center text-slate-400">
                        <ImageIcon className="h-10 w-10" />
                      </div>
                    )}
                    <div className="space-y-2 text-center sm:text-left">
                      <div className="flex gap-2 justify-center sm:justify-start">
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs font-bold"
                        >
                          Change Logo
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleLogoChange}
                        />
                        {logoPreview && (
                          <Button variant="ghost" size="sm" onClick={() => setLogoPreview(null)} className="text-red-500 text-xs">
                            Remove
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        Appears on the navigation bar, official reports, and consumer footers.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="settingPhoneNumber" className="font-bold text-slate-800 flex items-center gap-2 text-xs">
                    <Phone className="h-4 w-4 text-primary" /> Hotline / Phone Numbers
                  </Label>
                  <input
                    id="settingPhoneNumber"
                    type="text"
                    className="w-full h-10 px-3.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                    placeholder="e.g. (056) 555-0199 / +63 917-888-2626"
                    value={settingPhoneNumber}
                    onChange={(e) => setSettingPhoneNumber(e.target.value)}
                  />
                  <p className="text-[11px] text-slate-400">Displayed in consumer footer, contact support cards, and landing page.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="settingEmail" className="font-bold text-slate-800 flex items-center gap-2 text-xs">
                    <Mail className="h-4 w-4 text-primary" /> Support / General Email Address
                  </Label>
                  <input
                    id="settingEmail"
                    type="email"
                    className="w-full h-10 px-3.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                    placeholder="e.g. info@soreco1.com.ph"
                    value={settingEmail}
                    onChange={(e) => setSettingEmail(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="settingFacebookUrl" className="font-bold text-slate-800 flex items-center gap-2 text-xs">
                      <Facebook className="h-4 w-4 text-blue-600" /> Official Facebook Page Link
                    </Label>
                    <input
                      id="settingFacebookUrl"
                      type="text"
                      className="w-full h-10 px-3.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                      placeholder="e.g. https://facebook.com/soreco1"
                      value={settingFacebookUrl}
                      onChange={(e) => setSettingFacebookUrl(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="settingWebsiteUrl" className="font-bold text-slate-800 flex items-center gap-2 text-xs">
                      <Globe className="h-4 w-4 text-primary" /> Official Cooperative Website Link
                    </Label>
                    <input
                      id="settingWebsiteUrl"
                      type="text"
                      className="w-full h-10 px-3.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                      placeholder="e.g. https://soreco1.com.ph"
                      value={settingWebsiteUrl}
                      onChange={(e) => setSettingWebsiteUrl(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="settingAddress" className="font-bold text-slate-800 flex items-center gap-2 text-xs">
                    <MapPin className="h-4 w-4 text-amber-600" /> Main Office Physical Address
                  </Label>
                  <input
                    id="settingAddress"
                    type="text"
                    className="w-full h-10 px-3.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                    placeholder="e.g. Zone-5, Immaculada Concepcion Street, Bulan, Sorsogon"
                    value={settingAddress}
                    onChange={(e) => setSettingAddress(e.target.value)}
                  />
                </div>

                <Button
                  onClick={handleUpdateSettings}
                  className="w-full bg-gradient-to-br from-amber-500 to-orange-600 hover:opacity-90 font-bold text-xs h-11 rounded-xl shadow-sm gap-2"
                  disabled={isUpdatingSettings}
                >
                  {isUpdatingSettings ? <Clock className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save System & Contact Settings
                </Button>
              </CardContent>
            </Card>

            <Card className="border-slate-100 shadow-sm bg-slate-900 text-white flex flex-col justify-between">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-amber-400 flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Live Consumer View Preview
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Real-time preview of how your contact details and social media links render for consumers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 text-xs text-slate-300">
                <div className="p-4 bg-slate-800/80 border border-slate-700/80 rounded-xl space-y-3">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Footer Contact Strip</p>
                  <div className="flex items-start gap-2.5">
                    <MapPin className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <span className="text-slate-200 leading-tight">{settingAddress || "Not specified"}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span className="font-mono font-semibold text-slate-200">{settingPhoneNumber || "Not specified"}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Mail className="h-4 w-4 text-blue-400 shrink-0" />
                    <span className="text-slate-200">{settingEmail || "Not specified"}</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-800/80 border border-slate-700/80 rounded-xl space-y-3">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Social Media & Web Shortcuts</p>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={settingFacebookUrl || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 font-semibold text-xs"
                    >
                      <Facebook className="h-3.5 w-3.5" /> Facebook Page
                    </a>
                    <a
                      href={settingWebsiteUrl || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 font-semibold text-xs"
                    >
                      <Globe className="h-3.5 w-3.5" /> Portal Website
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">User Management System</h2>
              <p className="text-sm text-slate-500">Register new consumers, authorize administrators, and view account directories.</p>
            </div>
            
            <Dialog open={isCreatingUser} onOpenChange={setIsCreatingUser}>
              <DialogTrigger render={<Button className="bg-gradient-to-br from-amber-500 to-orange-600 hover:opacity-90 gap-2">
                  <UserPlus className="h-4 w-4" /> Add New User
                </Button>} />
              <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-primary" /> Register New Account
                  </DialogTitle>
                  <DialogDescription>
                    Create a new administrator or consumer profile. Backed up to local database automatically.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateUserSubmit} className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="create-name">Full Name</Label>
                      <Input
    id="create-name"
    placeholder="John Doe"
    required
    value={newUser.fullName}
    onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
  />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="create-email">Email Address</Label>
                      <Input
    id="create-email"
    type="email"
    placeholder="john@example.com"
    required
    value={newUser.email}
    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
  />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="create-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
    id="create-password"
    type="password"
    placeholder="••••••••"
    className="pl-10"
    required
    value={newUser.password}
    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
  />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-role">Role</Label>
                      <select
    id="create-role"
    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    value={newUser.role}
    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
  >
                        <option value="consumer">Consumer</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-account">Account Number</Label>
                      <Input
    id="create-account"
    placeholder="01-2345-6789"
    value={newUser.accountNumber}
    onChange={(e) => setNewUser({ ...newUser, accountNumber: e.target.value })}
  />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="create-phone">Phone Number</Label>
                      <Input
    id="create-phone"
    placeholder="09123456789"
    value={newUser.phoneNumber}
    onChange={(e) => setNewUser({ ...newUser, phoneNumber: e.target.value })}
  />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="create-address">Service Address</Label>
                      <Textarea
    id="create-address"
    placeholder="Sorsogon City, Philippines"
    rows={2}
    value={newUser.address}
    onChange={(e) => setNewUser({ ...newUser, address: e.target.value })}
  />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsCreatingUser(false)}>Cancel</Button>
                    <Button type="submit" className="bg-gradient-to-br from-amber-500 to-orange-600 hover:opacity-90">Register Account</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 bg-slate-50/50 border-b flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative flex-grow max-w-md w-full">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
    placeholder="Search users by name, email, account no..."
    className="pl-10 bg-white"
    value={userSearchFilter}
    onChange={(e) => setUserSearchFilter(e.target.value)}
  />
              </div>
              
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-full md:w-auto">
                  <Filter className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-500 mr-1 text-xs font-medium">Role:</span>
                  <select
      className="bg-transparent border-none outline-none text-sm font-medium cursor-pointer"
      value={userRoleFilter}
      onChange={(e) => setUserRoleFilter(e.target.value)}
    >
                    <option value="all">All Roles</option>
                    <option value="admin">Administrators</option>
                    <option value="consumer">Consumers</option>
                  </select>
                </div>

                {urlBarangay && (
                  <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-800 rounded-lg px-3 py-1.5 text-sm font-medium w-full md:w-auto">
                    <span>Brgy: {urlBarangay}</span>
                    <button onClick={() => navigate('/admin')} className="text-orange-600 hover:text-orange-900 font-bold ml-1">
                      ×
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User Profile</TableHead>
                    <TableHead>Account No.</TableHead>
                    <TableHead>Contact Details</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
    const filteredUsers = users.filter((u) => {
      const searchLower = userSearchFilter.toLowerCase();
      const matchesSearch = !userSearchFilter || (u.fullName && u.fullName.toLowerCase().includes(searchLower)) || (u.email && u.email.toLowerCase().includes(searchLower)) || (u.accountNumber && u.accountNumber.toLowerCase().includes(searchLower)) || (u.phoneNumber && u.phoneNumber.toLowerCase().includes(searchLower));
      const matchesRole = userRoleFilter === "all" || u.role === userRoleFilter;
      const matchesBarangay = !urlBarangay || (u.address && u.address.toLowerCase().includes(urlBarangay.toLowerCase()));
      return matchesSearch && matchesRole && matchesBarangay;
    });
    return filteredUsers.map((u, idx) => {
      const initials = u.fullName ? u.fullName.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase() : "US";
      const isCurrentUser = u.email === "admin@gov.ph" || u.email === "janry.maligaso@sorsu.edu.ph";
      const rowKey = u.id ? `${u.id}-${idx}` : `user-${idx}`;
      return <TableRow key={rowKey} className="hover:bg-slate-50/50">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 border text-sm">
                                {u.profileImage ? <img src={u.profileImage} alt={u.fullName} className="h-full w-full rounded-full object-cover" /> : initials}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900">{u.fullName}</div>
                                <div className="text-xs text-slate-500 flex items-center gap-1">
                                  <Mail className="h-3 w-3 text-slate-400" /> {u.email}
                                </div>
                                {u.role !== "admin" && (
                                  u.hasUnpaidBill ? (
                                    <Badge variant="destructive" className="mt-1 text-[10px] bg-red-100 text-red-700 hover:bg-red-200 border-none font-bold inline-flex items-center gap-1">
                                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Disconnected to the Service
                                    </Badge>
                                  ) : (
                                    <Badge className="mt-1 text-[10px] bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none font-bold inline-flex items-center gap-1">
                                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Connected
                                    </Badge>
                                  )
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {u.accountNumber ? <code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                                {u.accountNumber}
                              </code> : <span className="text-xs text-slate-400 italic">None</span>}
                          </TableCell>
                          <TableCell>
                            <div className="text-xs space-y-1 text-slate-600">
                              {u.phoneNumber && <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3 text-slate-400" /> {u.phoneNumber}
                                </div>}
                              {u.address && <div className="flex items-center gap-1 max-w-[200px] truncate">
                                  <MapPin className="h-3 w-3 text-slate-400" /> {u.address}
                                </div>}
                              {!u.phoneNumber && !u.address && <span className="text-slate-400 italic">Not provided</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn(
        "capitalize gap-1.5",
        u.role === "admin" ? "bg-red-50 text-red-700 hover:bg-red-50 border-red-200" : "bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-200"
      )} variant="outline">
                              {u.role === "admin" ? <Shield className="h-3 w-3" /> : null}
                              {u.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "Initial Setup"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openConsumerHistory(u)}
                                title="View Consumer Past Transaction History"
                                className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                              >
                                <History className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditUser(u)}
                                title="Edit User"
                              >
                                <Edit className="h-4 w-4 text-slate-500 hover:text-slate-700" />
                              </Button>
                              <Button
        variant="ghost"
        size="icon"
        onClick={() => handleDeleteUser(u.id)}
        disabled={isCurrentUser}
        title={isCurrentUser ? "Cannot delete critical system administrator" : "Delete User"}
        className={isCurrentUser ? "opacity-50 cursor-not-allowed" : "text-slate-400 hover:text-red-600 hover:bg-red-50"}
      >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>;
    });
  })()}
                  {users.length === 0 && <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                        No users registered matching the filter criteria.
                      </TableCell>
                    </TableRow>}
                </TableBody>
              </Table>
            </div>
          </Card>

          <Dialog open={editingUser !== null} onOpenChange={(open) => !open && setEditingUser(null)}>
            {editingUser && <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Edit className="h-5 w-5 text-primary" /> Modify User Profile
                  </DialogTitle>
                  <DialogDescription>
                    Update details for {editingUser.fullName}. Changes are pushed live immediately.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleUpdateUserSubmit} className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="edit-name">Full Name</Label>
                      <Input
    id="edit-name"
    required
    value={editingUser.fullName || ""}
    onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
  />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="edit-email">Email Address</Label>
                      <Input
    id="edit-email"
    type="email"
    required
    value={editingUser.email || ""}
    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
  />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-role">Role</Label>
                      <select
    id="edit-role"
    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    value={editingUser.role || "consumer"}
    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
  >
                        <option value="consumer">Consumer</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-account">Account Number</Label>
                      <Input
    id="edit-account"
    placeholder="01-2345-6789"
    value={editingUser.accountNumber || ""}
    onChange={(e) => setEditingUser({ ...editingUser, accountNumber: e.target.value })}
  />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="edit-phone">Phone Number</Label>
                      <Input
    id="edit-phone"
    placeholder="09123456789"
    value={editingUser.phoneNumber || ""}
    onChange={(e) => setEditingUser({ ...editingUser, phoneNumber: e.target.value })}
  />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="edit-address">Service Address</Label>
                      <Textarea
    id="edit-address"
    placeholder="Sorsogon City, Philippines"
    rows={2}
    value={editingUser.address || ""}
    onChange={(e) => setEditingUser({ ...editingUser, address: e.target.value })}
  />
                    </div>
                    {editingUser.role !== "admin" && (
                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="edit-service-status">Service Connection Status</Label>
                        <select
                          id="edit-service-status"
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          value={editingUser.hasUnpaidBill ? "disconnected" : "connected"}
                          onChange={(e) => setEditingUser({ ...editingUser, hasUnpaidBill: e.target.value === "disconnected" })}
                        >
                          <option value="connected">Connected</option>
                          <option value="disconnected">Disconnected to the Service (Has Unpaid Bill)</option>
                        </select>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
                    <Button type="submit" className="bg-gradient-to-br from-amber-500 to-orange-600 hover:opacity-90">Save Changes</Button>
                  </div>
                </form>
              </DialogContent>}
          </Dialog>

          <Dialog open={userToDelete !== null} onOpenChange={(open) => !open && setUserToDelete(null)}>
            {userToDelete && <DialogContent className="sm:max-w-[420px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-5 w-5" /> Confirm User Deletion
                  </DialogTitle>
                  <DialogDescription>
                    This action is irreversible. Are you sure you want to delete this user?
                  </DialogDescription>
                </DialogHeader>
                
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 my-2 space-y-1.5">
                  <div className="text-sm font-semibold text-slate-800">{userToDelete.fullName}</div>
                  <div className="text-xs text-slate-500">{userToDelete.email}</div>
                  {userToDelete.accountNumber && <div className="text-xs text-slate-500">
                      Account: <code className="font-mono bg-slate-200 px-1 rounded">{userToDelete.accountNumber}</code>
                    </div>}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setUserToDelete(null)}>Cancel</Button>
                  <Button
    type="button"
    variant="destructive"
    onClick={async () => {
      const id = userToDelete.id;
      setUserToDelete(null);
      try {
        await api.users.delete(id);
        toast.success("User deleted successfully");
        fetchData();
      } catch (error) {
        toast.error(error.message || "Failed to delete user");
      }
    }}
  >
                    Delete User
                  </Button>
                </div>
              </DialogContent>}
          </Dialog>
        </TabsContent>

        <TabsContent value="inquiries" className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">General Inquiries & Messages</h2>
              <p className="text-sm text-slate-500">Monitor general contact form submissions from the public web form.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {inquiries && inquiries.length > 0 ? inquiries.map((inq) => <Card key={inq.id} id={`inquiry-card-${inq.id}`} className={cn("border-slate-100 shadow-sm overflow-hidden hover:border-slate-200 transition-all", activeInquiryChatId === inq.id && "ring-2 ring-indigo-600 border-indigo-600 shadow-md")}>
                  <CardHeader className="bg-slate-50/50 py-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className="font-mono text-[10px] bg-slate-200 text-slate-700 hover:bg-slate-200">
                          {inq.id}
                        </Badge>
                        {((inq.messages || []).length === 0 || inq.messages[inq.messages.length - 1]?.senderId !== "admin") && (
                          <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 font-bold text-[9px] px-1.5 py-0 h-4 flex items-center gap-1">
                            <span className="h-1 w-1 rounded-full bg-rose-500 animate-pulse"></span>
                            NEEDS REPLY
                          </Badge>
                        )}
                        <span className="text-xs text-slate-400">
                          {new Date(inq.createdAt || inq.createdat).toLocaleString()}
                        </span>
                      </div>
                      <CardTitle className="text-base font-bold text-slate-900 mt-1 flex items-center gap-2">
                        {inq.subject}
                        {((inq.messages || []).length === 0 || inq.messages[inq.messages.length - 1]?.senderId !== "admin") && (
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                          </span>
                        )}
                      </CardTitle>
                    </div>
                    <div className="flex flex-col sm:items-end text-xs text-slate-500">
                      <div className="font-bold text-slate-800">{inq.fullName}</div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 justify-start sm:justify-end">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {inq.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {inq.phone}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-100/50">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {inq.message}
                      </p>
                    </div>

                    <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
                      <div className="text-xs text-slate-400">
                        {inq.messages && inq.messages.length > 0 ? (
                          <span className="text-indigo-600 font-semibold flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" /> {inq.messages.length} messages in conversation
                          </span>
                        ) : (
                          <span>No conversation started yet</span>
                        )}
                      </div>
                      <Button
                        variant={activeInquiryChatId === inq.id ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => {
                          if (activeInquiryChatId === inq.id) {
                            setActiveInquiryChatId(null);
                          } else {
                            setActiveInquiryChatId(inq.id);
                            setInquiryReplyText("");
                          }
                        }}
                        className="gap-2 text-xs"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        {activeInquiryChatId === inq.id ? "Close Chat" : "Chat with Consumer"}
                      </Button>
                    </div>

                    {activeInquiryChatId === inq.id && (
                      <div className="border-t border-slate-100 pt-4 space-y-4">
                        <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 max-h-[300px] overflow-y-auto space-y-3">
                          
                          <div className="flex flex-col items-start max-w-[85%] text-xs space-y-1">
                            <span className="font-semibold text-slate-600">{inq.fullName} (Consumer Inquiry)</span>
                            <div className="bg-white border border-slate-100 p-2.5 rounded-2xl rounded-tl-none shadow-sm text-slate-800">
                              {inq.message}
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {new Date(inq.createdAt || inq.createdat).toLocaleString()}
                            </span>
                          </div>

                          {inq.messages && inq.messages.map((msg, idx) => {
                            const isAdminMsg = msg.senderId === "admin";
                            const imageList = msg.images || (msg.image ? [msg.image] : []);
                            const hasImages = imageList.length > 0;

                            return (
                              <div
                                key={idx}
                                className={cn(
                                  "flex flex-col max-w-[85%] text-xs space-y-1",
                                  isAdminMsg ? "items-end ml-auto" : "items-start"
                                )}
                              >
                                <span className="font-semibold text-slate-600">
                                  {msg.senderName || (isAdminMsg ? "SORECO-1 Admin" : inq.fullName)}
                                </span>
                                <div
                                  className={cn(
                                    "p-2.5 rounded-2xl shadow-sm space-y-2",
                                    isAdminMsg
                                      ? "bg-indigo-600 text-white rounded-tr-none"
                                      : "bg-white border border-slate-100 text-slate-800 rounded-tl-none"
                                  )}
                                >
                                  {msg.text && <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>}
                                  {hasImages && (
                                    <div className={cn(
                                      "grid gap-2 pt-1",
                                      imageList.length === 1 ? "grid-cols-1" : "grid-cols-2"
                                    )}>
                                      {imageList.map((imgSrc, imgIdx) => (
                                        <div
                                          key={imgIdx}
                                          onClick={() => setLightboxImage(imgSrc)}
                                          className="relative group rounded-xl overflow-hidden border border-black/10 cursor-pointer bg-black/5 hover:opacity-95 transition-all shadow-sm"
                                        >
                                          <img
                                            src={imgSrc}
                                            alt={`Attached picture ${imgIdx + 1}`}
                                            className="w-full h-24 object-cover rounded-xl group-hover:scale-105 transition-transform duration-300"
                                          />
                                          <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-semibold gap-1">
                                            <ZoomIn className="h-3 w-3" /> Expand
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400">
                                  {new Date(msg.createdAt).toLocaleString()}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {activeInquiryChatId === inq.id && adminInquiryImages.length > 0 && (
                          <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex flex-col gap-2">
                            <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
                              <span className="flex items-center gap-1.5 text-indigo-700">
                                <ImageIcon className="h-3.5 w-3.5" />
                                {adminInquiryImages.length} picture{adminInquiryImages.length > 1 ? "s" : ""} attached
                              </span>
                              <button
                                type="button"
                                onClick={() => setAdminInquiryImages([])}
                                className="text-rose-500 hover:text-rose-700 text-[11px] font-medium"
                              >
                                Clear all
                              </button>
                            </div>
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5">
                              {adminInquiryImages.map((imgSrc, index) => (
                                <div key={index} className="relative shrink-0">
                                  <img
                                    src={imgSrc}
                                    alt={`Preview ${index + 1}`}
                                    className="w-14 h-14 object-cover rounded-lg border border-slate-200 shadow-sm"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeAdminImage(index)}
                                    className="absolute -top-1.5 -right-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-0.5 shadow-md transition-colors"
                                    title="Remove image"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => adminFileInputRef.current?.click()}
                                className="w-14 h-14 shrink-0 rounded-lg border-2 border-dashed border-slate-300 hover:border-indigo-600 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors bg-white"
                                title="Add more pictures"
                              >
                                <Plus className="h-4 w-4" />
                                <span className="text-[8px] font-bold mt-0.5">Add</span>
                              </button>
                            </div>
                          </div>
                        )}

                        <input
                          type="file"
                          ref={adminFileInputRef}
                          accept="image/*"
                          multiple
                          onChange={handleAdminFilesChange}
                          className="hidden"
                        />

                        <div className="flex gap-2 items-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setActiveInquiryChatId(inq.id);
                              adminFileInputRef.current?.click();
                            }}
                            disabled={isSendingInquiryReply || isProcessingAdminImages}
                            className={cn(
                              "shrink-0 h-9 w-9 border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors relative",
                              activeInquiryChatId === inq.id && adminInquiryImages.length > 0 && "border-indigo-600 text-indigo-600 bg-indigo-50"
                            )}
                            title="Attach pictures"
                          >
                            {isProcessingAdminImages ? (
                              <Clock className="h-4 w-4 animate-spin text-indigo-600" />
                            ) : (
                              <Paperclip className="h-4 w-4" />
                            )}
                            {activeInquiryChatId === inq.id && adminInquiryImages.length > 0 && (
                              <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-sm">
                                {adminInquiryImages.length}
                              </span>
                            )}
                          </Button>

                          <Input
                            placeholder={activeInquiryChatId === inq.id && adminInquiryImages.length > 0 ? "Add a message (optional)..." : "Type a message to reply..."}
                            value={activeInquiryChatId === inq.id ? inquiryReplyText : ""}
                            onChange={(e) => {
                              setActiveInquiryChatId(inq.id);
                              setInquiryReplyText(e.target.value);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && activeInquiryChatId === inq.id) {
                                handleSendInquiryReply(inq.id);
                              }
                            }}
                            className="text-xs bg-white h-9 focus-visible:ring-indigo-600"
                          />
                          <Button
                            size="sm"
                            disabled={
                              isSendingInquiryReply ||
                              activeInquiryChatId !== inq.id ||
                              (!inquiryReplyText.trim() && adminInquiryImages.length === 0)
                            }
                            onClick={() => handleSendInquiryReply(inq.id)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shrink-0 h-9"
                          >
                            <Send className="h-3 w-3" /> Send
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>) : <Card className="border-slate-100 shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="p-3 bg-slate-50 text-slate-400 rounded-full mb-4">
                    <Mail className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">No inquiries yet</h3>
                  <p className="text-sm text-slate-500 max-w-sm mt-1">
                    All inquiry form submissions from the contact page will be saved here in real-time.
                  </p>
                </CardContent>
              </Card>}
          </div>
        </TabsContent>
      </Tabs>

      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <div className="absolute -top-12 right-0 flex items-center gap-2">
              <a
                href={lightboxImage}
                download="chat-picture.jpg"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full backdrop-blur-md transition-colors"
                title="Download Image"
              >
                <Download className="h-4 w-4" />
              </a>
              <button
                onClick={() => setLightboxImage(null)}
                className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full backdrop-blur-md transition-colors"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <img
              src={lightboxImage}
              alt="Enlarged chat picture"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
      
      <ConsumerTransactionHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setSelectedHistoryConsumer(null);
        }}
        consumer={selectedHistoryConsumer}
        tickets={tickets}
        inquiries={inquiries}
      />

      <Dialog open={!!ticketToDelete} onOpenChange={(open) => !open && setTicketToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Ticket</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this ticket? This action cannot be undone.
            </DialogDescription>
            {ticketToDelete && (
              <div className="mt-3 p-3 bg-red-50 text-red-900 rounded-md border border-red-100 text-sm">
                <div className="font-semibold mb-1">Consumer: {ticketToDelete.consumerName}</div>
                <div className="text-red-700/80">Account: {ticketToDelete.accountNumber}</div>
              </div>
            )}
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setTicketToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteTicket}>Delete Ticket</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div></div>;
};
