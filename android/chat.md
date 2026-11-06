<!DOCTYPE html><html class="light" lang="en"><head>
<meta charset="utf-8">
<meta content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" name="viewport">
<title>OpenJek - Chat List</title>
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
                        "surface": "#f9f9fc",
                        "secondary-fixed-dim": "#c7c5d5",
                        "on-error": "#ffffff",
                        "primary-fixed-dim": "#a8d700",
                        "on-tertiary": "#ffffff",
                        "on-tertiary-fixed": "#001a42",
                        "on-secondary-container": "#646371",
                        "secondary-container": "#e3e0f2",
                        "on-tertiary-fixed-variant": "#004395",
                        "inverse-primary": "#a8d700",
                        "surface-dim": "#d9dadd",
                        "on-tertiary-container": "#0466d9",
                        "secondary-fixed": "#e3e0f2",
                        "surface-bright": "#f9f9fc",
                        "surface-container-lowest": "#ffffff",
                        "error": "#ba1a1a",
                        "primary-container": "#c8ff00",
                        "surface-container-high": "#e8e8eb",
                        "outline-variant": "#c4caac",
                        "on-surface-variant": "#434933",
                        "secondary": "#5e5d6b",
                        "on-secondary-fixed": "#1a1a26",
                        "on-secondary-fixed-variant": "#464553",
                        "primary-fixed": "#c0f500",
                        "outline": "#747a60",
                        "on-primary-fixed": "#161f00",
                        "on-background": "#1a1c1e",
                        "on-primary-fixed-variant": "#3b4d00",
                        "surface-variant": "#e2e2e5",
                        "on-primary-container": "#597300",
                        "tertiary": "#005ac2",
                        "on-secondary": "#ffffff",
                        "tertiary-container": "#e7ecff",
                        "surface-container-highest": "#e2e2e5",
                        "surface-container": "#edeef1",
                        "inverse-on-surface": "#f0f0f3",
                        "tertiary-fixed-dim": "#adc6ff",
                        "tertiary-fixed": "#d8e2ff",
                        "on-primary": "#ffffff",
                        "on-error-container": "#93000a",
                        "on-surface": "#1a1c1e",
                        "surface-tint": "#4f6600",
                        "primary": "#4f6600",
                        "surface-container-low": "#f3f3f6",
                        "background": "#f9f9fc",
                        "inverse-surface": "#2f3133",
                        "error-container": "#ffdad6"
                    },
                    "borderRadius": {
                        "DEFAULT": "0.25rem",
                        "lg": "0.5rem",
                        "xl": "0.75rem",
                        "full": "9999px"
                    },
                    "spacing": {
                        "base": "4px",
                        "xs": "8px",
                        "sm": "12px",
                        "md": "16px",
                        "lg": "24px",
                        "xl": "32px",
                        "edge-margin": "16px",
                        "gutter": "12px",
                        "pb-safe": "env(safe-area-inset-bottom)"
                    },
                    "fontFamily": {
                        "headline": ["Inter", "sans-serif"],
                        "display": ["Inter", "sans-serif"],
                        "body": ["Inter", "sans-serif"],
                        "label": ["Geist", "monospace"]
                    },
                    "fontSize": {
                        "headline-xl": ["32px", { lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "700" }],
                        "headline-lg": ["24px", { lineHeight: "32px", letterSpacing: "-0.01em", fontWeight: "700" }],
                        "headline-md": ["20px", { lineHeight: "28px", fontWeight: "600" }],
                        "body-lg": ["18px", { lineHeight: "26px", fontWeight: "400" }],
                        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
                        "label-md": ["14px", { lineHeight: "20px", letterSpacing: "0.02em", fontWeight: "500" }],
                        "label-sm": ["12px", { lineHeight: "16px", fontWeight: "600" }],
                        "headline-lg-mobile": ["22px", { lineHeight: "28px", fontWeight: "700" }]
                    }
                }
            }
        }
    </script>
<style>
        body { -webkit-tap-highlight-color: transparent; }
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
        .icon-fill { font-variation-settings: 'FILL' 1; }
    </style>
