<!DOCTYPE html><html class="light" lang="en"><head>
<meta charset="utf-8">
<meta content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" name="viewport">
<title>OpenJek - Dashboard</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&amp;family=Geist:wght@500;600&amp;display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet">
<script id="tailwind-config">tailwind.config = {darkMode: "class", theme: {extend: {colors: {"surface-dim": "#d9dadd", "on-secondary": "#ffffff", "primary-container": "#c8ff00", "inverse-surface": "#2f3133", error: "#ba1a1a", "secondary-fixed-dim": "#c7c5d5", "on-tertiary": "#ffffff", outline: "#747a60", "outline-variant": "#c4caac", "primary-fixed-dim": "#a8d700", primary: "#4f6600", "surface-bright": "#f9f9fc", "on-tertiary-fixed": "#001a42", "tertiary-container": "#e7ecff", "on-tertiary-fixed-variant": "#004395", "surface-container-low": "#f3f3f6", "on-background": "#1a1c1e", tertiary: "#005ac2", "inverse-on-surface": "#f0f0f3", "on-secondary-container": "#646371", "inverse-primary": "#a8d700", "on-primary": "#ffffff", "on-secondary-fixed": "#1a1a26", secondary: "#5e5d6b", "on-surface": "#1a1c1e", "on-secondary-fixed-variant": "#464553", "primary-fixed": "#c0f500", "tertiary-fixed": "#d8e2ff", surface: "#f9f9fc", "on-tertiary-container": "#0466d9", "on-error-container": "#93000a", "surface-container-lowest": "#ffffff", "surface-variant": "#e2e2e5", "surface-container-high": "#e8e8eb", "on-primary-fixed": "#161f00", "on-error": "#ffffff", "error-container": "#ffdad6", "surface-container": "#edeef1", "on-surface-variant": "#434933", background: "#f9f9fc", "secondary-container": "#e3e0f2", "surface-container-highest": "#e2e2e5", "on-primary-container": "#597300", "surface-tint": "#4f6600", "secondary-fixed": "#e3e0f2", "on-primary-fixed-variant": "#3b4d00", "tertiary-fixed-dim": "#adc6ff"}, borderRadius: {DEFAULT: "0.25rem", lg: "0.5rem", xl: "0.75rem", full: "9999px"}, spacing: {base: "4px", lg: "24px", md: "16px", "edge-margin": "16px", gutter: "12px", sm: "12px", xl: "32px", xs: "8px"}, fontFamily: {"body-lg": ["Inter"], "label-md": ["Geist"], "headline-xl": ["Inter"], "headline-md": ["Inter"], "headline-lg": ["Inter"], "body-md": ["Inter"], "label-sm": ["Geist"], "headline-lg-mobile": ["Inter"], headline: ["Inter"], display: ["Inter"], body: ["Inter"], label: ["Geist"]}, fontSize: {"body-lg": ["18px", {lineHeight: "26px", fontWeight: "400"}], "label-md": ["14px", {lineHeight: "20px", letterSpacing: "0.02em", fontWeight: "500"}], "headline-xl": ["32px", {lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "700"}], "headline-md": ["20px", {lineHeight: "28px", fontWeight: "600"}], "headline-lg": ["24px", {lineHeight: "32px", letterSpacing: "-0.01em", fontWeight: "700"}], "body-md": ["16px", {lineHeight: "24px", fontWeight: "400"}], "label-sm": ["12px", {lineHeight: "16px", fontWeight: "600"}], "headline-lg-mobile": ["22px", {lineHeight: "28px", fontWeight: "700"}]}}}};</script>
<style>
        /* Base Styles & Utility Classes */
        body {
            @apply bg-background text-on-background font-body-md overflow-hidden;
            -webkit-tap-highlight-color: transparent;
        }

        /* Material Symbols Outlined Utility */
        .material-symbols-outlined {
            font-family: 'Material Symbols Outlined';
            font-weight: normal;
            font-style: normal;
            font-size: 24px;
            line-height: 1;
            letter-spacing: normal;
            text-transform: none;
            display: inline-block;
            white-space: nowrap;
            word-wrap: normal;
            direction: ltr;
            -webkit-font-feature-settings: 'liga';
            -webkit-font-smoothing: antialiased;
        }

        /* Map specific full-screen container */
        #map-container {
            @apply absolute inset-0 w-full h-full z-0;
        }
        
        /* Bottom Sheet Interaction Styles */
        #booking-sheet {
            transition: transform 0.3s cubic-bezier(0.2, 0, 0, 1);
            will-change: transform;
        }
        
        .pulse-marker {
            position: absolute;
            width: 24px;
            height: 24px;
            background-color: theme('colors.primary');
            border-radius: 50%;
            border: 2px solid theme('colors.on-primary');
            box-shadow: 0 0 10px rgba(0,0,0,0.2);
            z-index: 10;
        }
        
        .pulse-marker::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 100%;
            height: 100%;
            background-color: theme('colors.primary-fixed-dim');
            border-radius: 50%;
            animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
            z-index: -1;
        }

        @keyframes pulse-ring {
            0% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
            100% { transform: translate(-50%, -50%) scale(3); opacity: 0; }
        }
    </style>
