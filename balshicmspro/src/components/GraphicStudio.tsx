import React, { useState, useRef, useEffect } from 'react';
import defaultTemplateOverlayUrl from '../balshitemplate.png';
import {
  Upload,
  Calendar,
  Clock,
  Download,
  Send,
  Sliders,
  RotateCcw,
  Eye,
  CheckCircle,
  AlertCircle,
  FileText,
  Type,
  Maximize2,
  Sparkles,
  Layers,
  Check,
  Trash2,
  ZoomIn,
  Move,
  RotateCw,
  Image as ImageIcon
} from 'lucide-react';
import { PostItem } from '../types';

interface GraphicStudioProps {
  onSchedulePost: (post: Omit<PostItem, 'id' | 'status'>) => void;
  templateOverlayUrl?: string;
  templateError?: string | null;
}

const DEFAULT_BOUNDS = {
  boxX: 60,
  boxY: 1190,
  maxWidth: 1040,
  maxHeight: 240,
  initialFontSize: 45, // Strictly 45px
  tracking: -50,       // Photoshop -50 tracking
  lineSpacing: 12,
};

const DEFAULT_TRANSFORMS = {
  zoom: 1.0,
  panX: 0,
  panY: 0,
  rotation: 0,
};

export const GraphicStudio: React.FC<GraphicStudioProps> = ({
  onSchedulePost,
  templateOverlayUrl,
  templateError: externalTemplateError,
}) => {
  // Form fields
  const [headlineText, setHeadlineText] = useState('MARKETS SURGE AS TECH LEADERS RATIFY HISTORIC PROTOCOL ACCORD');
  const [caption, setCaption] = useState(
    "Major technological and market shifts unfold today as premier operators post record quarterly expansions.\n\nRead our comprehensive breakdown in bio.\n\n#balshi #breaking #markets #technology #news"
  );
  const [scheduleDate, setScheduleDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [scheduleTime, setScheduleTime] = useState('14:30');

  // Photo
  const [photoUrl, setPhotoUrl] = useState<string>('https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=1200&auto=format&fit=crop');
  const [photoFileName, setPhotoFileName] = useState<string>('market_floor.jpg');

  // Photo Transforms: Zoom, Pan X, Pan Y, Rotation
  const [transforms, setTransforms] = useState(DEFAULT_TRANSFORMS);

  // Bounding Box & Typography customization
  const [bounds, setBounds] = useState(DEFAULT_BOUNDS);
  const [showBoundingBoxGuide, setShowBoundingBoxGuide] = useState(false);

  // Master Collapsible Visual Adjusters Drawer (collapsed by default)
  const [showVisualAdjusters, setShowVisualAdjusters] = useState(false);

  // Status & Feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [scheduledSuccess, setScheduledSuccess] = useState(false);

  // Canvas ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Handle Photo File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPhotoUrl(event.target.result as string);
          showToast(`Uploaded ${file.name}`);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Internal template error state
  const [internalTemplateError, setInternalTemplateError] = useState<string | null>(null);
  const effectiveTemplateError = externalTemplateError || internalTemplateError;
  const effectiveTemplateUrl = templateOverlayUrl || defaultTemplateOverlayUrl || '/balshitemplate.png';

  // Render Canvas (1170x1463) with Strict 3-Layer Composite Pipeline:
  // Layer 1: Base Photo with Cover-Scale, Zoom, Pan, and Rotation
  // Layer 2: Master Overlay Template 'balshitemplate.png' pasted with alpha channel
  // Layer 3: Dynamic Headline Text strictly ON TOP of all visual elements
  // ZERO procedural shapes, ZERO fillRect, ZERO strokeRect.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 1170;
    canvas.height = 1463;

    let isCancelled = false;
    let photoLoaded = false;
    let templateLoaded = false;

    const photoImg = new Image();
    photoImg.crossOrigin = 'anonymous';

    const templateImg = new Image();
    templateImg.crossOrigin = 'anonymous';

    const drawPipeline = () => {
      if (isCancelled || !photoLoaded || !templateLoaded) return;

      const cW = 1170;
      const cH = 1463;
      const imgW = photoImg.naturalWidth || photoImg.width;
      const imgH = photoImg.naturalHeight || photoImg.height;

      // Clear previous frame
      ctx.clearRect(0, 0, cW, cH);

      // =====================================================================
      // LAYER 1: Draw the uploaded user photo (scaled to cover 1170x1463, applying pan, zoom, rotation)
      // =====================================================================
      const baseScale = Math.max(cW / Math.max(1, imgW), cH / Math.max(1, imgH));
      const effectiveScale = baseScale * transforms.zoom;
      const renderW = imgW * effectiveScale;
      const renderH = imgH * effectiveScale;

      ctx.save();
      if (transforms.rotation !== 0) {
        ctx.translate(cW / 2 + transforms.panX, cH / 2 + transforms.panY);
        ctx.rotate((transforms.rotation * Math.PI) / 180);
        ctx.drawImage(photoImg, -renderW / 2, -renderH / 2, renderW, renderH);
      } else {
        const offsetX = (cW - renderW) / 2 + transforms.panX;
        const offsetY = (cH - renderH) / 2 + transforms.panY;
        ctx.drawImage(photoImg, offsetX, offsetY, renderW, renderH);
      }
      ctx.restore();

      // =====================================================================
      // LAYER 2: Draw the loaded template overlay (balshitemplate.png)
      // Strictly ctx.drawImage(templateImg, 0, 0, 1170, 1463)
      // Contains the authentic gradient, watermark, and [BREAKING] badge.
      // =====================================================================
      ctx.drawImage(templateImg, 0, 0, 1170, 1463);

      // =====================================================================
      // LAYER 3: Render the left-aligned headline text with Roboto-Black,
      // applying the -50 Photoshop tracking offset.
      // =====================================================================
      if (headlineText && headlineText.trim()) {
        const words = headlineText.trim().split(/\s+/);
        let fontSize = bounds.initialFontSize;
        const minFontSize = 18;
        let wrappedLines: string[] = [];
        let finalSpacingOffset = (bounds.tracking / 1000) * fontSize;

        // Auto-decrement loop to fit text within bounding dimensions
        while (fontSize >= minFontSize) {
          ctx.font = `900 ${fontSize}px "Roboto Black", "Roboto", -apple-system, BlinkMacSystemFont, sans-serif`;
          const spacingOffset = (bounds.tracking / 1000) * fontSize;
          finalSpacingOffset = spacingOffset;

          wrappedLines = [];
          let currentWords: string[] = [];

          const measureTrackedWidth = (lineStr: string) => {
            let w = 0;
            for (let i = 0; i < lineStr.length; i++) {
              w += ctx.measureText(lineStr[i]).width;
              if (i < lineStr.length - 1) {
                w += spacingOffset;
              }
            }
            return w;
          };

          for (const word of words) {
            const testLine = currentWords.length > 0 ? `${currentWords.join(' ')} ${word}` : word;
            const lineW = measureTrackedWidth(testLine);
            if (lineW <= bounds.maxWidth || currentWords.length === 0) {
              currentWords.push(word);
            } else {
              wrappedLines.push(currentWords.join(' '));
              currentWords = [word];
            }
          }
          if (currentWords.length > 0) {
            wrappedLines.push(currentWords.join(' '));
          }

          const lineH = fontSize * 1.12;
          const totalHeight = (wrappedLines.length * lineH) + Math.max(0, wrappedLines.length - 1) * bounds.lineSpacing;

          if (totalHeight <= bounds.maxHeight) {
            break;
          }
          fontSize -= 1;
        }

        ctx.font = `900 ${fontSize}px "Roboto Black", "Roboto", -apple-system, BlinkMacSystemFont, sans-serif`;
        const lineH = fontSize * 1.12;
        let curY = bounds.boxY;

        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        wrappedLines.forEach((line) => {
          let cursorX = bounds.boxX; // Strictly LEFT ALIGNED

          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const charW = ctx.measureText(char).width;

            // Subtle drop shadow for legibility
            ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            ctx.fillText(char, cursorX + 2, curY + 2);

            // Crisp headline text in Roboto Black
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(char, cursorX, curY);

            cursorX += charW + finalSpacingOffset;
          }

          curY += lineH + bounds.lineSpacing;
        });
      }
    };

    photoImg.onload = () => {
      if (isCancelled) return;
      photoLoaded = true;
      drawPipeline();
    };

    photoImg.onerror = () => {
      if (isCancelled) return;
      // Do not draw fallback shapes
    };

    templateImg.onload = () => {
      if (isCancelled) return;
      templateLoaded = true;
      setInternalTemplateError(null);
      drawPipeline();
    };

    templateImg.onerror = () => {
      if (isCancelled) return;
      templateLoaded = false;
      setInternalTemplateError("Error: Failed to load balshitemplate.png");
      // Strictly do not draw fallback shapes
    };

    photoImg.src = photoUrl;
    templateImg.src = effectiveTemplateUrl;

    return () => {
      isCancelled = true;
    };
  }, [photoUrl, effectiveTemplateUrl, headlineText, bounds, transforms]);

  // Handle Export JPG
  const handleExportJpg = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.download = `balshi_${Date.now()}_1170x1463.jpg`;
      link.href = dataUrl;
      link.click();
      showToast('Downloaded high-res 1170×1463 JPEG!');
    } catch {
      showToast('Direct download blocked by cross-origin. Use Schedule Post.');
    }
  };

  // Handle Schedule Post
  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!headlineText.trim()) {
      showToast('Please enter a headline');
      return;
    }

    const canvas = canvasRef.current;
    let imageDataUrl: string | undefined = undefined;
    if (canvas) {
      try {
        imageDataUrl = canvas.toDataURL('image/jpeg', 0.92);
      } catch {
        imageDataUrl = undefined;
      }
    }

    const targetDate = new Date(`${scheduleDate}T${scheduleTime}:00`);
    const epoch = Math.floor(targetDate.getTime() / 1000);

    onSchedulePost({
      title: headlineText.trim(),
      image_path: `ready/balshi_${epoch}_${Date.now()}.jpg`,
      caption: caption.trim(),
      post_timestamp: epoch,
      imageDataUrl: imageDataUrl,
      previewUrl: photoUrl
    });

    setScheduledSuccess(true);
    showToast('Post scheduled successfully into SQLite queue!');
    setTimeout(() => setScheduledSuccess(false), 4000);
  };

  const currentSpacingPx = ((bounds.tracking / 1000) * bounds.initialFontSize).toFixed(2);

  return (
    <div id="graphic-studio-container" className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 bg-emerald-950 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-lg shadow-2xl animate-fade-in text-sm font-medium">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Balshi Instagram Creator CMS</h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              3-LAYER COMPOSITOR
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Strict 3-Layer Pipeline • <span className="text-slate-200">balshitemplate.png</span> • Left-Aligned Roboto Black with -50 Tracking
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
            1170×1463 (4:5)
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px]">
            Font: {bounds.initialFontSize}px ({-50} tracking)
          </div>
        </div>
      </div>

      {/* Error Banner if master template fails to load */}
      {effectiveTemplateError && (
        <div id="template-error-banner" className="p-4 rounded-xl bg-red-950/90 border-2 border-red-500 text-red-200 flex items-center gap-3 text-sm font-bold shadow-lg">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{effectiveTemplateError}</span>
        </div>
      )}

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Controls & Form */}
        <div className="lg:col-span-6 xl:col-span-5 space-y-5">
          <form onSubmit={handleScheduleSubmit} className="space-y-4">
            {/* Section 1: Post Details */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3.5 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                1. Headline & Imagery
              </h2>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Headline (Renders on Graphic & Saves internally)
                </label>
                <textarea
                  value={headlineText}
                  onChange={(e) => setHeadlineText(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg p-2.5 text-sm text-white font-medium focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                  placeholder="Enter headline text..."
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Background Photo
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition-colors shadow-sm">
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Choose Photo File...</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono truncate max-w-[140px]">
                    {photoFileName}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Instagram Caption
                </label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg p-2.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                  placeholder="Enter caption and hashtags..."
                />
              </div>
            </div>

            {/* Master Toggle Button for Visual Adjusters */}
            <div className="space-y-3">
              <button
                type="button"
                id="btn-toggle-visual-adjusters"
                onClick={() => setShowVisualAdjusters(!showVisualAdjusters)}
                className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.97] shadow-md border cursor-pointer ${
                  showVisualAdjusters
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 border-emerald-300 shadow-emerald-500/25 ring-2 ring-emerald-400/20'
                    : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700/80 hover:border-slate-600 shadow-slate-950/40'
                }`}
              >
                {showVisualAdjusters ? (
                  <>
                    <span className="text-sm">✖️</span>
                    <span>Hide Visual Adjusters</span>
                  </>
                ) : (
                  <>
                    <span className="text-sm">⚙️</span>
                    <span>Open Visual Adjusters</span>
                  </>
                )}
              </button>

              {/* Collapsible Panel: 3 Segmented Sub-Sections */}
              {showVisualAdjusters && (
                <div id="visual-adjusters-container" className="space-y-4 pt-1 animate-fade-in">
                  {/* Sub-Section 1: 🖼️ Image Transform Controls */}
                  <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm space-y-3.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                        <span className="text-sm">🖼️</span>
                        <span>Image Transform Controls</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => setTransforms(DEFAULT_TRANSFORMS)}
                        className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors px-2 py-0.5 rounded hover:bg-slate-800 border border-slate-800"
                        title="Reset zoom, pan, and rotation"
                      >
                        <RotateCcw className="w-3 h-3 text-slate-400" />
                        <span>Reset</span>
                      </button>
                    </div>

                    <div className="space-y-3 pt-1 text-xs">
                      {/* Zoom and Rotation */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="flex justify-between text-slate-300 mb-1">
                            <span className="flex items-center gap-1">
                              <ZoomIn className="w-3 h-3 text-emerald-400" />
                              Zoom
                            </span>
                            <span className="font-mono text-emerald-400 font-bold">
                              {transforms.zoom.toFixed(2)}x
                            </span>
                          </div>
                          <input
                            type="range"
                            min={1.0}
                            max={3.0}
                            step={0.05}
                            value={transforms.zoom}
                            onChange={(e) => setTransforms({ ...transforms, zoom: parseFloat(e.target.value) || 1.0 })}
                            className="w-full accent-emerald-400 cursor-pointer"
                            title="Zoom (1.0x – 3.0x)"
                          />
                          <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                            <span>1.0x</span>
                            <span>3.0x</span>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-slate-300 mb-1">
                            <span className="flex items-center gap-1">
                              <RotateCw className="w-3 h-3 text-cyan-400" />
                              Rotation
                            </span>
                            <span className="font-mono text-cyan-300 font-bold">
                              {transforms.rotation > 0 ? `+${transforms.rotation}` : transforms.rotation}°
                            </span>
                          </div>
                          <input
                            type="range"
                            min={-45}
                            max={45}
                            step={1}
                            value={transforms.rotation}
                            onChange={(e) => setTransforms({ ...transforms, rotation: parseInt(e.target.value) || 0 })}
                            className="w-full accent-cyan-400 cursor-pointer"
                            title="Rotation (-45° – +45°)"
                          />
                          <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                            <span>-45°</span>
                            <span>0°</span>
                            <span>+45°</span>
                          </div>
                        </div>
                      </div>

                      {/* Pan X and Pan Y */}
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                        <div>
                          <div className="flex justify-between text-slate-300 mb-1">
                            <span className="flex items-center gap-1">
                              <Move className="w-3 h-3 text-slate-400" />
                              Pan X
                            </span>
                            <span className="font-mono text-slate-300">
                              {transforms.panX > 0 ? `+${transforms.panX}` : transforms.panX}px
                            </span>
                          </div>
                          <input
                            type="range"
                            min={-600}
                            max={600}
                            step={5}
                            value={transforms.panX}
                            onChange={(e) => setTransforms({ ...transforms, panX: parseInt(e.target.value) || 0 })}
                            className="w-full accent-emerald-400 cursor-pointer"
                            title="Pan X (-600px – +600px)"
                          />
                          <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                            <span>-600px</span>
                            <span>+600px</span>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-slate-300 mb-1">
                            <span className="flex items-center gap-1">
                              <Move className="w-3 h-3 text-slate-400" />
                              Pan Y
                            </span>
                            <span className="font-mono text-slate-300">
                              {transforms.panY > 0 ? `+${transforms.panY}` : transforms.panY}px
                            </span>
                          </div>
                          <input
                            type="range"
                            min={-600}
                            max={600}
                            step={5}
                            value={transforms.panY}
                            onChange={(e) => setTransforms({ ...transforms, panY: parseInt(e.target.value) || 0 })}
                            className="w-full accent-emerald-400 cursor-pointer"
                            title="Pan Y (-600px – +600px)"
                          />
                          <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                            <span>-600px</span>
                            <span>+600px</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sub-Section 2: ✍️ Typography Settings */}
                  <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm space-y-3.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                        <span className="text-sm">✍️</span>
                        <span>Typography Settings</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => setBounds({ ...bounds, initialFontSize: 45, tracking: -50, lineSpacing: 12 })}
                        className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors px-2 py-0.5 rounded hover:bg-slate-800 border border-slate-800"
                        title="Reset typography to defaults (45px, -50 tracking)"
                      >
                        <RotateCcw className="w-3 h-3 text-slate-400" />
                        <span>Reset (45px)</span>
                      </button>
                    </div>

                    <div className="space-y-3 pt-1 text-xs">
                      {/* Font Size Slider: Default 45px, Range 20px - 70px */}
                      <div>
                        <div className="flex justify-between text-slate-300 mb-1">
                          <span className="flex items-center gap-1">
                            <Type className="w-3 h-3 text-emerald-400" />
                            Font Size
                          </span>
                          <span className="font-mono text-emerald-400 font-bold">
                            {bounds.initialFontSize}px
                          </span>
                        </div>
                        <input
                          type="range"
                          min={20}
                          max={70}
                          step={1}
                          value={bounds.initialFontSize}
                          onChange={(e) => setBounds({ ...bounds, initialFontSize: parseInt(e.target.value) || 45 })}
                          className="w-full accent-emerald-400 cursor-pointer"
                          title="Font Size (Default: 45px, range: 20px – 70px)"
                        />
                        <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                          <span>20px</span>
                          <span className="text-slate-400">Default: 45px</span>
                          <span>70px</span>
                        </div>
                      </div>

                      {/* Letter Tracking & Line Spacing */}
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                        <div>
                          <div className="flex justify-between text-slate-300 mb-1">
                            <span>Letter Tracking</span>
                            <span className="font-mono text-emerald-400 font-bold">{bounds.tracking}</span>
                          </div>
                          <input
                            type="range"
                            min={-100}
                            max={50}
                            step={5}
                            value={bounds.tracking}
                            onChange={(e) => setBounds({ ...bounds, tracking: parseInt(e.target.value) || -50 })}
                            className="w-full accent-emerald-400 cursor-pointer"
                            title="Letter Tracking (Default: -50)"
                          />
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            Offset: {currentSpacingPx}px/char
                          </span>
                        </div>

                        <div>
                          <div className="flex justify-between text-slate-300 mb-1">
                            <span>Line Spacing</span>
                            <span className="font-mono text-slate-300">{bounds.lineSpacing}px</span>
                          </div>
                          <input
                            type="range"
                            min={4}
                            max={40}
                            step={1}
                            value={bounds.lineSpacing}
                            onChange={(e) => setBounds({ ...bounds, lineSpacing: parseInt(e.target.value) || 12 })}
                            className="w-full accent-emerald-400 cursor-pointer"
                            title="Line Spacing / Height (Default: 12px)"
                          />
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            Default: 12px
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sub-Section 3: 📐 Text Bounding Box & Margins */}
                  <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm space-y-3.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                        <span className="text-sm">📐</span>
                        <span>Text Bounding Box & Margins</span>
                      </h3>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setShowBoundingBoxGuide(!showBoundingBoxGuide)}
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded transition-all ${
                            showBoundingBoxGuide
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                          }`}
                        >
                          <Eye className="w-3 h-3 inline mr-1" />
                          {showBoundingBoxGuide ? 'Guides Active' : 'Show Guides'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setBounds(DEFAULT_BOUNDS)}
                          className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors px-2 py-0.5 rounded hover:bg-slate-800 border border-slate-800"
                          title="Reset bounding box to defaults"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3 pt-1 text-xs">
                      {/* Start X and Start Y */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="flex justify-between text-slate-300 mb-1">
                            <span>Start X (Left Margin)</span>
                            <span className="font-mono text-slate-300">{bounds.boxX}px</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={300}
                            step={5}
                            value={bounds.boxX}
                            onChange={(e) => setBounds({ ...bounds, boxX: parseInt(e.target.value) || 60 })}
                            className="w-full accent-emerald-400 cursor-pointer"
                            title="Start X Position (Left Margin)"
                          />
                          <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                            <span>0px</span>
                            <span>Default: 60px</span>
                            <span>300px</span>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-slate-300 mb-1">
                            <span>Start Y (Top Margin)</span>
                            <span className="font-mono text-slate-300">{bounds.boxY}px</span>
                          </div>
                          <input
                            type="range"
                            min={900}
                            max={1350}
                            step={5}
                            value={bounds.boxY}
                            onChange={(e) => setBounds({ ...bounds, boxY: parseInt(e.target.value) || 1190 })}
                            className="w-full accent-emerald-400 cursor-pointer"
                            title="Start Y Position (Top Margin / Distance below badge)"
                          />
                          <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                            <span>900px</span>
                            <span>Default: 1190px</span>
                            <span>1350px</span>
                          </div>
                        </div>
                      </div>

                      {/* Max Width and Max Height */}
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                        <div>
                          <div className="flex justify-between text-slate-300 mb-1">
                            <span>Max Text Width</span>
                            <span className="font-mono text-slate-300">{bounds.maxWidth}px</span>
                          </div>
                          <input
                            type="range"
                            min={400}
                            max={1170}
                            step={10}
                            value={bounds.maxWidth}
                            onChange={(e) => setBounds({ ...bounds, maxWidth: parseInt(e.target.value) || 1040 })}
                            className="w-full accent-emerald-400 cursor-pointer"
                            title="Max Text Width"
                          />
                          <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                            <span>400px</span>
                            <span>Default: 1040px</span>
                            <span>1170px</span>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-slate-300 mb-1">
                            <span>Max Text Height</span>
                            <span className="font-mono text-slate-300">{bounds.maxHeight}px</span>
                          </div>
                          <input
                            type="range"
                            min={80}
                            max={400}
                            step={10}
                            value={bounds.maxHeight}
                            onChange={(e) => setBounds({ ...bounds, maxHeight: parseInt(e.target.value) || 240 })}
                            className="w-full accent-emerald-400 cursor-pointer"
                            title="Max Text Height"
                          />
                          <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                            <span>80px</span>
                            <span>Default: 240px</span>
                            <span>400px</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Section 3: Publishing Schedule */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                2. Publication Schedule
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Target Date</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">Target Time</label>
                  <div className="relative">
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit / Schedule Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="submit"
                id="btn-schedule-post"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Schedule Post to Queue</span>
              </button>

              {scheduledSuccess && (
                <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Post successfully added to SQLite schedule! Ready for daemon polling.</span>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: Live 1170x1463 Canvas Preview */}
        <div className="lg:col-span-6 xl:col-span-7 space-y-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  WYSIWYG Feed Preview (1170×1463)
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportJpg}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors border border-slate-700 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download JPEG</span>
                </button>
              </div>
            </div>

            {/* Canvas Display */}
            <div className="relative w-full aspect-[1170/1463] bg-slate-950 rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner group">
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain"
                style={{ imageRendering: 'auto' }}
              />

              {/* Bounding Box Guide Overlay (Pure CSS/DOM, zero canvas procedural shapes) */}
              {showBoundingBoxGuide && (
                <div
                  className="absolute pointer-events-none border-2 border-dashed border-emerald-400/90 font-mono text-[10px] text-emerald-300 p-1 flex items-start justify-between bg-emerald-500/10"
                  style={{
                    left: `${(bounds.boxX / 1170) * 100}%`,
                    top: `${(bounds.boxY / 1463) * 100}%`,
                    width: `${(bounds.maxWidth / 1170) * 100}%`,
                    height: `${(bounds.maxHeight / 1463) * 100}%`,
                  }}
                >
                  <span className="bg-black/80 px-1 py-0.5 rounded text-[9px] text-emerald-400">
                    BOUNDS: {bounds.boxX}×{bounds.boxY} ({bounds.maxWidth}×{bounds.maxHeight})
                  </span>
                </div>
              )}

              {/* Resolution badge */}
              <div className="absolute top-3 right-3 px-2 py-1 rounded bg-black/70 backdrop-blur text-[10px] font-mono text-slate-300 border border-white/10 pointer-events-none">
                1170 × 1463
              </div>

              {/* 3-Layer architecture badge */}
              <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/70 backdrop-blur text-[10px] font-mono text-emerald-300 border border-emerald-500/20 pointer-events-none flex items-center gap-1">
                <Layers className="w-3 h-3 text-emerald-400" />
                <span>Layer 1 (Photo) → Layer 2 (balshitemplate.png) → Layer 3 (Text)</span>
              </div>
            </div>

            <div className="mt-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center justify-between">
                <span>Rendering Pipeline:</span>
                <span className="font-mono text-slate-300">Strict 3-Layer Sequential Composite</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Overlay Asset:</span>
                <span className="font-mono text-emerald-400">balshitemplate.png (pasted with alpha mask)</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Headline Typography:</span>
                <span className="font-mono text-slate-300">Left-Aligned Roboto Black @ {bounds.initialFontSize}px ({bounds.tracking} tracking)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
