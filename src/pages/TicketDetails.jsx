import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/lib/api";
import { compressImage } from "@/src/lib/imageCompressor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  ArrowLeft,
  Send,
  Clock,
  CheckCircle2,
  Truck,
  MessageSquare,
  Image as ImageIcon,
  Camera,
  RotateCcw,
  Star,
  Paperclip,
  X,
  Plus,
  ZoomIn,
  Download,
  History
} from "lucide-react";
import { ServiceTracker } from "@/src/components/ServiceTracker";
import { ConsumerTransactionHistoryModal } from "@/src/components/ConsumerTransactionHistoryModal";
import { cn } from "@/lib/utils";
export const TicketDetails = () => {
  const { id } = useParams();
  const { user, userData, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUpdatingImage, setIsUpdatingImage] = useState(false);
  const [newPreviewImage, setNewPreviewImage] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [selectedChatImages, setSelectedChatImages] = useState([]);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const scrollRef = useRef(null);
  const chatFileInputRef = useRef(null);

  const handleChatFilesChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setIsProcessingImages(true);
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
        setSelectedChatImages((prev) => [...prev, ...validImages]);
        toast.success(`Attached ${validImages.length} picture${validImages.length > 1 ? "s" : ""}`);
      }
    } catch (err) {
      toast.error("Error attaching pictures");
    } finally {
      setIsProcessingImages(false);
      if (chatFileInputRef.current) {
        chatFileInputRef.current.value = "";
      }
    }
  };

  const removeChatImage = (indexToRemove) => {
    setSelectedChatImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const fetchTicket = async () => {
    if (!id) return;
    try {
      const data = await api.tickets.get(id);
      setTicket(data);
    } catch (error) {
      console.error("Error fetching ticket:", error);
      toast.error("Ticket not found");
      navigate(isAdmin ? "/admin" : "/dashboard");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchTicket();
    const interval = setInterval(fetchTicket, 1e4);
    return () => clearInterval(interval);
  }, [id]);
  useEffect(() => {
    if (isAdmin && !loading && ticket && ticket.status === "pending") {
      updateTicketStatus(
        "reviewing",
        "Your request is now being reviewed by our team. We will get back to you shortly if more information is needed."
      );
    }
  }, [ticket?.status, isAdmin, loading]);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [ticket?.messages]);
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!message.trim() && selectedChatImages.length === 0) || !id || !user) return;
    setIsSending(true);
    try {
      const newMessage = {
        senderId: user.id || user.uid,
        senderName: userData?.fullName || (isAdmin ? "Staff" : "User"),
        text: message.trim(),
        images: selectedChatImages.length > 0 ? selectedChatImages : undefined,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        isAdmin
      };
      const updatedMessages = [...ticket.messages || [], newMessage];
      await api.tickets.update(id, { messages: updatedMessages });
      setMessage("");
      setSelectedChatImages([]);
      fetchTicket();
    } catch (error) {
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };
  const updateTicketStatus = async (newStatus, automatedMessage) => {
    if (!id || !ticket) return;
    try {
      const updateData = { status: newStatus };
      if (automatedMessage) {
        const newMessage = {
          senderId: user?.id || user?.uid || "admin",
          senderName: "SORECO-1 Support",
          text: automatedMessage,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          isAdmin: true,
          isAuto: true
        };
        updateData.messages = [...ticket.messages || [], newMessage];
      }
      await api.tickets.update(id, updateData);
      const isReconnection = ticket.type === "reconnection" || (ticket.category || "").toLowerCase().includes("reconnection");
      if (newStatus === "resolved" && isReconnection) {
        toast.success("Ticket resolved & consumer successfully updated to Connected!");
      } else {
        toast.success(`Ticket status updated to ${newStatus}`);
      }
      window.dispatchEvent(new Event("refresh-user-profile"));
      fetchTicket();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };
  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 800, 0.7);
        setNewPreviewImage(compressed);
      } catch (err) {
        console.warn("Error compressing image, falling back:", err);
        const reader = new FileReader();
        reader.onloadend = () => {
          setNewPreviewImage(reader.result);
        };
        reader.readAsDataURL(file);
      }
    }
  };
  const handleUpdateImage = async () => {
    if (!id || !newPreviewImage) return;
    setIsUpdatingImage(true);
    try {
      const systemMessage = {
        senderId: "system",
        senderName: "System",
        text: "Consumer has updated the evidence image.",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        isAdmin: true
      };
      const updatedMessages = [...ticket.messages || [], systemMessage];
      const updatePayload = {
        evidenceImage: newPreviewImage,
        messages: updatedMessages
      };
      if (ticket?.status === "asking for a clearer picture" || ticket?.status === "clearer_picture") {
        updatePayload.status = "reviewing";
      }
      await api.tickets.update(id, updatePayload);
      setNewPreviewImage(null);
      toast.success("Evidence image updated successfully");
      fetchTicket();
    } catch (error) {
      toast.error("Failed to update image");
    } finally {
      setIsUpdatingImage(false);
    }
  };
  const requestClearerPicture = async () => {
    if (!id || !user) return;
    try {
      const newMessage = {
        senderId: user.id || user.uid,
        senderName: userData?.fullName || "Staff",
        text: "Hello! Could you please provide a clearer picture of your evidence? The current one is a bit blurry and we need a better view to process your request.",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        isAdmin: true,
        isAuto: true
      };
      const updatedMessages = [...ticket.messages || [], newMessage];
      await api.tickets.update(id, {
        status: "asking for a clearer picture",
        messages: updatedMessages,
        actionType: "request_clearer_picture",
        notificationType: "clearer_picture",
        consumerEmail: ticket?.consumerEmail || ticket?.email,
        consumerName: ticket?.consumerName,
        customMessage: "Our technical personnel reviewed your request and noticed that the uploaded evidence photo is unclear or blurry. Please click the link below to upload a clearer photo so we can process your request promptly."
      });
      toast.success("Request for clearer picture sent & notification email dispatched");
      fetchTicket();
    } catch (error) {
      toast.error("Failed to send request");
    }
  };
  const handleSubmitFeedback = async () => {
    if (!id) return;
    setIsSubmittingFeedback(true);
    try {
      await api.tickets.update(id, {
        feedback: {
          rating: feedbackRating,
          comment: feedbackComment.trim(),
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
      if (feedbackRating === 5) {
        toast.success("Thank you for a Full star Review!");
      } else {
        toast.success("Thank you for reviewing our services will make sure to improvise it better.");
      }
      fetchTicket();
    } catch (error) {
      toast.error("Failed to submit feedback");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };
  if (loading) {
    return <div className="flex h-[60vh] items-center justify-center">
        <Clock className="h-8 w-8 animate-spin text-primary" />
      </div>;
  }
  if (!ticket) return null;
  return <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Button
        variant="ghost"
        onClick={() => {
          if (window.history.state && window.history.state.idx > 0) {
            navigate(-1);
          } else {
            navigate(isAdmin ? "/admin" : "/dashboard");
          }
        }}
        className="mb-6 gap-2 text-slate-700 hover:text-slate-900 font-bold bg-white border border-slate-200/80 shadow-sm hover:bg-slate-50 rounded-xl px-4 py-2 text-xs transition-all"
      >
        <ArrowLeft className="h-4 w-4 text-slate-700" />
        {isAdmin ? "Back to Admin Dashboard" : "Back to Consumer Dashboard"}
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-slate-100 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start mb-2">
                <Badge variant="outline" className="capitalize">
                  {ticket.type}
                </Badge>
                <Badge className={cn(
                  "capitalize",
                  ticket.status === "pending" && "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
                  ticket.status === "reviewing" && "bg-blue-100 text-blue-700 hover:bg-blue-100",
                  ticket.status === "dispatched" && "bg-purple-100 text-purple-700 hover:bg-purple-100",
                  ticket.status === "resolved" && "bg-green-100 text-green-700 hover:bg-green-100",
                  (ticket.status === "asking for a clearer picture" || ticket.status === "clearer_picture") && "bg-orange-100 text-orange-700 border border-orange-200 hover:bg-orange-100"
                )}>
                  {(ticket.status === "clearer_picture" || ticket.status === "asking for a clearer picture") ? "Action Needed: Clearer Picture" : ticket.status}
                </Badge>
              </div>
              <CardTitle className="text-xl">{ticket.category}</CardTitle>
              <CardDescription>Ticket ID: {ticket.id.substring(0, 8).toUpperCase()}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm">
                <p className="text-slate-500 mb-1">Consumer</p>
                <p className="font-bold text-slate-900">{ticket.consumerName}</p>
                <p className="text-xs text-slate-400 font-mono">Account: {ticket.accountNumber || "N/A"}</p>
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsHistoryModalOpen(true)}
                    className="mt-2 w-full flex items-center justify-center gap-2 border-indigo-200 text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 font-bold h-8 text-xs rounded-lg"
                  >
                    <History className="h-3.5 w-3.5" /> View Past Transaction History
                  </Button>
                )}
              </div>
              <div className="text-sm">
                <p className="text-slate-500 mb-1">Description</p>
                <p className="text-slate-700 leading-relaxed">{ticket.description}</p>
              </div>
              {ticket.evidenceImage && <div className="pt-2">
                  <p className="text-sm text-slate-500 mb-2">Attached Evidence</p>
                  <div className="relative group">
                    <img
    src={newPreviewImage || ticket.evidenceImage}
    alt="Evidence"
    className="w-full rounded-lg border border-slate-100 shadow-sm"
  />
                    {!isAdmin && ticket.status !== "resolved" && <div className="mt-3 space-y-2">
                        {!newPreviewImage ? <label className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer transition-colors text-sm font-medium">
                            <Camera className="h-4 w-4" /> Change Image
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                          </label> : <div className="flex gap-2">
                            <Button
    size="sm"
    className="flex-grow bg-gradient-to-br from-amber-500 to-orange-600 hover:opacity-90"
    onClick={handleUpdateImage}
    disabled={isUpdatingImage}
  >
                              {isUpdatingImage ? <Clock className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                              Save New Image
                            </Button>
                            <Button
    size="sm"
    variant="outline"
    onClick={() => setNewPreviewImage(null)}
    disabled={isUpdatingImage}
  >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </div>}
                      </div>}
                  </div>
                </div>}

              {isAdmin && <div className="pt-4 border-t space-y-3">
                  <p className="text-sm font-bold text-slate-900">Admin Actions</p>
                  <div className="flex flex-col gap-2">
                    <Button
    size="sm"
    variant="outline"
    onClick={requestClearerPicture}
    className="justify-start gap-2 text-orange-600 border-orange-200 hover:bg-orange-50"
  >
                      <ImageIcon className="h-4 w-4" /> Request Clearer Picture
                    </Button>
                    <Button
    size="sm"
    variant={ticket.status === "reviewing" ? "default" : "outline"}
    onClick={() => updateTicketStatus(
      "reviewing",
      "Your request is currently being reviewed by our technical team."
    )}
    className="justify-start gap-2"
  >
                      <Clock className="h-4 w-4" /> Set to Reviewing
                    </Button>
                    <Button
    size="sm"
    variant={ticket.status === "dispatched" ? "default" : "outline"}
    onClick={() => updateTicketStatus(
      "dispatched",
      "A technical crew has been dispatched to your location. Please ensure our personnel have access to the meter or service area."
    )}
    className="justify-start gap-2 bg-purple-600 hover:bg-purple-700 text-white"
  >
                      <Truck className="h-4 w-4" /> Dispatch Crew
                    </Button>
                    <Button
    size="sm"
    variant={ticket.status === "resolved" ? "default" : "outline"}
    onClick={() => updateTicketStatus(
      "resolved",
      (ticket.type === "reconnection" || (ticket.category || "").toLowerCase().includes("reconnection"))
        ? "Great news! Your reconnection request has been resolved and your electrical service has been restored to Connected. If you have any further questions or need assistance, please feel free to message us here. Thank you!"
        : "Great news! Your service request has been resolved. If you have any further questions or if the issue persists, feel free to chat with us here. Thank you!"
    )}
    className="justify-start gap-2 bg-green-600 hover:bg-green-700 text-white"
  >
                      <CheckCircle2 className="h-4 w-4" /> Mark Resolved
                    </Button>
                  </div>
                </div>}
            </CardContent>
          </Card>

          <Card className="border-slate-100 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">Service Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <ServiceTracker status={ticket.status} />
            </CardContent>
          </Card>

          {ticket.status === "resolved" && <Card className="border-slate-100 shadow-sm overflow-hidden">
              <CardHeader className="bg-green-50/50 pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" /> 
                  Consumer Feedback
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {(() => {
                  const parsedFeedback = (() => {
                    if (!ticket.feedback) return null;
                    if (typeof ticket.feedback === "string") {
                      try { return JSON.parse(ticket.feedback); } catch (e) { return null; }
                    }
                    return ticket.feedback;
                  })();

                  if (parsedFeedback) {
                    return (
                      <div className="space-y-3">
                        <div className="space-y-1.5 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                          <div className="flex items-center justify-between">
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={cn(
                                    "h-4 w-4",
                                    s <= (parsedFeedback.rating || 0) ? "text-yellow-500 fill-yellow-500" : "text-slate-200"
                                  )}
                                />
                              ))}
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {parsedFeedback.createdAt ? new Date(parsedFeedback.createdAt).toLocaleDateString() : ""}
                            </span>
                          </div>
                          {parsedFeedback.comment && (
                            <p className="text-sm text-slate-700 italic pt-1 leading-relaxed">"{parsedFeedback.comment}"</p>
                          )}
                        </div>

                        {/* Admin Official Response */}
                        {parsedFeedback.adminResponse ? (
                          <div className="p-3.5 bg-blue-50/90 border border-blue-200/90 rounded-xl text-xs space-y-2 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <p className="font-bold text-blue-900 flex items-center gap-1.5">
                                <MessageSquare className="h-3.5 w-3.5 text-blue-600" /> Admin Official Response:
                              </p>
                              {parsedFeedback.adminResponseAt && (
                                <span className="text-[10px] text-blue-600/75 font-medium">
                                  {new Date(parsedFeedback.adminResponseAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <p className="text-slate-800 leading-relaxed font-normal bg-white/80 p-2.5 rounded-lg border border-blue-100">
                              {parsedFeedback.adminResponse}
                            </p>
                          </div>
                        ) : isAdmin ? (
                          <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-2">
                            <p className="text-xs font-semibold text-slate-700">Reply to Consumer Feedback</p>
                            <div className="flex gap-2">
                              <Input
                                placeholder="Type official admin response..."
                                className="text-xs h-8 bg-white"
                                id="ticket-admin-reply-input"
                              />
                              <Button
                                size="sm"
                                className="h-8 bg-gradient-to-br from-amber-500 to-orange-600 hover:opacity-90 text-xs text-white shrink-0"
                                onClick={async () => {
                                  const inputEl = document.getElementById("ticket-admin-reply-input");
                                  const text = inputEl ? inputEl.value.trim() : "";
                                  if (!text) return;
                                  try {
                                    const updatedFeedback = {
                                      ...parsedFeedback,
                                      adminResponse: text,
                                      adminResponseAt: new Date().toISOString()
                                    };
                                    await api.tickets.update(ticket.id, { feedback: updatedFeedback });
                                    setTicket({ ...ticket, feedback: updatedFeedback });
                                    toast.success("Admin response sent successfully!");
                                  } catch (err) {
                                    toast.error("Failed to send response");
                                  }
                                }}
                              >
                                Reply
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-2.5 bg-slate-50 border border-slate-200/60 rounded-lg text-[11px] text-slate-500 flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>Awaiting cooperative admin official response</span>
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (!isAdmin) {
                    return (
                      <div className="space-y-4">
                        <p className="text-xs text-slate-500">How would you rate our service?</p>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button
                              key={s}
                              onClick={() => setFeedbackRating(s)}
                              className="focus:outline-none"
                            >
                              <Star
                                className={cn(
                                  "h-6 w-6 transition-all",
                                  s <= feedbackRating ? "text-yellow-500 fill-yellow-500 scale-110" : "text-slate-200 hover:text-yellow-200"
                                )}
                              />
                            </button>
                          ))}
                        </div>
                        <textarea
                          placeholder="Any additional comments?"
                          className="w-full min-h-[80px] p-3 text-sm border rounded-lg focus:ring-1 focus:ring-primary outline-none"
                          value={feedbackComment}
                          onChange={(e) => setFeedbackComment(e.target.value)}
                        />
                        <Button
                          className="w-full bg-green-600 hover:bg-green-700 text-white"
                          onClick={handleSubmitFeedback}
                          disabled={isSubmittingFeedback}
                        >
                          {isSubmittingFeedback ? <Clock className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                          Submit Feedback
                        </Button>
                      </div>
                    );
                  }

                  return (
                    <div className="text-center py-4">
                      <p className="text-xs text-slate-400 italic">No feedback provided yet.</p>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>}
        </div>

        <div className="lg:col-span-2">
          <Card className="border-slate-100 shadow-lg h-[600px] flex flex-col">
            <CardHeader className="border-b py-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">In-Ticket Chat</CardTitle>
                  <CardDescription>Direct communication with SORECO-1 Staff</CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="flex-grow p-0 overflow-hidden">
              <ScrollArea className="h-full p-6">
                <div className="space-y-6">
                  {ticket.messages && ticket.messages.length > 0 ? ticket.messages.map((msg, i) => {
                    const isStaffOrAdminMsg = Boolean(
                      msg.isAdmin ||
                      msg.senderId === "admin" ||
                      msg.senderId === "system" ||
                      msg.isAuto ||
                      msg.senderRole === "admin" ||
                      msg.senderName?.toLowerCase().includes("admin") ||
                      msg.senderName?.toLowerCase().includes("soreco") ||
                      msg.senderName?.toLowerCase().includes("support") ||
                      msg.senderName?.toLowerCase().includes("staff")
                    );

                    const isMe = isAdmin
                      ? (isStaffOrAdminMsg || msg.senderId === (user?.id || user?.uid))
                      : (!isStaffOrAdminMsg && (msg.senderId === (user?.id || user?.uid) || !msg.senderId));

                    const imageList = msg.images || (msg.image ? [msg.image] : []);
                    const hasImages = imageList.length > 0;

                    return (
                      <div
                        key={i}
                        className={cn(
                          "flex flex-col max-w-[85%]",
                          isMe ? "ml-auto items-end" : "mr-auto items-start"
                        )}
                      >
                        <div className={cn("flex items-center gap-2 mb-1", isMe ? "justify-end" : "justify-start")}>
                          <span className={cn("text-[10px] font-bold uppercase tracking-wider", isMe ? "text-amber-600" : "text-slate-500")}>
                            {msg.isAuto ? "SORECO-1 Auto-Notification" : `${msg.senderName} ${msg.isAdmin ? "(Staff)" : ""}`}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <div className={cn(
                          "px-4 py-3 rounded-2xl text-sm shadow-sm space-y-2",
                          isMe ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-tr-none shadow-sm" : "bg-slate-100 text-slate-800 rounded-tl-none"
                        )}>
                          {msg.text && <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>}

                          {hasImages && (
                            <div className={cn(
                              "grid gap-2 pt-1",
                              imageList.length === 1 ? "grid-cols-1" : imageList.length === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"
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
                                    className="w-full h-28 sm:h-36 object-cover rounded-xl group-hover:scale-105 transition-transform duration-300"
                                  />
                                  <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5">
                                    <ZoomIn className="h-4 w-4" /> Expand
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 py-20">
                      <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
                      <p className="text-sm">No messages yet. Start the conversation!</p>
                    </div>
                  )}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>
            </CardContent>

            <CardFooter className="border-t p-4 flex flex-col gap-3">
              
              {selectedChatImages.length > 0 && (
                <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <ImageIcon className="h-4 w-4 text-primary" />
                      {selectedChatImages.length} picture{selectedChatImages.length > 1 ? "s" : ""} selected
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedChatImages([])}
                      className="text-rose-500 hover:text-rose-700 text-xs font-medium"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
                    {selectedChatImages.map((imgSrc, index) => (
                      <div key={index} className="relative shrink-0 group">
                        <img
                          src={imgSrc}
                          alt={`Preview ${index + 1}`}
                          className="w-16 h-16 object-cover rounded-lg border border-slate-200 shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={() => removeChatImage(index)}
                          className="absolute -top-1.5 -right-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-0.5 shadow-md transition-colors"
                          title="Remove image"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => chatFileInputRef.current?.click()}
                      className="w-16 h-16 shrink-0 rounded-lg border-2 border-dashed border-slate-300 hover:border-primary flex flex-col items-center justify-center text-slate-400 hover:text-primary transition-colors bg-white"
                      title="Add more pictures"
                    >
                      <Plus className="h-5 w-5" />
                      <span className="text-[9px] font-bold mt-0.5">Add</span>
                    </button>
                  </div>
                </div>
              )}

              <input
                type="file"
                ref={chatFileInputRef}
                accept="image/*"
                multiple
                onChange={handleChatFilesChange}
                className="hidden"
              />

              <form onSubmit={handleSendMessage} className="flex w-full gap-2 items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => chatFileInputRef.current?.click()}
                  disabled={isSending || isProcessingImages}
                  className={cn(
                    "shrink-0 border-slate-200 text-slate-600 hover:text-primary hover:bg-primary/5 transition-colors relative",
                    selectedChatImages.length > 0 && "border-primary text-primary bg-primary/10"
                  )}
                  title="Attach pictures"
                >
                  {isProcessingImages ? (
                    <Clock className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <Paperclip className="h-4 w-4" />
                  )}
                  {selectedChatImages.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-gradient-to-br from-amber-500 to-orange-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-sm">
                      {selectedChatImages.length}
                    </span>
                  )}
                </Button>

                <Input
                  placeholder={selectedChatImages.length > 0 ? "Add a message (optional)..." : "Type your message here..."}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="flex-grow focus-visible:ring-primary"
                  disabled={isSending}
                />

                <Button
                  type="submit"
                  size="icon"
                  className="bg-gradient-to-br from-amber-500 to-orange-600 hover:opacity-90 text-white shrink-0"
                  disabled={isSending || (!message.trim() && selectedChatImages.length === 0)}
                >
                  {isSending ? <Clock className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </CardFooter>
          </Card>
        </div>
      </div>

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
        onClose={() => setIsHistoryModalOpen(false)}
        consumer={{
          fullName: ticket?.consumerName,
          consumerName: ticket?.consumerName,
          accountNumber: ticket?.accountNumber,
        }}
        tickets={ticket ? [ticket] : []}
      />
    </div>;
};