<style>
    body {
      min-height: max(884px, 100dvh);
    }
  </style>
<style>
    body {
      min-height: max(884px, 100dvh);
    }
  </style>
<style>
    body {
      min-height: max(884px, 100dvh);
    }
  </style>
</head>
<body class="relative h-screen w-screen"><button class="fixed top-5 left-3 z-50 w-12 h-12 bg-surface-container-lowest rounded-full shadow-lg flex items-center justify-center border border-outline-variant active:scale-95 transition-transform duration-150">
<span class="material-symbols-outlined text-on-surface">arrow_back</span>
</button>
<!-- TopAppBar -->
<!-- NavigationDrawer Overlay -->
<!-- NavigationDrawer -->
<!-- Map Background -->
<div data-alt="A clean, highly stylized digital map interface showing city streets in a light mode aesthetic. The map uses a palette of soft grays, whites, and pale greens for parks, with a clean UI overlaid. Roads are clearly defined without clutter." data-location="Jakarta, Indonesia" id="map-container" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuD49TWeVpyoYYh_jM1Ybn5CBrRVHujWKSpJcfxzQYUtLRWgk29lwL9eA3RCN7lRJCRHv_FhjY58auXY8wnKnHGECuZitWxOz1C5n0-hNP6MAB7eM5B5iI32mlPvowx8SnxJXd22Nah8hMaia00YUwclsQ3DXMs9YTK0G_6FtoKIETFo9yUGFqPrbwVjKzCb34gU9vlHAJs2QicgdhYTW13fWoNVphc9xZa4A1qXk-Ou2B7yfOI2NtPe')">
<!-- Simulated Map Markers -->
<div class="pulse-marker" style="top: 45%; left: 50%;"></div>
<!-- Nearby Driver Marker 1 -->
<div class="absolute top-[30%] left-[60%] flex flex-col items-center">
<div class="w-8 h-8 bg-surface-container-lowest rounded-full shadow-sm flex items-center justify-center border border-outline-variant">
<span class="material-symbols-outlined text-on-surface text-[18px]">local_taxi</span>
</div>
</div>
<!-- Nearby Driver Marker 2 -->
<div class="absolute top-[60%] left-[30%] flex flex-col items-center">
<div class="w-8 h-8 bg-surface-container-lowest rounded-full shadow-sm flex items-center justify-center border border-outline-variant">
<span class="material-symbols-outlined text-on-surface text-[18px]">local_taxi</span>
</div>
</div>
</div>
<!-- Booking UI Bottom Sheet -->
<!-- Positioning above BottomNavBar (bottom-16 gives clearance) -->
<div class="fixed bottom-16 left-0 w-full z-40 px-md pb-md" id="booking-sheet">
<div class="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg p-md flex flex-col gap-md">
<!-- Handle for dragging (visual only for this static mock) -->
<div class="w-12 h-1.5 bg-surface-variant rounded-full mx-auto mb-xs"></div>
<!-- Search Inputs -->
<div class="relative flex flex-col gap-gutter">
<!-- Decorative Timeline Line -->
<div class="absolute left-3 top-5 bottom-5 w-0.5 bg-outline-variant z-0"></div>
<!-- Current Location -->
<div class="relative z-10 flex items-center bg-surface-container rounded-lg p-2 gap-sm border border-transparent focus-within:border-on-surface transition-colors">
<div class="w-2.5 h-2.5 rounded-full bg-secondary ml-1.5"></div>
<input aria-label="Pickup Location" class="w-full bg-transparent border-none text-body-md font-body-md text-on-surface focus:ring-0 p-0" type="text" value="Current Location">
</div>
<!-- Destination Input -->
<div class="relative z-10 flex items-center bg-surface-container-lowest border border-outline-variant rounded-lg p-2 gap-sm focus-within:border-on-surface transition-colors shadow-sm">
<div class="w-2.5 h-2.5 bg-primary ml-1.5"></div>
<input aria-label="Destination" class="w-full bg-transparent border-none text-body-md font-body-md text-on-surface placeholder:text-on-surface-variant focus:ring-0 p-0" placeholder="Where to?" type="text">
</div>
</div>
<!-- Quick Actions -->
<div class="flex gap-sm overflow-x-auto pb-1 no-scrollbar">
<button class="flex items-center gap-xs px-sm py-2 bg-surface-container-low rounded-lg border border-outline-variant hover:bg-surface-container transition-colors whitespace-nowrap">
<span class="material-symbols-outlined text-on-surface-variant text-[20px]" data-icon="home">home</span>
<span class="text-label-md font-label-md text-on-surface">Home</span>
</button>
<button class="flex items-center gap-xs px-sm py-2 bg-surface-container-low rounded-lg border border-outline-variant hover:bg-surface-container transition-colors whitespace-nowrap">
<span class="material-symbols-outlined text-on-surface-variant text-[20px]" data-icon="work">work</span>
<span class="text-label-md font-label-md text-on-surface">Work</span>
</button>
<button class="flex items-center gap-xs px-sm py-2 bg-surface-container-low rounded-lg border border-outline-variant hover:bg-surface-container transition-colors whitespace-nowrap">
<span class="material-symbols-outlined text-on-surface-variant text-[20px]" data-icon="schedule">schedule</span>
<span class="text-label-md font-label-md text-on-surface">Later</span>
</button>
</div>
<!-- Wallet Summary -->
<div class="flex flex-col gap-sm">
<div class="flex items-center justify-between">
<span class="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Payment Method</span>
<button class="text-primary text-label-sm font-label-sm font-bold">Change</button>
</div>
<div class="flex gap-sm">
<button class="flex-1 flex items-center gap-sm p-sm bg-primary-container rounded-lg border border-primary shadow-sm">
<span class="material-symbols-outlined text-primary" data-icon="account_balance_wallet">account_balance_wallet</span>
<div class="flex flex-col items-start">
<span class="text-label-sm font-label-sm text-on-primary-container">OpenPay</span>
<span class="text-label-md font-label-md text-on-primary-container font-bold">Rp 150.000</span>
</div>
</button>
<button class="flex-1 flex items-center gap-sm p-sm bg-surface-container-low rounded-lg border border-outline-variant hover:bg-surface-container transition-colors">
<span class="material-symbols-outlined text-on-surface-variant" data-icon="payments">payments</span>
<div class="flex flex-col items-start">
<span class="text-label-sm font-label-sm text-on-surface-variant">Cash</span>
<span class="text-label-md font-label-md text-on-surface font-bold">Pay in car</span>
</div>
</button>
</div>
</div>
<div class="bg-surface-container-low rounded-lg p-sm border border-outline-variant flex flex-col gap-xs">
<div class="flex justify-between items-center">
<span class="text-label-sm text-on-surface-variant">Trip Distance</span>
<span class="text-label-md font-bold text-on-surface">5.2 km</span>
</div>
<div class="flex justify-between items-center">
<span class="text-label-sm text-on-surface-variant">Price per km</span>
<span class="text-label-md text-on-surface">Rp 2.500</span>
</div>
<div class="h-px bg-outline-variant my-1"></div>
<div class="flex justify-between items-center">
<span class="text-label-md font-bold text-on-surface">Total Fare</span>
<span class="text-headline-md text-primary font-bold">Rp 13.000</span>
</div>
</div><button class="w-full py-md bg-primary text-on-primary font-bold rounded-xl shadow-lg active:scale-[0.98] transition-transform duration-150">
  Find a Ride
</button></div>
</div>
<!-- BottomNavBar -->
<!-- Basic Drawer Interaction Script -->
<script>
        document.addEventListener('DOMContentLoaded', () => {
            const menuBtn = document.getElementById('menu-btn');
            const drawer = document.getElementById('nav-drawer');
            const overlay = document.getElementById('drawer-overlay');
            let isDrawerOpen = false;

            function toggleDrawer() {
                isDrawerOpen = !isDrawerOpen;
                if (isDrawerOpen) {
                    drawer.classList.remove('-translate-x-full');
                    overlay.classList.remove('hidden');
                    // Small delay to allow display:block to apply before animating opacity
                    setTimeout(() => {
                        overlay.classList.remove('opacity-0');
                    }, 10);
                } else {
                    drawer.classList.add('-translate-x-full');
                    overlay.classList.add('opacity-0');
                    // Wait for transition to finish before hiding
                    setTimeout(() => {
                        if (!isDrawerOpen) overlay.classList.add('hidden');
                    }, 300);
                }
            }

            menuBtn.addEventListener('click', toggleDrawer);
            overlay.addEventListener('click', toggleDrawer);
        });
    </script>
</body></html>