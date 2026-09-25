import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router";
import { useAuth } from "@/src/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { LogIn, Loader2, ArrowLeft, Mail, Lock, KeyRound, CheckCircle2, ShieldAlert, Eye, EyeOff, Send, RefreshCw } from "lucide-react";
import { supabase } from "@/src/lib/supabase";

export const LoginPage = () => {
  const { login, sendOtp, verifyOtp, resetPassword, resendConfirmation } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupBanner, setSignupBanner] = useState(null);
  const [unauthorizedNotice, setUnauthorizedNotice] = useState(null);
  const [showResendBox, setShowResendBox] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  // Flow views: "login" | "forgot" (enter email) | "otp" (enter 6-digit OTP) | "reset" (create new password)
  const [view, setView] = useState("login");
  const [resetEmail, setResetEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [otpResendCountdown, setOtpResendCountdown] = useState(0);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  useEffect(() => {
    let timer;
    if (otpResendCountdown > 0) {
      timer = setTimeout(() => setOtpResendCountdown(otpResendCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpResendCountdown]);

  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
      setResetEmail(location.state.email);
    }
    if (location.state?.message) {
      setSignupBanner(location.state.message);
    }
    
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("confirmed") === "true") {
      setSignupBanner("Your email has been confirmed successfully! You can now log in with your password.");
    }
  }, [location.state]);

  useEffect(() => {
    const checkRecovery = async () => {
      const hash = window.location.hash;
      const search = window.location.search;
      
      if (search.includes("recovery=true") || hash.includes("type=recovery") || hash.includes("access_token")) {
        setView("reset");
        toast.info("Recovery session active! Please enter your new password below.");
      }
    };
    checkRecovery();
  }, [navigate]);

  const handleGoogleLogin = async () => {
    try {
      localStorage.setItem("oauth_intent", "login");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to initialize Google login.");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setUnauthorizedNotice(null);
    setLoading(true);
    try {
      const loggedInUser = await login({ email: email.trim().toLowerCase(), password });

      // Immediate frontend security verification
      if (loggedInUser.role !== "admin" && /\d/.test(loggedInUser.fullName || "")) {
        setUnauthorizedNotice(
          `Access Denied: The account "${loggedInUser.fullName}" is not authorized to log in because it uses numbers in the name. SORECO-1 policy requires complete legal names only.`
        );
        toast.error("Log in is not authorized for accounts using numbers with their names.");
        return;
      }

      toast.success(`Welcome back, ${loggedInUser.fullName || "User"}!`);
      if (loggedInUser.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      console.error(error);
      const errMsg = error.message || "";
      if (
        errMsg.includes("not authorized") ||
        errMsg.includes("unauthorized") ||
        errMsg.includes("numbers with their names") ||
        errMsg.includes("numbers in their name") ||
        errMsg.includes("Access Denied")
      ) {
        setUnauthorizedNotice(errMsg);
        toast.error(errMsg);
      } else if (errMsg.includes("not confirmed") || errMsg.includes("Email not confirmed")) {
        setShowResendBox(true);
        toast.error("Your email has not been confirmed yet. Please check your inbox for the confirmation email.");
      } else {
        toast.error(errMsg || "Invalid login credentials. Please check your email and password.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    const targetEmail = email.trim().toLowerCase() || resetEmail.trim().toLowerCase();
    if (!targetEmail) {
      return toast.error("Please enter your email address first.");
    }
    setResendLoading(true);
    try {
      await resendConfirmation(targetEmail);
      toast.success("Soreco-1 has sent you an email confirmation please check your email and verify.");
      setShowResendBox(false);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Could not resend confirmation email. Please verify the email address.");
    } finally {
      setResendLoading(false);
    }
  };

  // Step 1: User enters email -> Server generates secure 6-digit OTP -> Sends OTP
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanEmail = resetEmail.trim().toLowerCase();
    if (!cleanEmail) {
      return toast.error("Please enter your registered email address");
    }
    setLoading(true);
    try {
      await sendOtp(cleanEmail);
      toast.success("Soreco-1 has sent you an OTP. Please check your email.");
      setView("otp");
      setOtpResendCountdown(60); // 60s cooldown for resend
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to send verification code. Please check your email address.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: User enters OTP -> Server verifies OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const cleanEmail = resetEmail.trim().toLowerCase();
    const cleanOtp = otpCode.trim();
    if (!cleanEmail) {
      return toast.error("Email address missing. Please start over.");
    }
    if (!cleanOtp || cleanOtp.length !== 6) {
      return toast.error("Please enter the 6-digit verification code sent to your email");
    }

    setLoading(true);
    try {
      const res = await verifyOtp(cleanEmail, cleanOtp);
      toast.success(res.message || "Verification code confirmed!");
      setView("reset");
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Invalid or expired verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: User creates new password -> Supabase Auth updates password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    const cleanEmail = resetEmail.trim().toLowerCase();
    if (!cleanEmail) {
      return toast.error("Please enter your registered email address");
    }
    if (!newPassword) {
      return toast.error("Please enter a new password");
    }
    if (newPassword.length < 6) {
      return toast.error("Password must be at least 6 characters long");
    }
    if (newPassword !== confirmNewPassword) {
      return toast.error("Passwords do not match");
    }

    setLoading(true);
    try {
      const res = await resetPassword(newPassword, cleanEmail, otpCode.trim());
      toast.success(res.message || "Your password has been successfully updated!");
      setView("login");
      setResetEmail("");
      setOtpCode("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to update password. Please check your verification code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="w-full min-h-[calc(100vh-140px)] bg-[#F8F6F2] flex flex-col items-center justify-center px-4 py-8 cursor-pointer"
      onClick={() => navigate("/")}
    >
      <div 
        className="w-full max-w-md mb-4 flex justify-start cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-500 hover:text-slate-800 flex items-center gap-2"
          onClick={() => {
            if (view !== "login") {
              setView("login");
              setResetSent(false);
            } else {
              navigate("/");
            }
          }}
        >
          <ArrowLeft className="h-4 w-4" />
          {view === "login" ? "Back to Home" : "Back to Sign In"}
        </Button>
      </div>

      <Card 
        className="w-full max-w-md shadow-xl border border-slate-100 overflow-hidden bg-white/80 backdrop-blur-md cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-2 bg-gradient-to-r from-primary to-slate-900 w-full" />

        {view === "login" && (
          <>
            <CardHeader className="space-y-2 text-center pt-8 pb-6">
              <CardTitle className="text-3xl font-bold tracking-tight text-slate-900">
                SORECO-1 Portal
              </CardTitle>
              <CardDescription className="text-slate-500 text-sm">
                Sign in with your email and password to access the portal
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleLogin}>
              <CardContent className="space-y-5 pb-6">
                {unauthorizedNotice && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-900 text-xs flex items-start gap-3 shadow-xs animate-in fade-in">
                    <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <div className="flex-1 text-left space-y-1.5">
                      <p className="font-bold text-red-900 text-xs tracking-wider uppercase">Log In Not Authorized</p>
                      <p className="text-red-800 text-xs leading-relaxed font-medium">
                        {unauthorizedNotice}
                      </p>
                      <p className="text-slate-600 text-[11px] leading-normal">
                        Per SORECO-1 system policy, accounts registered with numbers in their name cannot be authorized. Consumers must use their complete legal name only (letters only).
                      </p>
                      <div className="pt-1">
                        <Link
                          to="/register"
                          className="inline-flex items-center gap-1 text-xs font-bold text-red-700 hover:text-red-900 underline"
                        >
                          Register a new account with complete name &rarr;
                        </Link>
                      </div>
                    </div>
                  </div>
                )}

                {signupBanner && (
                  <div className="p-3.5 bg-amber-50/90 border border-amber-200/80 rounded-xl text-amber-900 text-sm flex items-start gap-3 shadow-xs">
                    <Mail className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-amber-900 text-xs tracking-wide uppercase">Email Notice</p>
                      <p className="text-amber-800 text-xs mt-0.5 font-medium leading-relaxed">{signupBanner}</p>
                      <button
                        type="button"
                        onClick={handleResendConfirmation}
                        disabled={resendLoading}
                        className="mt-2 text-xs font-semibold text-amber-900 hover:underline flex items-center gap-1.5"
                      >
                        {resendLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                        Resend confirmation email
                      </button>
                    </div>
                  </div>
                )}

                {showResendBox && !signupBanner && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-center justify-between">
                    <span className="font-medium">Need another confirmation link?</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={resendLoading}
                      onClick={handleResendConfirmation}
                      className="text-xs h-7 border-blue-300 text-blue-700 bg-white hover:bg-blue-100"
                    >
                      {resendLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                      Resend
                    </Button>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700 font-medium">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email address"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="focus-visible:ring-primary border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
                    <button
                      type="button"
                      onClick={() => setView("forgot")}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="focus-visible:ring-primary border-slate-200 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col space-y-4 pt-0 pb-8">
                <Button
                  type="submit"
                  className="w-full text-white bg-gradient-to-br from-amber-500 to-orange-600 hover:opacity-90 transition-all text-sm font-medium h-11"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                  Sign In to Portal
                </Button>

                <div className="relative w-full">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-slate-500">Or continue with</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 font-medium h-11 flex items-center justify-center"
                  onClick={handleGoogleLogin}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Google
                </Button>

                <div className="text-center text-sm text-slate-500 pt-2">
                  Don't have a consumer account?{" "}
                  <Link to="/register" className="text-primary font-semibold hover:underline">
                    Register here
                  </Link>
                </div>
              </CardFooter>
            </form>
          </>
        )}

        {view === "forgot" && (
          <>
            <CardHeader className="space-y-2 text-center pt-8 pb-6">
              <div className="mx-auto w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-600 mb-2">
                <KeyRound className="h-6 w-6" />
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
                Forgot Password
              </CardTitle>
              <CardDescription className="text-slate-500 text-sm px-4">
                Enter your registered email address and we'll send a secure 6-digit verification code to your inbox.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSendOtp}>
              <CardContent className="space-y-5 pb-6">
                <div className="space-y-2">
                  <Label htmlFor="resetEmail" className="text-slate-700 font-medium">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="resetEmail"
                      type="email"
                      placeholder="your-email@example.com"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="pl-10 focus-visible:ring-primary border-slate-200"
                    />
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col space-y-3 pt-0 pb-8">
                <Button
                  type="submit"
                  className="w-full text-white bg-gradient-to-br from-amber-500 to-orange-600 hover:opacity-90 transition-all text-sm font-medium h-11"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Send Verification Code"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-slate-600 hover:text-slate-900 text-sm"
                  onClick={() => setView("login")}
                >
                  Cancel & Return to Sign In
                </Button>
              </CardFooter>
            </form>
          </>
        )}

        {view === "otp" && (
          <>
            <CardHeader className="space-y-2 text-center pt-8 pb-6">
              <div className="mx-auto w-12 h-12 bg-sky-50 rounded-full flex items-center justify-center text-sky-600 mb-2">
                <Mail className="h-6 w-6" />
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
                Enter Verification Code
              </CardTitle>
              <CardDescription className="text-slate-500 text-sm px-4">
                We sent a 6-digit OTP code to <strong className="text-slate-800">{resetEmail}</strong>. Please enter it below.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleVerifyOtp}>
              <CardContent className="space-y-5 pb-6">
                <div className="space-y-2">
                  <Label htmlFor="otpCode" className="text-slate-700 font-medium">6-Digit OTP Code</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="otpCode"
                      type="text"
                      maxLength={6}
                      placeholder="123456"
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      className="pl-10 tracking-widest text-lg font-mono text-center focus-visible:ring-primary border-slate-200"
                    />
                  </div>
                  <p className="text-xs text-slate-500 text-center mt-1">
                    Code expires in 10 minutes.
                  </p>
                </div>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    disabled={loading || otpResendCountdown > 0}
                    className="text-xs font-semibold text-primary hover:underline disabled:text-slate-400 disabled:no-underline"
                  >
                    {otpResendCountdown > 0
                      ? `Resend code in ${otpResendCountdown}s`
                      : "Didn't receive code? Resend OTP"}
                  </button>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col space-y-3 pt-0 pb-8">
                <Button
                  type="submit"
                  className="w-full text-white bg-gradient-to-br from-amber-500 to-orange-600 hover:opacity-90 transition-all text-sm font-medium h-11"
                  disabled={loading || otpCode.length !== 6}
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Verify Code"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-slate-600 hover:text-slate-900 text-sm"
                  onClick={() => setView("forgot")}
                >
                  Change Email Address
                </Button>
              </CardFooter>
            </form>
          </>
        )}

        {view === "reset" && (
          <>
            <CardHeader className="space-y-2 text-center pt-8 pb-6">
              <div className="mx-auto w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mb-2">
                <Lock className="h-6 w-6" />
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
                Create New Password
              </CardTitle>
              <CardDescription className="text-slate-500 text-sm">
                Enter your new secure password for <strong className="text-slate-800">{resetEmail}</strong>.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleResetPassword}>
              <CardContent className="space-y-5 pb-6">
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-slate-700 font-medium">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="••••••••"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="focus-visible:ring-primary border-slate-200 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmNewPassword" className="text-slate-700 font-medium">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmNewPassword"
                      type={showConfirmNewPassword ? "text" : "password"}
                      placeholder="••••••••"
                      required
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="focus-visible:ring-primary border-slate-200 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showConfirmNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col space-y-3 pt-0 pb-8">
                <Button
                  type="submit"
                  className="w-full text-white bg-gradient-to-br from-amber-500 to-orange-600 hover:opacity-90 transition-all text-sm font-medium h-11"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save New Password"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-slate-600 hover:text-slate-900 text-sm"
                  onClick={() => {
                    setView("login");
                    setResetEmail("");
                    setOtpCode("");
                  }}
                >
                  Cancel
                </Button>
              </CardFooter>
            </form>
          </>
        )}
      </Card>
    </div>
  );
};

