<!DOCTYPE html><html class="h-full" lang="en" style=""><head>
<meta charset="utf-8">
<meta content="width=device-width, initial-scale=1.0" name="viewport">
<title>Select Address - OpenJek</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&amp;family=Geist:wght@500;600&amp;display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet">
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
                        "primary-fixed-dim": "#a8d700",
                        "on-secondary-fixed-variant": "#464553",
                        "on-secondary": "#ffffff",
                        "surface-dim": "#d9dadd",
                        "surface-container-highest": "#e2e2e5",
                        "error": "#ba1a1a",
                        "surface-tint": "#4f6600",
                        "on-error-container": "#93000a",
                        "error-container": "#ffdad6",
                        "surface-container-high": "#e8e8eb",
                        "surface-container-lowest": "#ffffff",
                        "on-surface-variant": "#434933",
                        "outline-variant": "#c4caac",
                        "tertiary-fixed-dim": "#adc6ff",
                        "secondary": "#5e5d6b",
                        "outline": "#747a60",
                        "primary-container": "#c8ff00",
                        "on-tertiary-fixed-variant": "#004395",
                        "on-primary-container": "#597300",
                        "on-secondary-container": "#646371",
                        "inverse-on-surface": "#f0f0f3",
                        "surface": "#f9f9fc",
                        "on-tertiary-fixed": "#001a42",
                        "surface-variant": "#e2e2e5",
                        "on-surface": "#1a1c1e",
                        "surface-container": "#edeef1",
                        "on-primary-fixed-variant": "#3b4d00",
                        "secondary-fixed-dim": "#c7c5d5",
                        "inverse-primary": "#a8d700",
                        "surface-container-low": "#f3f3f6",
                        "on-tertiary-container": "#0466d9",
                        "tertiary-fixed": "#d8e2ff",
                        "on-tertiary": "#ffffff",
                        "surface-bright": "#f9f9fc",
                        "secondary-container": "#e3e0f2",
                        "secondary-fixed": "#e3e0f2",
                        "on-primary-fixed": "#161f00",
                        "tertiary-container": "#e7ecff",
                        "tertiary": "#005ac2",
                        "background": "#f9f9fc",
                        "on-error": "#ffffff",
                        "primary-fixed": "#c0f500",
                        "inverse-surface": "#2f3133",
                        "primary": "#4f6600",
                        "on-secondary-fixed": "#1a1a26",
                        "on-primary": "#ffffff",
                        "on-background": "#1a1c1e"
                    },
                    borderRadius: {
                        "DEFAULT": "0.5rem",
                        "sm": "0.25rem",
                        "md": "0.75rem",
                        "lg": "1rem",
                        "xl": "1.5rem",
                        "full": "9999px"
                    },
                    spacing: {
                        base: "4px",
                        xs: "8px",
                        sm: "12px",
                        md: "16px",
                        lg: "24px",
                        xl: "32px",
                        "edge-margin": "16px",
                        gutter: "12px"
                    },
                    fontFamily: {
                        headline: ["Inter", "sans-serif"],
                        display: ["Inter", "sans-serif"],
                        body: ["Inter", "sans-serif"],
                        label: ["Geist", "monospace"]
                    }
                }
            }
        }
    </script>
<style>
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .material-symbols-outlined[data-weight="fill"] {
            font-variation-settings: 'FILL' 1;
        }
        /* Custom scrollbar for webkit */
        ::-webkit-scrollbar {
            width: 6px;
        }
        ::-webkit-scrollbar-track {
            background: transparent;
        }
        ::-webkit-scrollbar-thumb {
            background-color: #d9dadd;
            border-radius: 10px;
        }
    </style>