</head>
<body class="bg-background text-on-background font-body min-h-screen flex flex-col antialiased relative pb-20 md:pb-0">
<!-- Top App Bar -->
<header class="bg-surface sticky top-0 w-full z-40 bg-surface-container-low flex items-center justify-between px-edge-margin h-16 transition-colors">
<div class="flex items-center gap-4">
<button aria-label="Go back" class="active:scale-95 transition-transform duration-150 text-on-surface hover:bg-surface-container-high p-2 rounded-full hidden md:flex">
<span class="material-symbols-outlined text-2xl" data-icon="arrow_back">arrow_back</span>
</button>
<h1 class="font-headline font-bold text-primary text-headline-lg-mobile md:text-headline-lg tracking-tight">Chat</h1>
</div>
<div class="flex items-center">
<button aria-label="Call support" class="active:scale-95 transition-transform duration-150 text-on-surface hover:bg-surface-container-high p-2 rounded-full">
<span class="material-symbols-outlined text-2xl" data-icon="call">call</span>
</button>
</div>
</header>
<!-- Main Content Canvas -->
<main class="flex-1 w-full max-w-3xl mx-auto flex flex-col md:flex-row md:px-edge-margin pt-4 gap-gutter">
<!-- Desktop Sidebar Nav (Hidden on Mobile) -->
<aside class="hidden md:flex flex-col h-[calc(100vh-5rem)] w-64 bg-surface-container-lowest rounded-xl shadow-xl py-6 gap-2 sticky top-20 flex-shrink-0">
<div class="px-6 mb-4">
<h2 class="font-headline font-bold text-primary text-headline-md">Navigation</h2>
</div>
<nav class="flex flex-col gap-1 px-4">
<a class="flex items-center gap-3 p-3 text-on-surface-variant hover:bg-surface-container-high rounded-lg mx-2 transition-colors duration-200" href="#">
<span class="material-symbols-outlined" data-icon="home">home</span>
<span class="font-label text-label-md">Home</span>
</a>
<a class="flex items-center gap-3 p-3 text-on-surface-variant hover:bg-surface-container-high rounded-lg mx-2 transition-colors duration-200" href="#">
<span class="material-symbols-outlined" data-icon="receipt_long">receipt_long</span>
<span class="font-label text-label-md">Orders</span>
</a>
<a class="flex items-center gap-3 p-3 bg-secondary-container text-on-secondary-container font-semibold rounded-lg mx-2 transition-colors duration-200 shadow-sm" href="#">
<span class="material-symbols-outlined icon-fill" data-icon="chat_bubble">chat_bubble</span>
<span class="font-label text-label-md">Chat</span>
</a>
<a class="flex items-center gap-3 p-3 text-on-surface-variant hover:bg-surface-container-high rounded-lg mx-2 transition-colors duration-200" href="#">
<span class="material-symbols-outlined" data-icon="person">person</span>
<span class="font-label text-label-md">Profile</span>
</a>
</nav>
</aside>
<!-- Chat List Container -->
<section class="flex-1 w-full flex flex-col">
<!-- Search Bar -->
<div class="px-edge-margin pb-4 md:px-0">
<div class="relative w-full">
<span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
<input class="w-full h-12 pl-12 pr-4 bg-surface-container rounded-lg border border-surface-variant text-on-surface focus:outline-none focus:border-on-surface focus:ring-1 focus:ring-on-surface transition-all font-body text-body-md placeholder-on-surface-variant" placeholder="Search chats..." type="text">
</div>
</div>
<!-- Chat Items -->
<div class="flex flex-col bg-surface-container-lowest md:rounded-xl md:shadow-sm overflow-hidden border-t md:border border-surface-variant divide-y divide-surface-variant">
<!-- Item 1: Active Driver Chat -->
<a class="flex items-center p-4 hover:bg-surface-container-lowest/80 transition-colors bg-white relative active:bg-surface-container group" href="#">
<div class="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-primary-container shadow-sm">
<img alt="Driver profile" class="w-full h-full object-cover" data-alt="A close-up portrait of a friendly professional ride-hailing driver wearing a standard uniform. The background is slightly blurred showing an urban street scene. High key lighting, modern light-mode aesthetic, vibrant colors with a focus on clear visibility." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAFK2i3QGNgOM6nFPwDFucWlMakjah446qv9F3zLNgrH8yBTo43Yb5crvTHaPQj7hEd2Sdr5EX_NkHFynbCTq-0VXP_K7R6bjjSEo9T0wnGdMTJd_rWEOeGzMDqj8I08c0d4JCknlqeOaULx3X8vsIz5PlUzZr6DmReM3iTw-dbUHpExsPX0U40GRkxCN3yzBsnbkjlflZZX__CwqETOend9J2xSNYFAWSUtzEYiHra1u956L3mkvlU">
</div>
<div class="ml-4 flex-1 min-w-0">
<div class="flex justify-between items-baseline mb-1">
<h3 class="font-headline text-body-lg font-bold text-on-surface truncate">Budi (Driver)</h3>
<span class="font-label text-label-sm text-primary font-semibold ml-2 flex-shrink-0">Just now</span>
</div>
<p class="font-body text-body-md text-on-surface truncate font-semibold">I have arrived!</p>
</div>
<div class="ml-3 flex-shrink-0 flex items-center justify-center w-6 h-6 bg-primary-container text-on-primary-container rounded-full text-label-sm font-label font-bold">
                        1
                    </div>
