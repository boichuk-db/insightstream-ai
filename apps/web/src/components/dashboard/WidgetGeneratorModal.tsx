import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Code, Sparkles, Check, Type, Maximize, LayoutTemplate } from 'lucide-react';

interface WidgetGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
}

const COLORS = [
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Sky', value: '#0ea5e9' },
];

const SHAPES = ['circle', 'square', 'rounded'] as const;
const POSITIONS = ['bottom-right', 'bottom-left'] as const;
const FRAMEWORKS = ['html', 'react', 'angular'] as const;

export function WidgetGeneratorModal({ isOpen, onClose, apiKey }: WidgetGeneratorModalProps) {
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedShape, setSelectedShape] = useState<typeof SHAPES[number]>('rounded');
  const [selectedPosition, setSelectedPosition] = useState<typeof POSITIONS[number]>('bottom-right');
  const [selectedFramework, setSelectedFramework] = useState<typeof FRAMEWORKS[number]>('html');
  const [copied, setCopied] = useState(false);

  const getSnippet = () => {
    const scriptUrl = "http://localhost:8080/dist/widget.iife.js";
    
    if (selectedFramework === 'react') {
      return `import { useEffect } from 'react';

export default function InsightStreamWidget() {
  useEffect(() => {
    // 1. Set configuration
    (window as any).InsightStreamConfig = {
      apiKey: '${apiKey}',
      color: '${selectedColor.value}',
      shape: '${selectedShape}',
      position: '${selectedPosition}'
    };

    // 2. Load the widget script
    const script = document.createElement('script');
    script.src = "${scriptUrl}";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup on unmount
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return null;
}`;
    }

    if (selectedFramework === 'angular') {
      return `import { Component, OnInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-insight-stream',
  template: '',
  standalone: true
})
export class InsightStreamComponent implements OnInit, OnDestroy {
  private scriptElement: HTMLScriptElement | null = null;

  ngOnInit() {
    (window as any).InsightStreamConfig = {
      apiKey: '${apiKey}',
      color: '${selectedColor.value}',
      shape: '${selectedShape}',
      position: '${selectedPosition}'
    };
    
    this.scriptElement = document.createElement('script');
    this.scriptElement.src = "${scriptUrl}";
    this.scriptElement.async = true;
    document.body.appendChild(this.scriptElement);
  }

  ngOnDestroy() {
    if (this.scriptElement && document.body.contains(this.scriptElement)) {
      document.body.removeChild(this.scriptElement);
    }
  }
}`;
    }

    // Default HTML format
    return `<!-- InsightStream AI Widget -->
<script id="insight-stream-config">
  window.InsightStreamConfig = {
    apiKey: '${apiKey}',
    color: '${selectedColor.value}',
    shape: '${selectedShape}',
    position: '${selectedPosition}'
  };
</script>
<script src="${scriptUrl}"></script>`;
  };

  const snippet = getSnippet();

  const handleCopy = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/50">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Code className="text-indigo-400" /> Embed Widget
            </h2>
            <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Shape and Position (Left) */}
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-300 mb-2 flex items-center gap-2">
                    <Maximize size={14} className="text-neutral-500" /> Button Shape
                  </h3>
                  <div className="flex bg-neutral-950 rounded-lg p-1 border border-neutral-800 w-fit">
                    {SHAPES.map(shape => (
                      <button 
                        key={shape} 
                        onClick={() => setSelectedShape(shape)}
                        className={`min-w-[90px] px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${selectedShape === shape ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm' : 'text-neutral-500 hover:text-neutral-300 border border-transparent'}`}
                      >
                        {shape}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-neutral-300 mb-2 flex items-center gap-2">
                    <Type size={14} className="text-neutral-500" /> Screen Position
                  </h3>
                  <div className="flex bg-neutral-950 rounded-lg p-1 border border-neutral-800 w-fit">
                    {POSITIONS.map(pos => (
                      <button 
                        key={pos} 
                        onClick={() => setSelectedPosition(pos)}
                        className={`min-w-[110px] px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${selectedPosition === pos ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm' : 'text-neutral-500 hover:text-neutral-300 border border-transparent'}`}
                      >
                        {pos.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Color Customization (Right) */}
              <div>
                <h3 className="text-sm font-semibold text-neutral-300 mb-3 flex items-center gap-2">
                  <Sparkles size={14} className="text-neutral-500" /> Brand Color
                </h3>
                <div className="flex gap-2.5 flex-wrap">
                  {COLORS.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setSelectedColor(color)}
                      className={`w-10 h-10 rounded-full transition-all flex items-center justify-center ${selectedColor.value === color.value ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-neutral-900 scale-110' : 'hover:scale-105 opacity-60 hover:opacity-100'}`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    >
                      {selectedColor.value === color.value && <Check strokeWidth={3} className="text-white w-5 h-5" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Code Snippet */}
            <div className="mt-2">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-3 gap-3">
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-semibold text-neutral-300 flex items-center gap-2">
                    <LayoutTemplate size={14} className="text-neutral-500" /> Framework Snippet
                  </h3>
                  <div className="flex bg-neutral-950 rounded-lg p-1 border border-neutral-800 w-fit">
                    {FRAMEWORKS.map(fw => (
                      <button 
                        key={fw} 
                        onClick={() => setSelectedFramework(fw)}
                        className={`min-w-[80px] px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${selectedFramework === fw ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm' : 'text-neutral-500 hover:text-neutral-300 border border-transparent'}`}
                      >
                        {fw === 'html' ? 'HTML' : fw}
                      </button>
                    ))}
                  </div>
                </div>
                <button 
                  onClick={handleCopy}
                  className="text-xs shrink-0 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors border border-indigo-600 font-medium"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy to Clipboard'}
                </button>
              </div>
              
              <div className="relative group">
                <pre className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl overflow-x-auto text-sm text-indigo-200/80 font-mono leading-relaxed max-h-[250px] custom-scrollbar">
                  <code>{snippet}</code>
                </pre>
              </div>
              <p className="mt-3 text-xs text-neutral-500">
                {selectedFramework === 'html' && <>Paste this script into the <code className="text-neutral-400 bg-neutral-800 px-1 py-0.5 rounded">&lt;body&gt;</code> tag of your website.</>}
                {selectedFramework === 'react' && <>Use this component in your React application (e.g., inside <code className="text-neutral-400 bg-neutral-800 px-1 py-0.5 rounded">App.jsx</code> or a layout wrapper).</>}
                {selectedFramework === 'angular' && <>Include this Standalone Component in your Angular application at the root level.</>}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
