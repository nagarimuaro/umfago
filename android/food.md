<!DOCTYPE html>

<html class="light" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>OpenFood - Burgers Category</title>
<!-- Material Symbols -->
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<!-- Google Fonts -->
<link href="https://fonts.googleapis.com" rel="preconnect"/>
<link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@500;600&amp;family=Inter:wght@400;600;700&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<!-- Tailwind CSS -->
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<!-- Theme Configuration -->
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
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
                    borderRadius: {
                        "DEFAULT": "0.5rem",
                        "sm": "0.25rem",
                        "md": "0.75rem",
                        "lg": "1rem",
                        "xl": "1.5rem",
                        "full": "9999px"
                    },
                    spacing: {
                        "base": "4px",
                        "xs": "8px",
                        "sm": "12px",
                        "md": "16px",
                        "lg": "24px",
                        "xl": "32px",
                        "edge-margin": "16px",
                        "gutter": "12px"
                    },
                    fontFamily: {
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
        .no-scrollbar::-webkit-scrollbar {
            display: none;
        }
        .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
    </style>
<style>
    body {
      min-height: max(884px, 100dvh);
    }
  </style>
  </head>
<body class="bg-background text-on-background font-body min-h-screen pb-24 md:pb-0 pt-16">
<!-- TopAppBar -->
<header class="fixed top-0 w-full z-50 bg-surface dark:bg-on-background border-b border-outline-variant dark:border-outline flex justify-between items-center px-edge-margin h-16 transition-colors">
<button class="text-on-surface-variant hover:bg-surface-container active:scale-95 duration-150 p-2 rounded-full flex items-center justify-center">
<span class="material-symbols-outlined" data-icon="arrow_back">arrow_back</span>
</button>
<div class="flex-1 px-4 relative">
<span class="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
<input class="w-full bg-surface-container-lowest border border-outline-variant rounded-full py-2 pl-8 pr-4 text-sm font-label focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" placeholder="Search..." type="text" value="Burgers"/>
</div>
<button class="text-on-surface-variant hover:bg-surface-container active:scale-95 duration-150 p-2 rounded-full flex items-center justify-center relative">
<span class="material-symbols-outlined" data-icon="shopping_basket">shopping_basket</span>
<span class="absolute top-1 right-1 w-2 h-2 bg-error rounded-full"></span>
</button>
</header>
<!-- Main Content Canvas -->
<main class="w-full max-w-3xl mx-auto px-edge-margin py-lg flex flex-col gap-lg">
<!-- Filter Chips (Horizontal Scroll) -->
<section class="w-full overflow-x-auto no-scrollbar -mx-edge-margin px-edge-margin py-2">
<div class="flex gap-2">
<button class="flex items-center gap-1 px-4 py-2 bg-primary-container text-on-primary-container border border-primary rounded-full font-label text-label-sm whitespace-nowrap active:scale-95 transition-transform">
<span class="material-symbols-outlined text-[16px]">tune</span>
                    Sort
                </button>
<button class="flex items-center px-4 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant rounded-full font-label text-label-sm whitespace-nowrap hover:bg-surface-container active:scale-95 transition-all">
                    Rating 4.5+
                </button>
<button class="flex items-center px-4 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant rounded-full font-label text-label-sm whitespace-nowrap hover:bg-surface-container active:scale-95 transition-all">
                    Nearest
                </button>
<button class="flex items-center px-4 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant rounded-full font-label text-label-sm whitespace-nowrap hover:bg-surface-container active:scale-95 transition-all">
                    Promo
                </button>
<button class="flex items-center px-4 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant rounded-full font-label text-label-sm whitespace-nowrap hover:bg-surface-container active:scale-95 transition-all">
                    Under 30 mins
                </button>
</div>
</section>
<!-- Results Title -->
<div class="pt-2 pb-1">
<h1 class="font-headline text-headline-md font-semibold text-on-background">Top Burgers Near You</h1>
<p class="font-label text-label-sm text-on-surface-variant mt-1">42 places found</p>
</div>
<!-- Restaurant List (Bento-style Grid for Web, Stack for Mobile) -->
<div class="grid grid-cols-1 md:grid-cols-2 gap-gutter">
<!-- Card 1 (Featured) -->
<article class="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-[0px_4px_20px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col active:scale-[0.98] transition-transform duration-200 cursor-pointer">
<div class="relative h-48 w-full">
<img class="w-full h-full object-cover" data-alt="A close-up, high-quality photograph of a massive double cheeseburger with melted cheddar cascading down the sides, crisp lettuce, and a glossy brioche bun. The burger is presented on a wooden board in a softly lit, modern diner setting. High-key light-mode aesthetic with rich, vibrant primary colors, highlighting the high-contrast professional styling of a food delivery app." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDivOXCeiCvKVZv3GDipVZiBSJu9zKOsEBJ7vMiGk1yE43hyDLM1hZJ8fQKc_CM9YFw8yCV3pGtMbCndP83aEptGI20oSe_LM28rTtxl83-lVYu3zrpwr2T57ZVf5MrdYkNxD5ltfqbk9rf6rg2p1DoCfq6_TMN_ISiiPLqTt58JXwgUXAYkuh5Dg1NOgk2cG2YSxMF6HXCrFnO3hG1T-km5nCkQXInbfv5iHcNc0Kp1ZtrEbqhTQ6i"/>
<!-- Badges -->
<div class="absolute top-3 left-3 flex gap-2">
<span class="bg-primary text-on-primary font-label text-xs font-semibold px-2 py-1 rounded-sm shadow-sm flex items-center gap-1">
<span class="material-symbols-outlined text-[14px]">local_offer</span> Free Delivery
                        </span>
</div>
<button class="absolute top-3 right-3 p-1.5 bg-surface/80 backdrop-blur-sm rounded-full text-on-surface hover:text-error transition-colors">
<span class="material-symbols-outlined text-[20px]">favorite</span>
</button>
</div>
<div class="p-4 flex flex-col flex-1">
<div class="flex justify-between items-start mb-1">
<h2 class="font-headline text-headline-md font-semibold truncate pr-2">Smash &amp; Co. Burger</h2>
<div class="flex items-center gap-1 bg-surface-container-high px-1.5 py-0.5 rounded-sm shrink-0">
<span class="material-symbols-outlined text-[14px] text-surface-tint" style="font-variation-settings: 'FILL' 1;">star</span>
<span class="font-label text-label-sm font-semibold text-on-surface">4.9</span>
</div>
</div>
<p class="text-on-surface-variant font-body text-sm mb-3">American • Burgers • Fast Food</p>
<div class="mt-auto flex items-center gap-4 text-on-surface-variant font-label text-label-sm">
<div class="flex items-center gap-1">
<span class="material-symbols-outlined text-[16px]">schedule</span>
                            15-25 min
                        </div>
<div class="flex items-center gap-1">
<span class="material-symbols-outlined text-[16px]">location_on</span>
                            1.2 km
                        </div>
<div class="flex items-center gap-1 ml-auto">
<span class="material-symbols-outlined text-[16px]">local_shipping</span>
                            $0.00
                        </div>
</div>
</div>
</article>
<!-- Card 2 -->
<article class="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-[0px_4px_20px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col active:scale-[0.98] transition-transform duration-200 cursor-pointer">
<div class="relative h-48 w-full">
<img class="w-full h-full object-cover" data-alt="A vibrant, professional food photo of a crispy chicken sandwich burger spilling over with spicy mayo and pickles, nestled in a toasted bun. Placed on a clean white surface with minimal modern props in the background. The lighting is bright and clear, reflecting a clean, high-contrast UI aesthetic suited for a reliable food delivery application." src="https://lh3.googleusercontent.com/aida-public/AB6AXuB-YGPuCDenVDAHNdVk3lFVoTQmREiGaSqXYFJ4TZ7Vg-eeU42JpAjQN0JhMoHhsCKzrCKXv-em21_SgM7B7sCk-Bqi5WbkARYSKQxfEuKpQwkdViM5o5ds8jp-Aa0-KU7naCjlssYSekD6pQgxEhAhYsXXk3yUn1Z7o3ZPP_KGpG4XiLD38e0Cf3xjKQPivHstq0rjKkkACs7T3X2UEk7ZlFdlsMOqy-vRjdMR7ypy-JhCAxeVpplH"/>
<div class="absolute top-3 left-3 flex gap-2">
<span class="bg-secondary text-on-secondary font-label text-xs font-semibold px-2 py-1 rounded-sm shadow-sm flex items-center gap-1">
                            20% OFF
                        </span>
</div>
</div>
<div class="p-4 flex flex-col flex-1">
<div class="flex justify-between items-start mb-1">
<h2 class="font-headline text-headline-md font-semibold truncate pr-2">Crispy Bird Burgers</h2>
<div class="flex items-center gap-1 bg-surface-container-high px-1.5 py-0.5 rounded-sm shrink-0">
<span class="material-symbols-outlined text-[14px] text-surface-tint" style="font-variation-settings: 'FILL' 1;">star</span>
<span class="font-label text-label-sm font-semibold text-on-surface">4.7</span>
</div>
</div>
<p class="text-on-surface-variant font-body text-sm mb-3">Chicken • Burgers • Halal</p>
<div class="mt-auto flex items-center gap-4 text-on-surface-variant font-label text-label-sm">
<div class="flex items-center gap-1">
<span class="material-symbols-outlined text-[16px]">schedule</span>
                            20-35 min
                        </div>
<div class="flex items-center gap-1">
<span class="material-symbols-outlined text-[16px]">location_on</span>
                            2.4 km
                        </div>
<div class="flex items-center gap-1 ml-auto">
<span class="material-symbols-outlined text-[16px]">local_shipping</span>
                            $1.50
                        </div>
</div>
</div>
</article>
<!-- Card 3 -->
<article class="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-[0px_4px_20px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col active:scale-[0.98] transition-transform duration-200 cursor-pointer">
<div class="relative h-48 w-full">
<img class="w-full h-full object-cover" data-alt="A delectable overhead shot of a classic bacon cheeseburger and a side of golden crinkle-cut fries on a metal tray. The scene is brightly lit with natural sunlight, highlighting the textures of the crispy bacon and fresh vegetables, adhering strictly to a high-end, clean food delivery platform visual style." src="https://lh3.googleusercontent.com/aida-public/AB6AXuADs-xtEP8BTrPoyXwFEZKwlf8dt3TfPdaYPm43KR_OUohncemD87g3cZw5m7NKig20Jt9IuOmp1hjTRq3zNzZj-U5JzzMfswoCIlEXBYFfG1DfTPw3zH2fSSBp17G49_WUl61S05ojVC4YdpqrUtgs7ylee0w8q5ZgAV_ClsYDa4-aiz1vuBHyCMquQrW2rhiQ0B106kbR-IfRiwxrXdJ5uWZPTXY7z1BVnPRlZGeGI_EsghK_Syci"/>
</div>
<div class="p-4 flex flex-col flex-1">
<div class="flex justify-between items-start mb-1">
<h2 class="font-headline text-headline-md font-semibold truncate pr-2">The Burger Joint</h2>
<div class="flex items-center gap-1 bg-surface-container-high px-1.5 py-0.5 rounded-sm shrink-0">
<span class="material-symbols-outlined text-[14px] text-surface-tint" style="font-variation-settings: 'FILL' 1;">star</span>
<span class="font-label text-label-sm font-semibold text-on-surface">4.5</span>
</div>
</div>
<p class="text-on-surface-variant font-body text-sm mb-3">American • Diner • Shakes</p>
<div class="mt-auto flex items-center gap-4 text-on-surface-variant font-label text-label-sm">
<div class="flex items-center gap-1">
<span class="material-symbols-outlined text-[16px]">schedule</span>
                            10-20 min
                        </div>
<div class="flex items-center gap-1">
<span class="material-symbols-outlined text-[16px]">location_on</span>
                            0.8 km
                        </div>
<div class="flex items-center gap-1 ml-auto">
<span class="material-symbols-outlined text-[16px]">local_shipping</span>
                            $2.00
                        </div>
</div>
</div>
</article>
</div>
</main>
<!-- BottomNavBar (Mobile Only) -->
<nav class="md:hidden fixed bottom-0 w-full z-50 rounded-t-lg bg-surface-container-lowest dark:bg-inverse-surface shadow-[0px_-4px_20px_rgba(0,0,0,0.05)] flex justify-around items-center h-20 px-2 pb-safe">
<!-- Home (Active) -->
<a class="flex flex-col items-center justify-center bg-primary-container dark:bg-primary text-on-primary-container dark:text-on-primary rounded-xl px-3 py-1.5 active:scale-90 transition-transform duration-200" href="#">
<span class="material-symbols-outlined" data-icon="home" data-weight="fill" style="font-variation-settings: 'FILL' 1;">home</span>
<span class="font-label text-label-sm font-semibold mt-1">Home</span>
</a>
<!-- Orders -->
<a class="flex flex-col items-center justify-center text-on-surface-variant dark:text-surface-variant px-3 py-1.5 hover:text-primary dark:hover:text-primary-fixed active:scale-90 transition-transform duration-200" href="#">
<span class="material-symbols-outlined" data-icon="receipt_long">receipt_long</span>
<span class="font-label text-label-sm font-semibold mt-1">Orders</span>
</a>
<!-- Chat -->
<a class="flex flex-col items-center justify-center text-on-surface-variant dark:text-surface-variant px-3 py-1.5 hover:text-primary dark:hover:text-primary-fixed active:scale-90 transition-transform duration-200 relative" href="#">
<span class="material-symbols-outlined" data-icon="chat_bubble">chat_bubble</span>
<span class="font-label text-label-sm font-semibold mt-1">Chat</span>
</a>
<!-- Promo -->
<a class="flex flex-col items-center justify-center text-on-surface-variant dark:text-surface-variant px-3 py-1.5 hover:text-primary dark:hover:text-primary-fixed active:scale-90 transition-transform duration-200" href="#">
<span class="material-symbols-outlined" data-icon="local_offer">local_offer</span>
<span class="font-label text-label-sm font-semibold mt-1">Promo</span>
</a>
<!-- Profile -->
<a class="flex flex-col items-center justify-center text-on-surface-variant dark:text-surface-variant px-3 py-1.5 hover:text-primary dark:hover:text-primary-fixed active:scale-90 transition-transform duration-200" href="#">
<span class="material-symbols-outlined" data-icon="person">person</span>
<span class="font-label text-label-sm font-semibold mt-1">Profile</span>
</a>
</nav>
</body></html>