</a>
<!-- Item 2: Active Order Chat -->
<a class="flex items-center p-4 hover:bg-surface-container-lowest/80 transition-colors bg-white active:bg-surface-container group" href="#">
<div class="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-secondary-container flex items-center justify-center text-on-secondary-container">
<span class="material-symbols-outlined text-2xl icon-fill" data-icon="restaurant">restaurant</span>
</div>
<div class="ml-4 flex-1 min-w-0">
<div class="flex justify-between items-baseline mb-1">
<h3 class="font-headline text-body-lg font-bold text-on-surface truncate">Burger Joint Downtown</h3>
<span class="font-label text-label-sm text-on-surface-variant ml-2 flex-shrink-0">10:42 AM</span>
</div>
<p class="font-body text-body-md text-on-surface truncate font-semibold">Your order is being prepared.</p>
</div>
<div class="ml-3 flex-shrink-0 flex items-center justify-center w-6 h-6 bg-primary-container text-on-primary-container rounded-full text-label-sm font-label font-bold">
                        2
                    </div>
</a>
<!-- Item 3: Past Support Chat -->
<a class="flex items-center p-4 hover:bg-surface-container-lowest/80 transition-colors bg-white active:bg-surface-container group opacity-75" href="#">
<div class="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-surface-container-high flex items-center justify-center text-on-surface-variant">
<span class="material-symbols-outlined text-2xl" data-icon="support_agent">support_agent</span>
</div>
<div class="ml-4 flex-1 min-w-0">
<div class="flex justify-between items-baseline mb-1">
<h3 class="font-headline text-body-lg font-bold text-on-surface truncate">OpenJek Support</h3>
<span class="font-label text-label-sm text-on-surface-variant ml-2 flex-shrink-0">Yesterday</span>
</div>
<p class="font-body text-body-md text-on-surface-variant truncate">How was your last trip?</p>
</div>
</a>
</div>
<div class="p-6 text-center mt-4">
<p class="text-label-md font-label text-on-surface-variant">Older messages are automatically archived.</p>
</div>
</section>
</main>
<!-- Bottom Navigation Bar (Mobile Only) -->
<nav class="md:hidden bg-surface flex justify-around items-center w-full h-20 px-2 pb-safe fixed bottom-0 z-50 bg-surface-container shadow-[0_-4px_20px_rgba(0,0,0,0.05)] border-t-0"><a class="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-all active:scale-90 w-16 group" href="#">
<span class="material-symbols-outlined mb-1 group-hover:scale-110 transition-transform" data-icon="home">home</span>
<span class="font-label text-label-sm">Home</span>
</a>
<a class="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-all active:scale-90 w-16 group" href="#">
<span class="material-symbols-outlined mb-1 group-hover:scale-110 transition-transform" data-icon="receipt_long">receipt_long</span>
<span class="font-label text-label-sm">Orders</span>
</a>
<a class="flex flex-col items-center justify-center bg-primary-container text-on-primary-container rounded-xl px-4 py-1 active:scale-90 transition-transform w-16" href="#">
<span class="material-symbols-outlined mb-1 icon-fill" data-icon="chat_bubble">chat_bubble</span>
<span class="font-label text-label-sm font-bold">Chat</span>
</a>
<a class="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-all active:scale-90 w-16 group" href="#">
<span class="material-symbols-outlined mb-1 group-hover:scale-110 transition-transform" data-icon="local_offer">local_offer</span>
<span class="font-label text-label-sm">Promo</span>
</a>
<a class="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-all active:scale-90 w-16 group" href="#">
<span class="material-symbols-outlined mb-1 group-hover:scale-110 transition-transform" data-icon="person">person</span>
<span class="font-label text-label-sm">Profile</span>
</a></nav>


</body></html>