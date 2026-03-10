import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-50 border-t border-slate-200 py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20">
             <span className="text-primary font-black text-sm italic">RX</span>
          </div>
          <span className="font-bold text-gray-900">ResumXpert</span>
        </div>

        <div className="flex gap-8 text-sm font-medium text-gray-500">
          <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-primary transition-colors">Contact Us</a>
        </div>

        <p className="text-sm text-gray-400">
          &copy; {new Date().getFullYear()} ResumXpert. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