</head>
<body class="bg-background text-on-background h-full font-body overflow-hidden flex flex-col">
<!-- Top App Bar -->
<header class="bg-transparent text-on-primary-fixed text-headline-md font-headline-md text-on-surface fixed top-0 w-full z-50 flat no shadows flex items-center px-4 h-16 w-full pt-safe">
<button class="p-2 -ml-2 rounded-full hover:bg-surface-container-high/20 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-fixed active:scale-95 text-on-surface-variant flex items-center justify-center">
<span class="material-symbols-outlined" data-icon="arrow_back">arrow_back</span>
</button>
<h1 class="ml-2 font-headline font-semibold text-lg flex-1">Select Address</h1>
</header>
<!-- Map Canvas (Background) -->
<div class="absolute inset-0 z-0 bg-surface-dim"><img src="https://images.bisnis.com/posts/2025/12/29/1940040/tampilan_peta_di_google_maps_1766972896.jpg" alt="Map" class="w-full h-full object-cover">

<!-- Center Pin Overlay -->
<div class="absolute inset-0 flex items-center justify-center pointer-events-none mb-32">
<div class="relative animate-bounce">
<div class="w-12 h-12 bg-primary-container rounded-full flex items-center justify-center shadow-lg border-2 border-white relative z-10">
<span class="material-symbols-outlined text-on-primary-container text-2xl" data-icon="location_on">location_on</span>
</div>
<!-- Pin Point -->
<div class="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[16px] border-t-primary-container absolute -bottom-3 left-1/2 -translate-x-1/2 drop-shadow-md"></div>
<!-- Pulse Effect -->
<div class="absolute -inset-4 bg-primary-container/30 rounded-full animate-ping -z-10"></div>
</div>
<!-- Marker Base Shadow -->
<div class="absolute top-[60%] w-6 h-2 bg-black/20 rounded-[50%] blur-[2px] mt-2"></div>
<div class="absolute top-1/2 -mt-12 bg-inverse-surface text-inverse-on-surface px-4 py-2 rounded-lg font-label text-sm font-medium shadow-md whitespace-nowrap mb-8 translate-y-[-100%]">
                Set Location Here
                <!-- Tooltip arrow -->
