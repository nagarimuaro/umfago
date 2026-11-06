<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8">
<meta content="width=device-width, initial-scale=1.0" name="viewport">
<title>OpenJek - Finding Driver</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=Geist:wght@500;600&amp;display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet">
<script id="tailwind-config">
        tailwind.config = {
          darkMode: "class",
          theme: {
            extend: {
              "colors": {
                      "tertiary-container": "#e7ecff",
                      "on-tertiary-fixed-variant": "#004395",
                      "surface-tint": "#4f6600",
                      "surface": "#f9f9fc",
                      "surface-container-highest": "#e2e2e5",
                      "secondary-fixed-dim": "#c7c5d5",
                      "secondary-container": "#e3e0f2",
                      "on-surface-variant": "#434933",
                      "on-secondary": "#ffffff",
                      "surface-container-lowest": "#ffffff",
                      "primary-container": "#c8ff00",
                      "surface-bright": "#f9f9fc",
                      "surface-container-high": "#e8e8eb",
                      "on-background": "#1a1c1e",
                      "on-tertiary-fixed": "#001a42",
                      "on-tertiary-container": "#0466d9",
                      "tertiary-fixed-dim": "#adc6ff",
                      "on-primary-fixed-variant": "#3b4d00",
                      "surface-dim": "#d9dadd",
                      "inverse-on-surface": "#f0f0f3",
                      "outline-variant": "#c4caac",
                      "primary-fixed-dim": "#a8d700",
                      "secondary": "#5e5d6b",
                      "error-container": "#ffdad6",
                      "on-error-container": "#93000a",
                      "inverse-surface": "#2f3133",
                      "on-secondary-container": "#646371",
                      "on-primary-fixed": "#161f00",
                      "on-primary-container": "#597300",
                      "on-primary": "#ffffff",
                      "tertiary-fixed": "#d8e2ff",
                      "surface-variant": "#e2e2e5",
                      "on-error": "#ffffff",
                      "background": "#f9f9fc",
                      "surface-container": "#edeef1",
                      "outline": "#747a60",
                      "on-surface": "#1a1c1e",
                      "on-tertiary": "#ffffff",
                      "primary-fixed": "#c0f500",
                      "surface-container-low": "#f3f3f6",
                      "error": "#ba1a1a",
                      "on-secondary-fixed-variant": "#464553",
                      "tertiary": "#005ac2",
                      "inverse-primary": "#a8d700",
                      "secondary-fixed": "#e3e0f2",
                      "on-secondary-fixed": "#1a1a26",
                      "primary": "#4f6600"
              },
              "borderRadius": {
                      "DEFAULT": "0.5rem",
                      "lg": "1rem",
                      "xl": "1.5rem",
                      "full": "9999px"
              },
              "fontFamily": {
                      "headline": ["Inter", "sans-serif"],
                      "body": ["Inter", "sans-serif"],
                      "label": ["Geist", "monospace"]
              }
            }
          }
        }
    </script>
<style>
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 16px); }
        .material-symbols-outlined { font-variation-settings: 'FILL' 1; }
    </style>
