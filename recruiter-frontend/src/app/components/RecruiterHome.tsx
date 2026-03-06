import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Sparkles, Briefcase, Search, ArrowRight, UserCheck, X } from "lucide-react";

// Job roles data
const jobRoles = [
  "Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Data Scientist",
  "Data Analyst",
  "Product Manager",
  "UX/UI Designer",
  "DevOps Engineer",
  "Machine Learning Engineer",
  "Marketing Manager",
  "Business Analyst",
];

export default function RecruiterHome({ onStart }: { onStart: (data: any) => void }) {
  // Common State
  const [jobRole, setJobRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Recruiter Mode State
  const [candidateCart, setCandidateCart] = useState<any[]>([]);

  const filteredRoles = jobRoles.filter((role) =>
    role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    // Load existing cart from local storage
    let currentCart: any[] = [];
    const storedCart = localStorage.getItem("recruiterCart");
    if (storedCart) {
      try {
        currentCart = JSON.parse(storedCart);
        setCandidateCart(currentCart);
      } catch (e) { }
    }

    const params = new URLSearchParams(window.location.search);
    const dataParam = params.get("data");

    if (dataParam) {
      try {
        const data = JSON.parse(dataParam);
        if (data.mode === "recruiter") {
          // Add to cart if not present
          const exists = currentCart.find((p: any) => p.name === data.name);
          if (!exists) {
            const newCart = [...currentCart, data];
            localStorage.setItem("recruiterCart", JSON.stringify(newCart));
            setCandidateCart(newCart);
          }

          // Clear URL parameter so refreshing doesn't add multiple times, optionally
          window.history.replaceState({}, document.title, "/");
        }
      } catch (e) {
        console.error("Failed to parse URL data:", e);
      }
    }
  }, []);

  const handleRemoveCandidate = (name: string) => {
    const newCart = candidateCart.filter((c) => c.name !== name);
    setCandidateCart(newCart);
    localStorage.setItem("recruiterCart", JSON.stringify(newCart));
  };

  const handleContinue = () => {
    onStart({
      job_role: jobRole,
      job_description: jobDescription,
      candidates: candidateCart
    });
  };

  const handleRoleSelect = (role: string) => {
    setJobRole(role);
    setSearchTerm(role);
    setShowDropdown(false);
  };

  // Validation for Continue
  const canContinue = jobRole.trim() && candidateCart.length > 0;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-20%] w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-20%] left-[-20%] w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl relative z-10"
      >
        {/* Main Glass Card */}
        <div className="glass-panel rounded-3xl p-8 md:p-12 relative overflow-hidden backdrop-blur-2xl">
          {/* Header */}
          <div className="text-center mb-10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.8 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 bg-gradient-to-br from-primary to-indigo-600 shadow-lg shadow-indigo-500/25"
            >
              <Users className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-5xl font-bold text-foreground mb-4 tracking-tight">
              Resum<span className="text-primary">Xpert</span> <span className="text-2xl opacity-70">for Recruiters</span>
            </h1>
            <p className="text-xl text-foreground opacity-80 max-w-2xl mx-auto">
              Bulk analyze candidate profiles and rank talent by exact role-fit to find your next hire.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Job Details */}
            <div className="bg-background/40 border border-primary/20 rounded-2xl p-8 backdrop-blur-md flex flex-col h-full">
              <div className="flex items-center gap-2 mb-6">
                <Briefcase className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-bold text-foreground opacity-80 uppercase tracking-wider">Campaign Details</h3>
              </div>

              <div className="space-y-6 flex-1">
                {/* Job Role Input */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Target Job Role</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground opacity-50">
                      <Search className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setJobRole(e.target.value);
                        setShowDropdown(true);
                      }}
                      onFocus={() => setShowDropdown(true)}
                      placeholder="e.g. Senior Frontend Engineer"
                      className="w-full bg-background/50 border border-primary/20 rounded-xl py-3 pl-12 pr-4 text-foreground placeholder:text-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    />
                    {showDropdown && filteredRoles.length > 0 && (
                      <div className="absolute z-50 w-full mt-2 bg-background border border-primary/20 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                        {filteredRoles.map((role) => (
                          <div
                            key={role}
                            onClick={() => handleRoleSelect(role)}
                            className="px-4 py-3 cursor-pointer text-foreground hover:bg-primary/10 transition-colors border-b border-primary/10 last:border-0"
                          >
                            {role}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Job Description Input */}
                <div className="flex-1 flex flex-col">
                  <label className="block text-sm font-medium text-foreground mb-2">Job Description <span className="text-primary">*Required for ATS Check</span></label>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the target job description here..."
                    className="w-full h-full min-h-[150px] bg-background/50 border border-primary/20 rounded-xl p-4 text-foreground placeholder:text-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Right: Candidate Cart */}
            <div className="bg-background/40 border border-primary/20 rounded-2xl p-8 backdrop-blur-md flex flex-col h-[500px]">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-primary" />
                  <h3 className="text-sm font-bold text-foreground opacity-80 uppercase tracking-wider">Candidate Pool</h3>
                </div>
                <div className="bg-primary/20 text-primary text-xs font-bold px-3 py-1 rounded-full">
                  {candidateCart.length} Added
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                <AnimatePresence>
                  {candidateCart.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="h-full flex flex-col items-center justify-center text-center px-4"
                    >
                      <Sparkles className="w-12 h-12 text-foreground opacity-20 mb-4" />
                      <p className="text-foreground opacity-60 text-sm">
                        No candidates added yet.<br />
                        Use the <strong>ResumXpert Extension</strong> on LinkedIn to add candidates to this analysis pool.
                      </p>
                    </motion.div>
                  ) : (
                    candidateCart.map((candidate, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20, height: 0 }}
                        className="bg-background/80 border border-primary/10 p-3 rounded-xl flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-primary">
                              {candidate.name.charAt(0)}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{candidate.name}</p>
                            <p className="text-xs text-foreground opacity-60 truncate">{candidate.headline}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveCandidate(candidate.name)}
                          className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10 rounded-md text-red-500 shrink-0"
                          title="Remove from pool"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="flex justify-center mt-10">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleContinue}
              disabled={!canContinue}
              className={`px-10 py-4 rounded-xl font-bold text-lg flex items-center gap-2 shadow-xl transition-all ${canContinue
                ? "bg-gradient-to-r from-primary to-indigo-600 text-primary-foreground hover:shadow-indigo-500/25"
                : "bg-foreground/10 text-foreground/40 cursor-not-allowed"
                }`}
            >
              Analyze Candidate Pool <ArrowRight className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}