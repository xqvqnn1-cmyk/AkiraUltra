import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ZoomOut, Image, ImagePlus } from 'lucide-react';

export default function AvatarEditModal({ currentAvatarUrl, displayName, userEmail, onApply, onClose, onBannerUpload }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(currentAvatarUrl || null);
  const [zoom, setZoom] = useState(1);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setZoom(1);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(currentAvatarUrl || null);
    setZoom(1);
  };

  const handleApply = async () => {
    if (!selectedFile) { onClose(); return; }
    setUploading(true);
    await onApply(selectedFile);
    setUploading(false);
    onClose();
  };

  // Generate initials avatar color
  const getColor = (email) => {
    const colors = ['#f97316', '#8b5cf6', '#06b6d4', '#10b981', '#ec4899', '#f59e0b'];
    if (!email) return colors[0];
    let sum = 0;
    for (let i = 0; i < email.length; i++) sum += email.charCodeAt(i);
    return colors[sum % colors.length];
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 16 }}
        transition={{ duration: 0.18 }}
        className="relative w-[420px] bg-[#0f1115] rounded-2xl shadow-2xl border border-white/8 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <h2 className="text-white font-bold text-lg">Edit Image</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Avatar preview */}
        <div className="px-6 pb-4">
          <div
            className="w-full h-56 bg-[#1a1d23] rounded-xl flex items-center justify-center cursor-pointer relative overflow-hidden group"
            onClick={() => fileInputRef.current?.click()}
          >
            {previewUrl ? (
              <div
                className="w-44 h-44 rounded-full border-4 border-white shadow-2xl overflow-hidden flex-shrink-0"
                style={{ transform: `scale(${zoom})`, transition: 'transform 0.1s' }}
              >
                <img src={previewUrl} alt="Avatar preview" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div
                className="w-44 h-44 rounded-full border-4 border-white shadow-2xl flex items-center justify-center text-5xl font-black text-white"
                style={{ background: getColor(userEmail), transform: `scale(${zoom})`, transition: 'transform 0.1s' }}
              >
                {(displayName || userEmail || 'U')[0].toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <p className="text-white text-sm font-semibold">Click to change</p>
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

          {/* Zoom slider */}
          <div className="flex items-center gap-3 mt-4">
            <button onClick={() => setZoom(v => Math.max(0.5, v - 0.1))} className="p-1.5 rounded-lg bg-[#1a1d23] hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex-shrink-0">
              <ZoomOut className="w-4 h-4" />
            </button>
            <input
              type="range" min="0.5" max="2" step="0.05"
              value={zoom}
              onChange={e => setZoom(parseFloat(e.target.value))}
              className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-violet-500"
            />
            <button onClick={() => setZoom(v => Math.min(2, v + 0.1))} className="p-1.5 rounded-lg bg-[#1a1d23] hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex-shrink-0">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="p-1.5 rounded-lg bg-[#1a1d23] hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex-shrink-0">
              <Image className="w-4 h-4" />
            </button>
          </div>

          {/* Banner upload card */}
          <div className="mt-4 flex items-center justify-between bg-[#1a1d23] rounded-xl px-4 py-3">
            <div className="flex items-center gap-2">
              <ImagePlus className="w-4 h-4 text-violet-400 flex-shrink-0" />
              <div>
                <p className="text-sm text-white font-semibold">Upload Banner Picture</p>
                <p className="text-xs text-gray-500">Set a custom profile banner</p>
              </div>
            </div>
            <button
              onClick={() => onBannerUpload?.()}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#2a2d35] hover:bg-white/10 border border-white/10 transition-all"
            >
              Upload
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
          <button onClick={handleReset} className="text-sm text-violet-400 hover:text-violet-300 transition-colors font-medium">
            Reset
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-semibold border border-white/10 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={uploading}
              className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-bold transition-colors flex items-center gap-2"
            >
              {uploading ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
              Apply
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}