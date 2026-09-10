import { CheckCircle2, Clock, Truck, CheckCircle, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
export const ServiceTracker = ({ status }) => {
  const stages = [
    { id: "pending", label: "Submitted", icon: <Clock className="h-5 w-5" /> },
    { id: "reviewing", label: "Admin Reviewing", icon: <CheckCircle2 className="h-5 w-5" /> },
    { id: "dispatched", label: "Crew Dispatched", icon: <Truck className="h-5 w-5" /> },
    { id: "resolved", label: "Resolved", icon: <CheckCircle className="h-5 w-5" /> }
  ];
  const isClearerPicture = status === "asking for a clearer picture" || status === "clearer_picture";
  const getCurrentIndex = () => {
    if (isClearerPicture) return 1;
    return stages.findIndex((s) => s.id === status);
  };
  const currentIndex = getCurrentIndex();
  return <div className="w-full py-4 space-y-4">
      <div className="relative flex justify-between">
        
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 z-0" />
        <div
    className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-br from-amber-500 to-orange-600 -translate-y-1/2 z-0 transition-all duration-500"
    style={{ width: `${Math.max(0, currentIndex) / (stages.length - 1) * 100}%` }}
  />

        {stages.map((stage, index) => {
    const isActive = index <= currentIndex;
    const isCurrent = index === currentIndex;
    return <div key={stage.id} className="relative z-10 flex flex-col items-center">
              <div
      className={cn(
        "h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300",
        isActive ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white scale-110 shadow-lg shadow-primary/20" : "bg-white text-slate-300 border-2 border-slate-100",
        isCurrent && "ring-4 ring-primary/20"
      )}
    >
                {stage.icon}
              </div>
              <span className={cn(
      "mt-2 text-[10px] sm:text-xs font-medium text-center max-w-[80px]",
      isActive ? "text-primary" : "text-slate-400"
    )}>
                {stage.label}
              </span>
            </div>;
  })}
      </div>

      {isClearerPicture && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 text-xs font-medium">
          <Camera className="h-4 w-4 text-orange-600 shrink-0 animate-pulse" />
          <span>
            <strong>Action Needed:</strong> Our personnel requested a clearer photo of your evidence. Please upload a new image below.
          </span>
        </div>
      )}
    </div>;
};
