<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8">
<meta content="width=device-width, initial-scale=1.0" name="viewport">
<title>Burger Broz - Menu</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&amp;family=Geist:wght@500;600&amp;display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet">
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "secondary-container": "#e3e0f2",
                        "surface": "#f9f9fc",
                        "on-background": "#1a1c1e",
                        "outline": "#747a60",
                        "inverse-surface": "#2f3133",
                        "on-surface-variant": "#434933",
                        "background": "#f9f9fc",
                        "on-error-container": "#93000a",
                        "on-secondary-container": "#646371",
                        "surface-tint": "#4f6600",
                        "on-secondary-fixed": "#1a1a26",
                        "on-tertiary-fixed-variant": "#004395",
                        "surface-container-high": "#e8e8eb",
                        "surface-container-low": "#f3f3f6",
                        "secondary-fixed-dim": "#c7c5d5",
                        "on-primary": "#ffffff",
                        "on-tertiary-container": "#0466d9",
                        "on-error": "#ffffff",
                        "on-tertiary": "#ffffff",
                        "primary": "#4f6600",
                        "on-surface": "#1a1c1e",
                        "tertiary": "#005ac2",
                        "tertiary-fixed": "#d8e2ff",
                        "on-secondary": "#ffffff",
                        "primary-fixed": "#c0f500",
                        "surface-bright": "#f9f9fc",
                        "secondary-fixed": "#e3e0f2",
                        "primary-fixed-dim": "#a8d700",
                        "error-container": "#ffdad6",
                        "primary-container": "#c8ff00",
                        "inverse-on-surface": "#f0f0f3",
                        "surface-container": "#edeef1",
                        "tertiary-container": "#e7ecff",
                        "secondary": "#5e5d6b",
                        "inverse-primary": "#a8d700",
                        "outline-variant": "#c4caac",
                        "tertiary-fixed-dim": "#adc6ff",
                        "surface-variant": "#e2e2e5",
                        "surface-dim": "#d9dadd",
                        "surface-container-lowest": "#ffffff",
                        "on-primary-fixed": "#161f00",
                        "on-primary-fixed-variant": "#3b4d00",
                        "surface-container-highest": "#e2e2e5",
                        "on-primary-container": "#597300",
                        "on-tertiary-fixed": "#001a42",
                        "error": "#ba1a1a",
                        "on-secondary-fixed-variant": "#464553"
                    },
                    "borderRadius": {
                        "DEFAULT": "0.25rem",
                        "lg": "0.5rem",
                        "xl": "0.75rem",
                        "full": "9999px"
                    },
                    "fontFamily": {
                        "headline": ["Inter"],
                        "display": ["Inter"],
                        "body": ["Inter"],
                        "label": ["Geist"]
                    }
                }
            }
        }
    </script>
