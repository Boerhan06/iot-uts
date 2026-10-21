import React from "react";
import { AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface InterlockAlertProps {
  message: string | null;
  onDismiss: () => void;
}

export const InterlockAlert: React.FC<InterlockAlertProps> = ({
  message,
  onDismiss,
}) => {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -40, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="fixed top-5 inset-x-4 max-w-2xl mx-auto z-50 bg-rose-900/95 text-white p-4 rounded-2xl shadow-2xl border border-rose-500 backdrop-blur-md flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-800 text-rose-200 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-rose-200">
                ⚠️ Interlock Keselamatan Menolak Perintah (Skenario 3)
              </p>
              <p className="text-xs text-rose-100 font-medium mt-0.5 leading-snug">
                {message}
              </p>
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="p-1.5 rounded-lg hover:bg-rose-800/80 text-rose-300 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
