import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Search, ChevronRight, ArrowLeft, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api } from "@/src/lib/api";

export const BARANGAYS = [
  "A. Bonifacio", "Abad Santos", "Aguinaldo", "Antipolo", "Beguin",
  "Benigno S. Aquino", "Bical", "Bonga", "Butag", "Cadandanan",
  "Calomagon", "Calpi", "Cocok-Cabitan", "Daganas", "Danao",
  "Dolos", "E. Quirino", "Fabrica", "G. Del Pilar", "Gate",
  "Inararan", "J. Gerona", "J.P. Laurel", "Jamorawon", "Lajong",
  "Libertad", "M. Roxas", "Magsaysay", "Managanaga", "Marinab",
  "Montecalvario", "N. Roque", "Namo", "Nasuje", "Obrero",
  "Osmeña", "Otavi", "Padre Diaz", "Palale", "Quezon",
  "R. Gerona", "Recto", "Sagrada", "San Francisco", "San Isidro",
  "San Juan Bag-o", "San Juan Daan", "San Rafael", "San Ramon",
  "San Vicente", "Santa Remedios", "Santa Teresita", "Sigad",
  "Somagongsong", "Taromata", "Zone I Poblacion", "Zone II Poblacion",
  "Zone III Poblacion", "Zone IV Poblacion", "Zone V Poblacion",
  "Zone VI Poblacion", "Zone VII Poblacion", "Zone VIII Poblacion"
];

export const BarangaysPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const data = await api.tickets.list();
        setTickets(data);
      } catch (err) {
        console.error("Failed to load tickets", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, []);

  const filteredBarangays = BARANGAYS.filter(brgy => 
    brgy.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTicketCount = (barangayName) => {
    return tickets.filter(ticket => {
      const address = ticket.address ? ticket.address.toLowerCase() : "";
      return address.includes(barangayName.toLowerCase()) && ticket.status !== "resolved";
    }).length;
  };

  const handleBarangayClick = (barangay) => {
    navigate(`/barangays/${encodeURIComponent(barangay)}`);
  };

  return (
    <div className="min-h-screen bg-[#F8F6F2] pb-12">
      <div className="container mx-auto px-4 pt-6 max-w-6xl">
        <button 
          onClick={() => navigate('/admin')}
          className="flex items-center gap-2 text-slate-500 hover:text-orange-600 mb-6 font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>

        <div className="bg-gradient-to-r from-[#E65100] to-[#FF7043] rounded-3xl sm:rounded-[2rem] px-8 py-8 mb-10 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-black opacity-10 rounded-full translate-y-1/3 -translate-x-1/4 pointer-events-none" />
          
          <div className="relative z-10 flex items-center gap-4">
            <div className="hidden sm:flex p-3 bg-white/20 rounded-2xl backdrop-blur-sm shadow-inner">
              <MapPin className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Barangay Directory</h1>
              <p className="text-orange-100 text-sm mt-1.5 font-medium">Select a barangay to view local requests</p>
            </div>
          </div>
          
          <div className="relative z-10 w-full max-w-md flex items-center gap-4">
            <div className="relative flex-1 group">
              <Input
                type="text"
                placeholder="Search a Barangay..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-12 pl-12 pr-4 rounded-xl border-none shadow-md text-sm text-slate-800 bg-white/95 focus:bg-white focus-visible:ring-2 focus-visible:ring-orange-300 transition-all placeholder:text-slate-400"
              />
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E65100] border-t-transparent" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6 px-2 sm:px-0">
            {filteredBarangays.map((barangay) => {
              const count = getTicketCount(barangay);
              return (
                <div 
                  key={barangay}
                  onClick={() => handleBarangayClick(barangay)}
                  className="group relative bg-white rounded-2xl p-5 h-36 flex flex-col items-center justify-center shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_12px_30px_rgb(230,81,0,0.15)] cursor-pointer transition-all duration-300 border border-slate-100 hover:border-orange-200 transform hover:-translate-y-1"
                >
                  <div className="absolute top-4 left-4 text-slate-100 group-hover:text-orange-100 transition-colors duration-300">
                    <MapPin className="h-6 w-6" />
                  </div>
                  
                  {count > 0 && (
                    <div className="absolute -top-3 -right-3 h-7 w-7 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold shadow-md border-2 border-white z-10 animate-in zoom-in duration-300">
                      {count}
                    </div>
                  )}
                  
                  <h3 className="text-base font-semibold text-slate-700 group-hover:text-orange-700 text-center tracking-wide transition-colors duration-300 mt-2 z-10 line-clamp-2 px-2">
                    {barangay}
                  </h3>

                  {count === 0 ? (
                    <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider mt-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">No active</span>
                  ) : (
                    <span className="text-[9px] text-orange-600 font-bold uppercase tracking-wider mt-3 z-10 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">Active</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BarangaysPage;
