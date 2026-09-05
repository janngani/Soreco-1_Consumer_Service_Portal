import React, { useState, useEffect } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { BARANGAYS } from "@/src/pages/63barangay";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  MapPin,
  Hash,
  Zap,
  CheckCircle2,
  HelpCircle,
  Loader2,
  LogOut,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { toast } from "sonner";

export const GoogleOnboardingModal = () => {
  const { user, completeOnboarding, logout } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [barangay, setBarangay] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [showBillGuide, setShowBillGuide] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Determine if onboarding is required
  useEffect(() => {
    if (!user) {
      setIsOpen(false);
      return;
    }

    // Admins never need consumer onboarding
    if (user.role === "admin") {
      setIsOpen(false);
      return;
    }

    // If user explicitly needs onboarding or is a Google consumer with incomplete profile
    const needsSetup =
      user.needsOnboarding === true ||
      (user.isGoogleUser &&
        (!user.onboardingCompleted || !user.phoneNumber || !user.address || !user.accountNumber));

    if (needsSetup) {
      setIsOpen(true);
      if (user.phoneNumber) setPhoneNumber(user.phoneNumber);
      if (user.address || user.barangay) setBarangay(user.address || user.barangay);
      if (user.accountNumber) setAccountNumber(user.accountNumber);
    } else {
      setIsOpen(false);
    }
  }, [user]);

  // Listen for manual trigger if user wants to re-open from dashboard
  useEffect(() => {
    const handleOpen = () => {
      if (user && user.role !== "admin") {
        if (user.phoneNumber) setPhoneNumber(user.phoneNumber);
        if (user.address || user.barangay) setBarangay(user.address || user.barangay);
        if (user.accountNumber) setAccountNumber(user.accountNumber);
        setIsOpen(true);
      }
    };
    window.addEventListener("open-consumer-onboarding", handleOpen);
    return () => window.removeEventListener("open-consumer-onboarding", handleOpen);
  }, [user]);

  const handlePhoneChange = (e) => {
    setFormError("");
    // Keep digits and leading +
    const cleaned = e.target.value.replace(/[^\d+]/g, "");
    setPhoneNumber(cleaned);
  };

  const handleAccountChange = (e) => {
    setFormError("");
    // Keep numbers only
    const cleaned = e.target.value.replace(/\D/g, "");
    setAccountNumber(cleaned);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    const cleanPhone = phoneNumber.trim();
    const cleanBarangay = barangay.trim();
    const cleanAccount = accountNumber.trim();

    // 1. Mobile Number Validation
    if (!cleanPhone) {
      setFormError("Please enter your active mobile number.");
      return;
    }
    // Philippine phone number validation (e.g., 09XXXXXXXXX or +639XXXXXXXXX or at least 10 digits)
    const phoneDigits = cleanPhone.replace(/\D/g, "");
    if (phoneDigits.length < 10 || phoneDigits.length > 13) {
      setFormError("Please enter a valid Philippine mobile number (e.g. 09171234567).");
      return;
    }

    // 2. Barangay Selection Validation
    if (!cleanBarangay) {
      setFormError("Please select your residential barangay in Bulan.");
      return;
    }
    if (!BARANGAYS.includes(cleanBarangay)) {
      setFormError("Please choose a valid barangay from the list of 63 Bulan barangays.");
      return;
    }

    // 3. Utility Number Validation
    if (!cleanAccount) {
      setFormError("Please enter your SORECO-1 Utility Account Number.");
      return;
    }
    if (cleanAccount.length < 5 || cleanAccount.length > 12) {
      setFormError("Utility Account Number is typically 8 digits. Please enter between 5 to 12 digits.");
      return;
    }

    setSubmitting(true);
    try {
      await completeOnboarding({
        phoneNumber: cleanPhone,
        barangay: cleanBarangay,
        accountNumber: cleanAccount
      });

      toast.success("Consumer profile activated!", {
        description: `Welcome to SORECO-1, ${user?.fullName || "Member-Consumer"}. Your utility account has been registered.`
      });
      setIsOpen(false);
    } catch (err) {
      console.error("Onboarding submission failed:", err);
      setFormError(err.message || "Failed to save consumer details. Please try again.");
      toast.error(err.message || "Failed to complete onboarding.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      setIsOpen(false);
      toast.info("Signed out successfully.");
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // Prevent dismissing by clicking outside if onboarding is required
      if (!open && user?.needsOnboarding) {
        toast.warning("Please complete the required details to access your portal.");
        return;
      }
      setIsOpen(open);
    }}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-xl p-0 overflow-hidden border-0 shadow-2xl rounded-2xl bg-white max-h-[92vh] flex flex-col"
      >
        {/* Header with SORECO-1 Branding */}
        <div className="bg-gradient-to-r from-[#D84315] via-[#E65100] to-[#F57C00] p-6 text-white relative">
          <div className="flex items-center gap-3.5 mb-2">
            <div className="h-11 w-11 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 shadow-xs">
              <Zap className="h-6 w-6 text-amber-300 fill-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full text-white">
                  SORECO-1 Consumer Setup
                </span>
                <Badge variant="outline" className="bg-emerald-500/20 text-white border-white/30 text-[10px] py-0">
                  <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-300" /> Google Connected
                </Badge>
              </div>
              <DialogTitle className="text-xl font-bold tracking-tight text-white mt-1">
                Complete Consumer Registration
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-orange-100 text-xs font-normal leading-relaxed mt-1">
            Welcome to the SORECO-1 Digital Portal! Because you signed in via Google, please provide your
            active mobile number, residential barangay, and utility account number to connect your electric service.
          </DialogDescription>

          {/* Connected Account Tag */}
          <div className="mt-3 flex items-center justify-between bg-black/15 backdrop-blur-xs rounded-lg px-3 py-1.5 text-xs text-orange-100 border border-white/10">
            <span className="truncate">
              Signed in as: <strong className="text-white">{user?.email}</strong>
            </span>
            <span className="text-[11px] text-amber-200 shrink-0 ml-2 font-medium">
              {user?.fullName || "Member-Consumer"}
            </span>
          </div>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-left flex-1">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* 1. Mobile Number */}
          <div className="space-y-1.5">
            <Label htmlFor="onboarding-phone" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-orange-600" />
              1. Mobile Number <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="onboarding-phone"
                type="tel"
                placeholder="e.g. 0917 123 4567"
                value={phoneNumber}
                onChange={handlePhoneChange}
                required
                maxLength={15}
                className="pl-9 h-11 text-sm border-slate-200 focus-visible:ring-orange-500 font-medium"
              />
              <Phone className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              Required for emergency outage advisories, power restoration alerts, and dispatch SMS verification.
            </p>
          </div>

          {/* 2. Selection of which Barangay */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="onboarding-barangay" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-orange-600" />
                2. Selection of Barangay <span className="text-red-500">*</span>
              </Label>
              <span className="text-[11px] font-semibold text-orange-600">63 Bulan Barangays</span>
            </div>
            <div className="relative">
              <select
                id="onboarding-barangay"
                value={barangay}
                onChange={(e) => {
                  setFormError("");
                  setBarangay(e.target.value);
                }}
                required
                className="w-full h-11 pl-9 pr-8 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-medium text-slate-800"
              >
                <option value="" disabled>
                  -- Select which Barangay your meter is located --
                </option>
                {BARANGAYS.map((bg) => (
                  <option key={bg} value={bg}>
                    Brgy. {bg}
                  </option>
                ))}
              </select>
              <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              Identifies your feeder line and substation zone for targeted power restoration tracking.
            </p>
          </div>

          {/* 3. Utility Number */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="onboarding-account" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5 text-orange-600" />
                3. Utility Account Number <span className="text-red-500">*</span>
              </Label>
              <button
                type="button"
                onClick={() => setShowBillGuide(!showBillGuide)}
                className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
              >
                <HelpCircle className="h-3 w-3" />
                {showBillGuide ? "Hide helper" : "Where to find on electric bill?"}
                {showBillGuide ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>
            <div className="relative">
              <Input
                id="onboarding-account"
                type="text"
                placeholder="e.g. 10293847"
                value={accountNumber}
                onChange={handleAccountChange}
                required
                maxLength={12}
                className="pl-9 h-11 text-sm font-mono tracking-wider font-semibold border-slate-200 focus-visible:ring-orange-500 text-slate-900"
              />
              <Hash className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            </div>

            {/* Bill Helper Callout */}
            {showBillGuide && (
              <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2 mt-2">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block text-amber-950">How to find your Utility Number:</strong>
                    <p className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
                      Check the upper section of your monthly SORECO-1 printed statement of account / electric bill.
                      Look for <strong>"Account No."</strong> (usually an 8-digit sequence like <strong>10293847</strong>).
                    </p>
                  </div>
                </div>
                <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200/80 font-mono text-[11px] text-slate-700 flex justify-between items-center">
                  <span>SORECO-1 BILLING &bull; ACCT NO:</span>
                  <span className="font-bold text-orange-700 bg-orange-100/80 px-2 py-0.5 rounded-sm">
                    [ 8-DIGIT NUMBER ]
                  </span>
                </div>
              </div>
            )}
            <p className="text-[11px] text-slate-500 leading-tight">
              Permanently links your online consumer credentials with your actual meter ledger and billing history.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-12 bg-[#E65100] hover:bg-[#D84315] text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 text-sm transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving & Activating Account...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Submit & Activate Consumer Account
                </>
              )}
            </Button>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">
                Wrong account?
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="text-[11px] text-slate-500 hover:text-red-600 flex items-center gap-1 font-medium transition-colors"
              >
                <LogOut className="h-3 w-3" />
                Sign out and use another email
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