<style>
        body { font-family: 'Inter', sans-serif; }
        .font-label { font-family: 'Geist', monospace; }
        /* Hide scrollbar for category tabs */
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    </style>
</head>
<body class="bg-background text-on-background pb-32">
<!-- Top App Bar (Web / hidden on mobile) -->
<header class="hidden md:flex bg-surface border-b border-outline-variant fixed top-0 w-full z-50 flex justify-between items-center px-16 h-16 w-full">
<div class="flex items-center gap-4">
<span class="material-symbols-outlined text-primary cursor-pointer">arrow_back</span>
<span class="font-headline text-20px font-semibold text-primary">OpenFood</span>
</div>
<div class="flex items-center gap-4 text-on-surface-variant">
<span class="material-symbols-outlined hover:bg-surface-container transition-colors p-2 rounded-full cursor-pointer">search</span>
<span class="material-symbols-outlined hover:bg-surface-container transition-colors p-2 rounded-full cursor-pointer">shopping_basket</span>
</div>
</header>
<main class="md:pt-16">
<!-- Hero Section with Back Button Overlay (Mobile) -->
<div class="relative w-full h-64 md:h-80 bg-surface-container">
<div class="bg-cover bg-center w-full h-full" data-alt="A high-quality, mouth-watering photograph of a bustling modern burger joint interior, focusing on a sizzling smash burger on a grill in the foreground. Bright, natural light streaming through large windows highlights the juicy textures and vibrant green lettuce. The scene is energetic and appetizing, fitting a premium food delivery app aesthetic." style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuAwW3oYfiCBbbCs3iH_4oWBqzG0F4S7j6osA3GIt7axoeOAlLolr6kZjILXAAnUY65-czGWhQwEXQYDH_DLKMMuy33QwQGUgYHR9yYO2HXWpmT3NlvzMxfWPeWZ-XTYysYLXpilHungC7XBK1BzKdV4GNbQW8SNrZavZfZreT4kp6Xnbc7zhAudGeI_ghu4f3e30gxR2si78dzUNc_KpUiIPOF3lFYmFxILEjEcKfbPzRQ0BRn5PziO')"></div>
<!-- Mobile Back Button Overlay -->
<button class="md:hidden absolute top-4 left-4 w-10 h-10 bg-surface-container-lowest/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md z-10 active:scale-95 transition-transform">
<span class="material-symbols-outlined text-on-surface">arrow_back</span>
</button>
<button class="md:hidden absolute top-4 right-4 w-10 h-10 bg-surface-container-lowest/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md z-10 active:scale-95 transition-transform">
<span class="material-symbols-outlined text-on-surface">search</span>
</button>
</div>
<!-- Restaurant Info -->
<div class="px-4 py-6 md:px-8 bg-surface-container-lowest -mt-4 rounded-t-xl relative z-20 shadow-[0px_-4px_20px_rgba(0,0,0,0.05)]">
<div class="max-w-4xl mx-auto">
<h1 class="font-headline text-3xl md:text-4xl font-bold text-on-background mb-2">Burger Broz</h1>
<div class="flex items-center gap-4 text-sm text-on-surface-variant mb-4">
<div class="flex items-center gap-1 bg-surface-container px-2 py-1 rounded">
<span class="material-symbols-outlined text-primary text-sm" style="font-variation-settings: 'FILL' 1;">star</span>
<span class="font-bold text-on-surface">4.9</span>
<span class="text-xs">(1k+ ratings)</span>
</div>
<div class="flex items-center gap-1 font-label">
<span class="material-symbols-outlined text-sm">location_on</span>
<span class="">1.2km away</span>
</div>
<div class="flex items-center gap-1 font-label">
<span class="material-symbols-outlined text-sm">schedule</span>
<span class="">25-35 min</span>
</div>
</div>
</div>
</div>
<!-- Sticky Category Tabs -->
<div class="sticky top-0 md:top-16 z-40 bg-surface-container-lowest border-b border-surface-variant px-4 py-2">
<div class="max-w-4xl mx-auto flex overflow-x-auto no-scrollbar gap-2 py-2">
<button class="whitespace-nowrap px-4 py-2 bg-on-secondary-fixed text-on-primary rounded-full font-label text-sm font-semibold border border-on-secondary-fixed active:scale-95 transition-transform">Must Try</button>
<button class="whitespace-nowrap px-4 py-2 bg-surface text-on-surface-variant rounded-full font-label text-sm font-semibold border border-outline-variant hover:bg-surface-container transition-colors active:scale-95">Combos</button>
<button class="whitespace-nowrap px-4 py-2 bg-surface text-on-surface-variant rounded-full font-label text-sm font-semibold border border-outline-variant hover:bg-surface-container transition-colors active:scale-95">A La Carte</button>
<button class="whitespace-nowrap px-4 py-2 bg-surface text-on-surface-variant rounded-full font-label text-sm font-semibold border border-outline-variant hover:bg-surface-container transition-colors active:scale-95">Drinks</button>
</div>
</div>
<!-- Menu List (Must Try) -->
<div class="max-w-4xl mx-auto px-4 py-6">
<h2 class="font-headline text-2xl font-bold mb-4">Must Try</h2>
<div class="flex flex-col gap-4">
<!-- Menu Item 1 -->
<div class="bg-surface-container-lowest rounded-lg p-4 flex gap-4 border border-surface-variant shadow-sm hover:shadow-md transition-shadow cursor-pointer">
<div class="flex-1 flex flex-col justify-between">
<div>
<h3 class="font-headline text-lg font-semibold text-on-surface">Double Smash Burger</h3>
<p class="text-sm text-on-surface-variant line-clamp-2 mt-1">Two perfectly smashed beef patties, double cheddar cheese, house pickles, and our signature secret sauce on a toasted brioche bun.</p>
</div>
<div class="mt-4 flex items-center justify-between">
<span class="font-label font-bold text-on-surface">Rp 45.000</span>
<button class="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center active:scale-95 transition-transform">
<span class="material-symbols-outlined text-sm font-bold">add</span>
</button>
</div>
</div>
<div class="w-28 h-28 shrink-0 rounded-lg overflow-hidden bg-surface-container relative">
<img class="object-cover w-full h-full" data-alt="A close-up studio shot of a double smash burger. Two crispy, irregular beef patties overflowing with melted cheddar cheese. Bright lighting emphasizes the glossy brioche bun and the juicy texture of the meat against a clean, light neutral background." src="https://lh3.googleusercontent.com/aida-public/AB6AXuD0tl5zbRuzs-6NsruDvRBYlVRShPMaTx_A4Sl9Iab5INPAWJjXapuKc4OQgTFYZvXclxRzeCKSDCmYDW4BjK6ALMwotV5tXAbVuoZeY6jDCKUvJ4ZAQrG2fj_j0LLk99Z4i0XOgsxu1Qg6Vy93UqFIh_s3ZPQy374ptL-B49G14uDd24fNSEmYFGRyAXA8jV11bn5XVMJvE8qsRgHl97m9SpmNwZUuaEwBos-IC8Xz04GuQDbypN30">
</div>
</div>
<!-- Menu Item 2 -->
<div class="bg-surface-container-lowest rounded-lg p-4 flex gap-4 border border-surface-variant shadow-sm hover:shadow-md transition-shadow cursor-pointer">
<div class="flex-1 flex flex-col justify-between">
<div>
<h3 class="font-headline text-lg font-semibold text-on-surface">Classic Cheeseburger</h3>
<p class="text-sm text-on-surface-variant line-clamp-2 mt-1">Single juicy patty, American cheese, crisp lettuce, tomato, and mayo.</p>
</div>
<div class="mt-4 flex items-center justify-between">
<span class="font-label font-bold text-on-surface">Rp 35.000</span>
<div class="flex items-center gap-3 bg-surface-container rounded-full px-2 py-1">
<span class="material-symbols-outlined text-sm cursor-pointer active:scale-95">remove</span>
<span class="font-label font-bold text-on-surface">1</span>
<span class="material-symbols-outlined text-sm cursor-pointer active:scale-95 text-primary">add</span>
</div>
</div>
</div>
<div class="w-28 h-28 shrink-0 rounded-lg overflow-hidden bg-surface-container relative">
<img class="object-cover w-full h-full" data-alt="A classic cheeseburger with a single thick patty, bright yellow American cheese, fresh green lettuce, and a red tomato slice. Studio lighting highlights the freshness of the ingredients on a clean white background, appetizing and vibrant." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBVLbgZoJiva0GEFninqOPPmkuHh49qTIRKXKUxT1zQKKjSTR7pp_XJoQ6LXZoCuZDCVcEHA6Jr8MGa2ozP37PgALcpurbl5bWhvuj7Nt3UkYv19XnTsRoIH6zsW7yzDStphBD6one_1wPKsGZCo_UCERHynKUOzvD581tz2PrH6FXPGImD4Q1JxBLi0ZjeBcYBGhygevKiDX6QpFqbc9ejJ_e7uY-RPz_kmeKN_3IZn63icjl59r6N">
</div>
</div>
<!-- Menu Item 3 -->
<div class="bg-surface-container-lowest rounded-lg p-4 flex gap-4 border border-surface-variant shadow-sm hover:shadow-md transition-shadow cursor-pointer">
<div class="flex-1 flex flex-col justify-between">
<div>
<div class="flex items-center gap-2 mb-1">
<h3 class="font-headline text-lg font-semibold text-on-surface">Truffle Fries</h3>
<span class="bg-primary-container text-on-primary-container text-xs px-2 py-0.5 rounded font-label font-bold">Popular</span>
</div>
<p class="text-sm text-on-surface-variant line-clamp-2 mt-1">Shoestring fries tossed in truffle oil and parmesan cheese, served with garlic aioli.</p>
</div>
<div class="mt-4 flex items-center justify-between">
<span class="font-label font-bold text-on-surface">Rp 25.000</span>
<button class="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center active:scale-95 transition-transform">
<span class="material-symbols-outlined text-sm font-bold">add</span>
</button>
</div>
</div>
<div class="w-28 h-28 shrink-0 rounded-lg overflow-hidden bg-surface-container relative">
<img class="object-cover w-full h-full" data-alt="A generous portion of crispy golden shoestring fries, lightly dusted with grated parmesan and parsley, piled high in a clean, modern bowl. Soft, directional lighting highlights the texture and implies a rich, savory truffle aroma." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCfU7InErQZOuQHr2dlTMybF9G9sxXFC0hvPSjDOPxSkVdkoK4XINUXEGzFyJi7dChe1mZRJVhcS7X96b2_-ZLAy5Cr0J_2npPkXzB-3sUdy7RNzqEXq7T-l95br7TaJwJSersjy736KRJieQjpcIlCG4Sn31NqiLbPV7_pYUo6dZFHFRPHhMAiF79khk8fVl6i2X7vju3tO7t3DM2brsRrrczbdaUCHKLeFqLjJIXKfsyLYtzcZ4r-">
</div>
</div>
</div>
</div>
</main>
<!-- Sticky View Cart Bar (Floating above bottom nav on mobile, sticky bottom on web) -->
<div class="fixed bottom-24 md:bottom-6 left-0 w-full px-4 z-40 flex justify-center">
<button class="w-full max-w-md bg-primary text-on-primary rounded-xl p-4 flex items-center justify-between shadow-lg active:scale-95 transition-transform duration-200">
<div class="flex flex-col text-left">
<span class="font-label text-sm font-medium text-primary-container">1 item</span>
<span class="font-headline font-bold">Rp 35.000</span>
</div>
<div class="flex items-center gap-2 font-headline font-semibold">
<span class="">View Cart</span>
<span class="material-symbols-outlined">shopping_bag</span>
</div>
</button>
</div>
<!-- Bottom Navigation Shell (Mobile Only) -->
<nav class="md:hidden bg-surface-container-lowest dark:bg-inverse-surface shadow-[0px_-4px_20px_rgba(0,0,0,0.05)] fixed bottom-0 w-full z-50 rounded-t-lg flex justify-around items-center h-20 px-2">
<!-- Inactive -->