<div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-inverse-surface rotate-45"></div>
</div>
</div></div>
<!-- Draggable Bottom Sheet -->
<div class="absolute bottom-0 w-full bg-surface-container-lowest rounded-t-xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-20 flex flex-col max-h-[85vh] transition-transform duration-300 ease-in-out translate-y-0" id="bottom-sheet">
<!-- Drag Handle -->
<div class="w-full flex justify-center pt-3 pb-2 cursor-grab touch-pan-y" id="drag-handle">
<div class="w-12 h-1.5 bg-surface-variant rounded-full"></div>
</div>
<div class="flex-1 overflow-y-auto px-4 pb-safe flex flex-col gap-4">
<!-- Search Bar -->
<div class="relative w-full mt-2">
<span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" data-icon="search">search</span>
<input class="w-full h-14 pl-12 pr-4 bg-surface-container-low border border-surface-variant rounded-lg text-body-lg focus:outline-none focus:border-on-surface focus:ring-1 focus:ring-on-surface transition-colors placeholder:text-on-surface-variant/60 shadow-sm" placeholder="Search for your address" type="text">
</div>
<!-- Current Location Button -->
<button class="w-full h-14 bg-surface text-on-surface rounded-lg border border-surface-variant flex items-center px-4 hover:bg-surface-container-high transition-colors group">
<div class="w-8 h-8 rounded-full bg-primary-container/20 flex items-center justify-center mr-3 group-hover:bg-primary-container/30 transition-colors">
<span class="material-symbols-outlined text-primary" data-icon="my_location" data-weight="fill">my_location</span>
</div>
<span class="font-headline font-semibold text-body-md flex-1 text-left">Use Current Location</span>
<span class="material-symbols-outlined text-on-surface-variant" data-icon="chevron_right">chevron_right</span>
</button>
<!-- Saved Addresses Section -->
<div class="mt-2">
<h3 class="font-label text-label-sm text-on-surface-variant uppercase tracking-wider mb-2 px-1">Saved Addresses</h3>
<div class="bg-surface rounded-lg border border-surface-variant overflow-hidden">
<button class="w-full flex items-center p-4 hover:bg-surface-container-high transition-colors border-b border-surface-variant">
<span class="material-symbols-outlined text-on-surface-variant mr-4 text-[24px]" data-icon="home">home</span>
<div class="flex-1 text-left">
<p class="font-headline font-semibold text-body-md text-on-surface">Home</p>
<p class="font-body text-label-md text-on-surface-variant mt-0.5 line-clamp-1">Add home address</p>
</div>
<span class="font-label text-sm text-primary font-medium">Add</span>
</button>
<button class="w-full flex items-center p-4 hover:bg-surface-container-high transition-colors">
<span class="material-symbols-outlined text-on-surface-variant mr-4 text-[24px]" data-icon="work">work</span>
<div class="flex-1 text-left">
<p class="font-headline font-semibold text-body-md text-on-surface">Work</p>
<p class="font-body text-label-md text-on-surface-variant mt-0.5 line-clamp-1">Sudirman Central Business District, Senayan</p>
</div>
</button>
</div>
</div>
<!-- Recent Places Section -->
<div class="mt-2 mb-6">
<h3 class="font-label text-label-sm text-on-surface-variant uppercase tracking-wider mb-2 px-1">Recent Places</h3>
<div class="bg-surface rounded-lg border border-surface-variant overflow-hidden">
<button class="w-full flex items-center p-4 hover:bg-surface-container-high transition-colors border-b border-surface-variant">
<div class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center mr-4">
<span class="material-symbols-outlined text-on-surface-variant text-[20px]" data-icon="history">history</span>
</div>
<div class="flex-1 text-left">
<p class="font-headline font-semibold text-body-md text-on-surface">Grand Indonesia Mall</p>
<p class="font-body text-label-md text-on-surface-variant mt-0.5 line-clamp-1">Jl. M.H. Thamrin No.1, Menteng</p>
</div>
</button>
<button class="w-full flex items-center p-4 hover:bg-surface-container-high transition-colors border-b border-surface-variant">
<div class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center mr-4">
<span class="material-symbols-outlined text-on-surface-variant text-[20px]" data-icon="history">history</span>
</div>
<div class="flex-1 text-left">
<p class="font-headline font-semibold text-body-md text-on-surface">Soekarno-Hatta International Airport</p>
<p class="font-body text-label-md text-on-surface-variant mt-0.5 line-clamp-1">Terminal 3 Departure, Tangerang</p>
</div>
</button>
<button class="w-full flex items-center p-4 hover:bg-surface-container-high transition-colors">
<div class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center mr-4">
<span class="material-symbols-outlined text-on-surface-variant text-[20px]" data-icon="history">history</span>
</div>
<div class="flex-1 text-left">
<p class="font-headline font-semibold text-body-md text-on-surface">Pacific Place</p>
<p class="font-body text-label-md text-on-surface-variant mt-0.5 line-clamp-1">Jl. Jend. Sudirman kav 52-53, Senayan</p>
</div>
</button>
</div>
</div>
<!-- Primary Action Button (Fixed at bottom of sheet) -->
<div class="pt-2 pb-6 mt-auto bg-surface-container-lowest sticky bottom-0 border-t border-surface-variant/50">
<button class="w-full h-14 bg-primary-container text-on-primary-container font-headline font-bold text-body-lg rounded-lg flex items-center justify-center hover:bg-primary-fixed transition-colors active:scale-[0.98] shadow-sm">
                    Confirm Location
                </button>
</div>
</div>
</div>
<!-- Simple Bottom Sheet Drag Logic (Visual Only) -->
<script>
        const sheet = document.getElementById('bottom-sheet');
        const handle = document.getElementById('drag-handle');
        let startY;
        let currentY;

        handle.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
            sheet.style.transition = 'none';
        }, {passive: true});

        handle.addEventListener('touchmove', (e) => {
            currentY = e.touches[0].clientY;
            const diff = currentY - startY;
            if (diff > 0) {
                sheet.style.transform = `translateY(${diff}px)`;
            }
        }, {passive: true});

        handle.addEventListener('touchend', (e) => {
            sheet.style.transition = 'transform 0.3s ease-out';
            if (currentY - startY > 100) {
                // Snap to lower state (simulate)
                sheet.style.transform = `translateY(40%)`;
            } else {
                // Snap back
                sheet.style.transform = `translateY(0)`;
            }
        });
    </script>


</body></html>