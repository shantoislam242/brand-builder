/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Camera, 
  Layout, 
  Newspaper, 
  Share2, 
  Loader2, 
  Sparkles, 
  ArrowRight,
  Image as ImageIcon,
  AlertCircle,
  Download,
  Type
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---

interface BrandAsset {
  id: string;
  type: 'studio' | 'lifestyle' | 'detail' | 'dynamic' | 'atmospheric' | 'composition';
  label: string;
  url: string | null;
  loading: boolean;
  error: string | null;
}

// --- Constants ---

const MODEL_NAME = "gemini-2.5-flash-image";

// --- Components ---

const AssetCard = ({ asset, onRetry, brandName }: { asset: BrandAsset, onRetry?: () => void, brandName: string }) => {
  const Icon = {
    studio: Camera,
    lifestyle: Layout,
    detail: Sparkles,
    dynamic: Share2,
    atmospheric: Sparkles,
    composition: Layout
  }[asset.type];

  const handleDownload = async () => {
    if (!asset.url) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = asset.url;

    await new Promise((resolve) => {
      img.onload = resolve;
    });

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    if (brandName) {
      // Draw brand name overlay
      const fontSize = Math.floor(canvas.width * 0.05);
      ctx.font = `bold ${fontSize}px Inter, sans-serif`;
      ctx.fillStyle = 'white';
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = fontSize / 8;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      
      const padding = canvas.width * 0.04;
      ctx.strokeText(brandName, canvas.width - padding, canvas.height - padding);
      ctx.fillText(brandName, canvas.width - padding, canvas.height - padding);
    }

    const link = document.createElement('a');
    link.download = `${asset.id}-${brandName || 'product'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="group relative flex flex-col bg-[#141414] border border-white/5 rounded-2xl overflow-hidden transition-all hover:border-white/10">
      <div className="aspect-square relative bg-neutral-900 flex items-center justify-center overflow-hidden">
        {asset.loading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-neutral-600" />
            <span className="text-xs font-mono uppercase tracking-widest text-neutral-600">Rendering...</span>
          </div>
        ) : asset.error ? (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <AlertCircle className="w-8 h-8 text-red-500/50" />
            <p className="text-xs text-red-500/70 font-medium">{asset.error}</p>
            {onRetry && (
              <button 
                onClick={onRetry}
                className="mt-2 text-[10px] uppercase tracking-wider font-bold text-white underline underline-offset-4"
              >
                Retry
              </button>
            )}
          </div>
        ) : asset.url ? (
          <>
            <img 
              src={asset.url} 
              alt={asset.label}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
            <button 
              onClick={handleDownload}
              className="absolute bottom-4 right-4 w-10 h-10 bg-black/60 backdrop-blur rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95 border border-white/10"
              title="Download Image"
            >
              <Download className="w-5 h-5 text-white" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 opacity-10">
            <Icon className="w-12 h-12 text-white" />
            <span className="text-xs font-mono uppercase tracking-widest text-white">Awaiting Input</span>
          </div>
        )}
      </div>
      
      <div className="p-4 border-t border-white/5 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-1">{asset.type}</h3>
          <p className="text-sm font-medium text-white">{asset.label}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center">
          <Icon className="w-4 h-4 text-neutral-500" />
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [description, setDescription] = useState('');
  const [brandName, setBrandName] = useState('');
  const [userImage, setUserImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<BrandAsset[]>([
    { id: 'studio', type: 'studio', label: 'Studio Hero Shot', url: null, loading: false, error: null },
    { id: 'lifestyle', type: 'lifestyle', label: 'Lifestyle Context', url: null, loading: false, error: null },
    { id: 'detail', type: 'detail', label: 'Macro Detail', url: null, loading: false, error: null },
    { id: 'dynamic', type: 'dynamic', label: 'Dynamic Angle', url: null, loading: false, error: null },
    { id: 'atmospheric', type: 'atmospheric', label: 'Atmospheric Mood', url: null, loading: false, error: null },
    { id: 'composition', type: 'composition', label: 'Structured Composition', url: null, loading: false, error: null },
  ]);

  const generateImage = async (prompt: string, base64Image?: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const contents = base64Image ? {
      parts: [
        {
          inlineData: {
            data: base64Image.split(',')[1],
            mimeType: "image/png"
          }
        },
        { text: prompt }
      ]
    } : {
      parts: [{ text: prompt }]
    };

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents,
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data returned from model");
  };

  const handleGenerate = async () => {
    if (!description.trim() && !userImage) return;
    
    setIsGenerating(true);
    setAssets(prev => prev.map(a => ({ ...a, url: null, loading: true, error: null })));

    try {
      // Define specific prompts for each professional shot
      const shotConfigs = [
        { 
          id: 'studio', 
          prompt: userImage 
            ? `Create a high-end studio hero shot of the product in the image. ${description ? `Details: ${description}.` : ''} Clean minimalist background, professional lighting, sharp focus. ABSOLUTELY NO PEOPLE.`
            : `A high-end studio hero shot of ${description}. Clean minimalist background, professional lighting, sharp focus. ABSOLUTELY NO PEOPLE.`
        },
        { 
          id: 'lifestyle', 
          prompt: userImage
            ? `Create a lifestyle product shot of the item in the image. ${description ? `Details: ${description}.` : ''} Placed in a modern, minimalist environment (e.g., marble countertop or wooden table). Natural lighting. ABSOLUTELY NO PEOPLE.`
            : `A lifestyle product shot of ${description}. Placed in a modern, minimalist environment. Natural lighting. ABSOLUTELY NO PEOPLE.`
        },
        { 
          id: 'detail', 
          prompt: userImage
            ? `A macro detail shot focusing on the texture and craftsmanship of the product in the image. ${description ? `Details: ${description}.` : ''} Shallow depth of field, artistic lighting. ABSOLUTELY NO PEOPLE.`
            : `A macro detail shot of ${description}, focusing on texture and craftsmanship. Shallow depth of field, artistic lighting. ABSOLUTELY NO PEOPLE.`
        },
        { 
          id: 'dynamic', 
          prompt: userImage
            ? `A dynamic, low-angle professional shot of the product in the image. ${description ? `Details: ${description}.` : ''} Cinematic lighting, bold composition. ABSOLUTELY NO PEOPLE.`
            : `A dynamic, low-angle professional shot of ${description}. Cinematic lighting, bold composition. ABSOLUTELY NO PEOPLE.`
        },
        { 
          id: 'atmospheric', 
          prompt: userImage
            ? `An atmospheric mood shot of the product in the image. ${description ? `Details: ${description}.` : ''} Using soft fog, dramatic shadows, and elegant lighting. Enhanced with relevant props like silk fabric or soft light prisms. ABSOLUTELY NO PEOPLE.`
            : `An atmospheric mood shot of ${description}. Using soft fog, dramatic shadows, and elegant lighting. Enhanced with relevant props like silk fabric or soft light prisms. ABSOLUTELY NO PEOPLE.`
        },
        { 
          id: 'composition', 
          prompt: userImage
            ? `A structured composition shot of the product in the image. ${description ? `Details: ${description}.` : ''} Arranged with geometric props like stone plinths, spheres, or architectural elements. Sophisticated and balanced. ABSOLUTELY NO PEOPLE.`
            : `A structured composition shot of ${description}. Arranged with geometric props like stone plinths, spheres, or architectural elements. Sophisticated and balanced. ABSOLUTELY NO PEOPLE.`
        }
      ];

      // Generate all shots in parallel
      const results = await Promise.allSettled(
        shotConfigs.map(config => generateImage(config.prompt, userImage || undefined))
      );

      setAssets(prev => prev.map((asset, index) => {
        const result = results[index];
        if (result.status === 'fulfilled') {
          return { ...asset, url: result.value, loading: false };
        } else {
          return { ...asset, error: 'Failed to generate', loading: false };
        }
      }));

    } catch (err) {
      console.error(err);
      setAssets(prev => prev.map(a => ({ ...a, error: 'Generation failed', loading: false })));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-neutral-800">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                setDescription('');
                setBrandName('');
                setUserImage(null);
                setAssets(prev => prev.map(a => ({ ...a, url: null, error: null, loading: false })));
              }}
              className="text-[10px] uppercase tracking-widest font-bold text-neutral-500 hover:text-white transition-colors"
            >
              Clear All
            </button>
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-black" />
            </div>
            <h1 className="font-mono text-sm uppercase tracking-[0.2em] font-bold">Brand Builder by Shanto</h1>
          </div>
          <div className="hidden md:flex items-center gap-6 text-[10px] uppercase tracking-widest font-bold text-neutral-500">
            <span>Professional Photography</span>
            <span>•</span>
            <span>Nano-Banana Engine</span>
            <span>•</span>
            <span>No Human Presence</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <section className="mb-16">
          <div className="max-w-3xl">
            <h2 className="text-5xl md:text-7xl font-medium tracking-tight mb-8 leading-[0.9]">
              Professional Brand <br />
              <span className="text-neutral-600">Photography Gallery.</span>
            </h2>
            
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex-1 relative group">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your product (e.g., 'A luxury watch with a leather strap')"
                  className="w-full bg-[#141414] border border-white/10 rounded-2xl p-6 min-h-[120px] text-lg focus:outline-none focus:ring-2 focus:ring-white/5 transition-all resize-none text-white placeholder:text-neutral-600"
                />
              </div>
              
              <div className="md:w-48 flex flex-col gap-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all overflow-hidden relative min-h-[100px]",
                    userImage ? "border-white bg-neutral-900" : "border-white/10 hover:border-white/20 bg-[#141414]"
                  )}
                >
                  {userImage ? (
                    <>
                      <img src={userImage} className="absolute inset-0 w-full h-full object-cover opacity-20" />
                      <ImageIcon className="w-6 h-6 text-white" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white">Change Image</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-6 h-6 text-neutral-600" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-600">Upload Photo</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || (!description.trim() && !userImage)}
                  className={cn(
                    "h-14 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all",
                    isGenerating || (!description.trim() && !userImage)
                      ? "bg-neutral-900 text-neutral-600 cursor-not-allowed" 
                      : "bg-white text-black hover:bg-neutral-200 active:scale-95"
                  )}
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Generate
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-[#141414] border border-white/5 rounded-2xl shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center">
                <Type className="w-5 h-5 text-neutral-600" />
              </div>
              <div className="flex-1">
                <input 
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Insert brand name for download overlay (optional)"
                  className="w-full bg-transparent text-sm font-medium focus:outline-none placeholder:text-neutral-700 text-white"
                />
              </div>
              {brandName && (
                <button 
                  onClick={() => setBrandName('')}
                  className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Gallery Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {assets.map((asset) => (
            <AssetCard 
              key={asset.id}
              asset={asset} 
              onRetry={handleGenerate}
              brandName={brandName}
            />
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-24 border-t border-white/5 py-12 bg-black">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2 grayscale opacity-30">
            <Sparkles className="w-4 h-4" />
            <span className="font-mono text-[10px] uppercase tracking-widest font-bold">Brand Builder by Shanto v1.0</span>
          </div>
          <div className="flex gap-8 text-[10px] uppercase tracking-widest font-bold text-neutral-600">
            <a href="#" className="hover:text-white transition-colors">Documentation</a>
            <a href="#" className="hover:text-white transition-colors">API Status</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
