import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Briefcase, Search, ArrowRight, Upload, FileText, CheckCircle } from "lucide-react";

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

export default function SeekerHome({ onStart }: { onStart: (data: any) => void }) {
  // Extension Data State
  const [extensionData, setExtensionData] = useState<any>(null);

  // Manual Flow State
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  // Common State
  const [jobRole, setJobRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredRoles = jobRoles.filter((role) =>
    role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dataParam = params.get("data");

    if (dataParam) {
      try {
        const data = JSON.parse(dataParam);
        if (data.mode === "seeker") {
          setExtensionData(data); // Store extension data
        }
      } catch (e) {
        console.error("Failed to parse URL data:", e);
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setResumeFile(e.target.files[0]);
      setExtensionData(null); // Clear extension data if user uploads manually
    }
  };

  const handleContinue = () => {
    const payload: any = {
      job_role: jobRole,
      job_description: jobDescription,
    };

    if (resumeFile) {
      payload.resumeFile = resumeFile;
      payload.mode = "manual";
    } else if (extensionData) {
      payload.extensionData = extensionData;
      payload.mode = "extension";
    }

    onStart(payload);
  };

  const handleRoleSelect = (role: string) => {
    setJobRole(role);
    setSearchTerm(role);
    setShowDropdown(false);
  };

  // Validation for Continue
  const canContinue = !!jobRole.trim() && (!!resumeFile || !!extensionData);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-20%] w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-20%] left-[-20%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl relative z-10"
      >
        <div className="glass-panel rounded-3xl p-8 md:p-12 relative overflow-hidden backdrop-blur-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.8 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 bg-gradient-to-br from-primary to-orange-400 shadow-lg shadow-primary/25"
            >
              <Sparkles className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-5xl font-bold text-foreground mb-4 tracking-tight">
              Resum<span className="text-primary">Xpert</span> <span className="text-2xl opacity-70">for Seekers</span>
            </h1>
            <p className="text-xl text-foreground opacity-80 max-w-2xl mx-auto">
              Analyze your profile against your target role to get a personalized ATS report and learning roadmap.
            </p>
          </div>

          {/* Flow Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Left Column: Input Method */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <Upload className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-bold text-foreground opacity-80 uppercase tracking-wider">Analysis Profile</h3>
              </div>

              {extensionData ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-primary/10 border border-primary/30 rounded-2xl p-6 relative overflow-hidden group"
                >
                  <div className="absolute top-[-10px] right-[-10px] bg-primary/20 w-20 h-20 rounded-full blur-2xl group-hover:bg-primary/30 transition-colors"></div>
                  <div className="flex items-start gap-4 relative z-10">
                    <div className="bg-primary text-white p-3 rounded-xl shadow-lg shadow-primary/20">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground text-lg mb-1">{extensionData.name}</h4>
                      <p className="text-sm text-foreground opacity-70 mb-3">{extensionData.headline}</p>
                      <button
                        onClick={() => setExtensionData(null)}
                        className="text-xs font-bold text-primary hover:underline uppercase tracking-widest"
                      >
                        Change to Manual Upload
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  <div className="relative group">
                    <input
                      type="file"
                      id="resume-upload"
                      className="hidden"
                      accept=".pdf"
                      onChange={handleFileChange}
                    />
                    <label
                      htmlFor="resume-upload"
                      className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-all duration-300 ${resumeFile
                        ? "border-emerald-500/50 bg-emerald-500/5"
                        : "border-primary/20 bg-primary/5 hover:border-primary/50 hover:bg-primary/10"
                        }`}
                    >
                      {resumeFile ? (
                        <>
                          <FileText className="w-12 h-12 text-emerald-500 mb-4" />
                          <span className="text-emerald-700 font-bold">{resumeFile.name}</span>
                          <span className="text-xs text-emerald-600 mt-2">Resume successfully selected</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-12 h-12 text-primary opacity-50 mb-4 group-hover:scale-110 transition-transform" />
                          <span className="text-foreground font-bold">Upload Resume (PDF)</span>
                          <span className="text-xs text-foreground opacity-50 mt-2 text-center">Drag and drop or click to browse</span>
                        </>
                      )}
                    </label>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-primary/10"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-[#FFF5F5] px-4 text-foreground opacity-40 font-bold tracking-widest">or</span>
                    </div>
                  </div>

                  <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6 text-center">
                    <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
                    <h4 className="font-bold text-foreground mb-1">Use Browser Extension</h4>
                    <p className="text-xs text-foreground opacity-60 mb-4">Analyze directly from your LinkedIn profile for live data.</p>
                    <div className="text-[10px] font-bold text-primary uppercase tracking-tighter opacity-80 animate-pulse">Waiting for Extension Data...</div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Job Details */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-bold text-foreground opacity-80 uppercase tracking-wider">Target Job Details</h3>
              </div>

            <div className="space-y-6">
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
                    placeholder="e.g. Frontend Developer"
                    className="w-full bg-background/50 border border-primary/20 rounded-xl py-4 pl-12 pr-4 text-foreground placeholder:text-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
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
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Job Description (Optional but Recommended)</label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the target job description here..."
                  rows={4}
                  className="w-full bg-background/50 border border-primary/20 rounded-xl p-4 text-foreground placeholder:text-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
                />
              </div>
            </div>
          </div>
        </div>

          <div className="flex justify-center pb-4">
            <motion.button
              whileHover={canContinue ? { scale: 1.05 } : {}}
              whileTap={canContinue ? { scale: 0.95 } : {}}
              onClick={handleContinue}
              disabled={!canContinue}
              className={`px-10 py-4 rounded-xl font-bold text-lg flex items-center gap-2 shadow-xl transition-all ${canContinue
                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/25"
                : "bg-foreground/10 text-foreground/40 cursor-not-allowed opacity-50"
                }`}
            >
              Analyze Profile <ArrowRight className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}