</head>
<body class="bg-surface-dim font-body antialiased text-on-surface relative h-screen w-full overflow-hidden select-none">
<!-- Interactive Map Background Layer -->
<div class="absolute inset-0 z-0">
<div class="w-full h-full bg-cover bg-center" data-alt="A top-down view of a modern digital city map interface, light mode, featuring clean geometric roads and subtle topography. The aesthetic is highly functional, minimal, and professional, using a pale neutral palette with very faint green accents indicating routing paths. Optimized as a ride-hailing app background." data-location="Jakarta" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuB0wjnuFreUh4ZTi-nyigqN2cxKbj78r68GTCJZWdk1AebO91w7BmT4-mmlbfQL99xPPv4O8SvnhTAtEUru4LqDzdlpQoOcElTGTLKcQvFzhEcd52ATjp9qcUip4BTHTD9AkqBWmuAuHjwN17_7SgHLEPYmr1B1qd0hVjjJvBZhVz-RquTeZp5AjnYHs-TpE4VohlTjE0gkPh5mhTnQQ306ePnoPlcX3FWRSoBLvimQNeiNarYmq3NC')">
</div>
<!-- Dimming Overlay for contrast -->
<div class="absolute inset-0 bg-surface/50 backdrop-blur-[2px]"></div>
<!-- Gradient to blend map into bottom sheet -->
<div class="absolute bottom-0 w-full h-64 bg-gradient-to-t from-surface to-transparent"></div>
</div>
<!-- Central Map Pulsing Indicator (User Location) -->
<div class="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex items-center justify-center pointer-events-none">
<!-- Outer Ping -->
<div class="absolute w-48 h-48 bg-primary-container/20 rounded-full animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
<!-- Middle Pulse -->
<div class="absolute w-24 h-24 bg-primary-container/40 rounded-full animate-pulse"></div>
<!-- Core Marker -->
<div class="relative w-10 h-10 bg-primary rounded-full border-4 border-surface shadow-md flex items-center justify-center">
<span class="material-symbols-outlined text-on-primary text-[18px]">person</span>
</div>
</div>
<!-- Floating Top Bar (Minimal/Transactional) -->
<div class="absolute top-0 w-full z-20 px-4 pt-6 pb-2 flex items-center justify-between">
<div class="w-10 h-10 bg-surface/90 backdrop-blur-md rounded-full shadow-sm flex items-center justify-center cursor-pointer active:scale-95 transition-transform">
<span class="material-symbols-outlined text-on-surface">arrow_back</span>
</div>
</div>
<!-- Bottom Sheet Card (Foreground) -->
<div class="absolute bottom-0 w-full bg-surface rounded-t-xl shadow-[0_-8px_30px_rgba(0,0,0,0.08)] z-30 flex flex-col max-h-[85vh] transition-transform duration-300">
<!-- Drag Handle Indicator -->
<div class="w-full flex justify-center pt-3 pb-2 cursor-grab">
<div class="w-12 h-1.5 bg-surface-variant rounded-full"></div>
</div>
<div class="px-5 pb-safe pt-2 flex flex-col gap-6 overflow-y-auto">
<!-- Searching Header & Animation -->
<div class="flex items-center gap-4 bg-surface-container-low p-4 rounded-lg">
<!-- Custom Circular Loader with Brand Accent -->
<div class="relative w-14 h-14 flex-shrink-0 flex items-center justify-center">
<svg class="animate-spin absolute inset-0 w-full h-full text-primary" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
<circle class="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"></circle>
<path class="opacity-100" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
</svg>
<!-- Center Icon inside loader -->
<div class="w-8 h-8 bg-primary-container rounded-full flex items-center justify-center z-10">
<span class="material-symbols-outlined text-on-primary-container text-[18px]">search</span>
</div>
</div>
<div class="flex-1">
<h2 class="font-headline font-bold text-[20px] leading-tight text-on-surface">Finding your driver...</h2>
<p class="font-body text-[14px] text-secondary mt-1">Contacting nearby partners</p>
</div>
</div>
<!-- Route Details Context -->
<div class="flex flex-col gap-5 relative px-2">
<!-- Connecting Line -->
<div class="absolute left-[15px] top-6 bottom-6 w-[2px] bg-surface-variant z-0"></div>
<!-- Pickup Point -->
<div class="flex items-start gap-4 relative z-10">
<div class="w-6 h-6 mt-0.5 rounded-full bg-surface border-[3px] border-primary flex items-center justify-center flex-shrink-0">
<div class="w-1.5 h-1.5 bg-primary rounded-full"></div>
</div>
<div class="flex-1">
<p class="font-label text-[12px] text-secondary uppercase tracking-wider font-semibold mb-0.5">Pickup</p>
<p class="font-body font-semibold text-[16px] text-on-surface leading-tight">Grand Indonesia Mall</p>
<p class="font-body text-[14px] text-secondary truncate mt-0.5">East Lobby, Jl. M.H. Thamrin No.1</p>
</div>
</div>
<!-- Destination Point -->
<div class="flex items-start gap-4 relative z-10">
<div class="w-6 h-6 mt-0.5 rounded-full bg-primary flex items-center justify-center flex-shrink-0 shadow-sm">
<span class="material-symbols-outlined text-[14px] text-on-primary">location_on</span>
</div>
<div class="flex-1">
<p class="font-label text-[12px] text-secondary uppercase tracking-wider font-semibold mb-0.5">Drop-off</p>
<p class="font-body font-semibold text-[16px] text-on-surface leading-tight">Soekarno-Hatta Airport (CGK)</p>
<p class="font-body text-[14px] text-secondary truncate mt-0.5">Terminal 3 Departures, Gate 4</p>
</div>
</div>
</div>
<!-- Action Area -->
<div class="pt-2 pb-4">
<button class="w-full py-4 rounded-DEFAULT bg-error-container/40 border border-error-container text-on-error-container font-headline font-semibold text-[16px] text-center transition-all hover:bg-error-container hover:text-on-error active:scale-[0.98] flex items-center justify-center gap-2">
<span class="material-symbols-outlined text-[20px]">close</span>
                    Cancel Request
                </button>
</div>
</div>
</div>
</body></html>