<!-- Active Intent (We are browsing a restaurant menu, usually part of Home/Explore flow, but let's assume 'Home' is active as it's the main discovery hub, or if this app considers food browsing an 'Order' activity. Let's keep it clean: We are deep in a flow, technically bottom nav shouldn't be here based on rules, but user explicitly requested "Standard 5-item bottom navigation". I will default to Home as active origin.) -->
<a class="flex flex-col items-center justify-center bg-primary-container dark:bg-primary text-on-primary-container dark:text-on-primary rounded-xl px-3 py-1.5 hover:text-primary dark:hover:text-primary-fixed active:scale-90 transition-transform duration-200" href="#">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">home</span>
<span class="font-label text-label-sm font-semibold mt-1">Home</span>
</a>
<!-- Inactive -->
<a class="flex flex-col items-center justify-center text-on-surface-variant dark:text-surface-variant px-3 py-1.5 hover:text-primary dark:hover:text-primary-fixed active:scale-90 transition-transform duration-200" href="#">
<span class="material-symbols-outlined">receipt_long</span>
<span class="font-label text-label-sm font-semibold mt-1">Orders</span>
</a>
<!-- Inactive -->
<a class="flex flex-col items-center justify-center text-on-surface-variant dark:text-surface-variant px-3 py-1.5 hover:text-primary dark:hover:text-primary-fixed active:scale-90 transition-transform duration-200" href="#">
<span class="material-symbols-outlined">chat_bubble</span>
<span class="font-label text-label-sm font-semibold mt-1">Chat</span>
</a>
<!-- Inactive -->
<a class="flex flex-col items-center justify-center text-on-surface-variant dark:text-surface-variant px-3 py-1.5 hover:text-primary dark:hover:text-primary-fixed active:scale-90 transition-transform duration-200" href="#">
<span class="material-symbols-outlined">local_offer</span>
<span class="font-label text-label-sm font-semibold mt-1">Promo</span>
</a>
<!-- Inactive -->
<a class="flex flex-col items-center justify-center text-on-surface-variant dark:text-surface-variant px-3 py-1.5 hover:text-primary dark:hover:text-primary-fixed active:scale-90 transition-transform duration-200" href="#">
<span class="material-symbols-outlined">person</span>
<span class="font-label text-label-sm font-semibold mt-1">Profile</span>
</a>
</nav>


</body></html>