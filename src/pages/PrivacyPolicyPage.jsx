import { motion } from "motion/react";
import { Shield, FileText } from "lucide-react";

export const PrivacyPolicyPage = () => {
  return (
    <div className="bg-[#F8F6F2] py-16 md:py-24 font-sans">
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 md:p-12 rounded-[2rem] shadow-sm border border-slate-100"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary">
              <Shield className="h-8 w-8" />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 font-poppins">Privacy Policy</h1>
          </div>
          
          <div className="prose prose-slate max-w-none text-slate-600 space-y-6">
            <p className="text-lg">Last updated: October 1, 2026</p>
            <p>At SORECO-1, we value your privacy. This policy outlines how we collect, use, and protect the data you provide when using our Consumer Portal.</p>
            
            <h2 className="text-xl font-bold text-slate-900">1. Information We Collect</h2>
            <p>We collect personal information necessary for providing electrical services, such as your name, account number, address, email, and mobile number. We also collect usage data through our portal to improve service delivery.</p>
            
            <h2 className="text-xl font-bold text-slate-900">2. How We Use Your Data</h2>
            <p>Your data is used strictly for billing, service advisory notifications, account management, and providing support. We do not sell your personal information to third parties.</p>
            
            <h2 className="text-xl font-bold text-slate-900">3. Data Security</h2>
            <p>We employ industry-standard security measures to protect your personal data from unauthorized access or disclosure.</p>
            
            <h2 className="text-xl font-bold text-slate-900">4. Your Rights</h2>
            <p>You have the right to access, correct, or request the deletion of your personal data stored in our system, subject to regulatory requirements.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
