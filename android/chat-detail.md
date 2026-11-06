<!DOCTYPE html><html class="light" lang="en" style=""><head>
<meta charset="utf-8">
<meta content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" name="viewport">
<title>OpenJek - Chat with Driver</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com" rel="preconnect">
<link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&amp;family=Geist:wght@500;600&amp;display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet">
<style>
        .material-symbols-outlined {
            font-variation-settings:
                'FILL' 0,
                'wght' 400,
                'GRAD' 0,
                'opsz' 24;
        }
    </style>
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
                    "fontFamily": {
                        "headline": ["Inter"],
                        "display": ["Inter"],
                        "body": ["Inter"],
                        "label": ["Geist"]
                    }
                },
            },
        }
    </script>
</head>
<body class="bg-background text-on-background font-body antialiased flex flex-col h-screen overflow-hidden">
<!-- TopAppBar JSON Anchor -->
<header class="bg-surface sticky top-0 w-full z-10">
<div class="flex items-center justify-between px-edge-margin h-16 w-full border-b border-surface-container-highest py-2">
<div class="flex items-center gap-sm">
<button class="text-on-surface p-2 rounded-full hover:bg-surface-container-high transition-colors active:scale-95 duration-150 flex items-center justify-center">
<span class="material-symbols-outlined" data-icon="arrow_back">arrow_back</span>
</button>
<div class="flex items-center gap-3">
<img class="w-10 h-10 rounded-full object-cover" data-alt="A professional headshot of a friendly driver named Budi, wearing a green OpenJek uniform jacket. Bright, natural lighting typical of an ID photo, clean white background. High-quality corporate modern aesthetic." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBu8efZOJX4_iyaIFvy-m92LuOZzfKiYdee2nbWrfqjLtJV3g4zp8MJVKEXsa4d2Nfl1cgbWOOYPpbZSe8FgyskCHM6X12biFeIOyHczYzxd_sre5KXc7t-JvC2dXJ6X93LYy_3z2Bj2tJmOkJIs-LOnzrXjsSHrpGkAYXxbW9lEepdcEmquWOwwenDgeqEiOeVBtHaBTmD5fgU3cPDMwBmmeArQ3AvkImW-mK8BPN600dTNvmFaqq3">
<div>
<h1 class="font-headline font-bold text-on-surface text-base leading-tight">Budi</h1>
<div class="flex items-center gap-1 text-on-surface-variant font-label text-label-sm">
<span class="material-symbols-outlined text-[14px]" data-icon="star" data-weight="fill" style="font-variation-settings: 'FILL' 1;">star</span>
<span class="">4.9</span>
<span class="">•</span>
<span class="">Black Honda Vario - B 1234 XYZ</span>
</div>
</div>
</div>
</div>
<button class="text-primary p-2 rounded-full bg-surface-container-low hover:bg-surface-container-high transition-colors active:scale-95 duration-150 flex items-center justify-center">
<span class="material-symbols-outlined" data-icon="call">call</span>
</button>
</div>
</header>
<!-- Chat Body -->
<main class="flex-1 overflow-y-auto p-4 flex flex-col bg-surface-bright pb-32 gap-sm">
<!-- System Message -->
<div class="text-center w-full my-2">
<span class="font-label text-label-sm text-on-surface-variant bg-surface-container-low px-3 py-1 rounded-full">Today, 10:45 AM</span>
</div>
<!-- Driver Message 1 -->
<div class="flex flex-col items-start w-full">
<div class="bg-surface-container p-3 rounded-lg rounded-tl-sm max-w-[80%] text-on-surface font-body text-body-md shadow-sm border border-surface-container-highest">
                Hello, I'm on my way.
            </div>
<span class="font-label text-[10px] text-on-surface-variant mt-1 ml-1">3 min ago</span>
</div>
<!-- Driver Message 2 -->
<div class="flex flex-col items-start w-full mt-2">
<div class="bg-surface-container p-3 rounded-lg rounded-tl-sm max-w-[80%] text-on-surface font-body text-body-md shadow-sm border border-surface-container-highest">
                I have arrived at the pickup point.
            </div>
<span class="font-label text-[10px] text-on-surface-variant mt-1 ml-1">Just now</span>
</div>
</main>
<!-- Input Area -->
<footer class="bg-surface border-t border-surface-container-highest fixed bottom-0 w-full pb-safe">
<!-- Quick Replies -->
<div class="flex overflow-x-auto gap-2 px-4 no-scrollbar scroll-smooth py-4">
<button class="whitespace-nowrap px-4 py-2 rounded-full border border-outline-variant text-on-surface bg-surface-container-lowest font-label text-label-sm hover:bg-surface-container-low transition-colors active:scale-95">Okay, wait a min</button>
<button class="whitespace-nowrap px-4 py-2 rounded-full border border-outline-variant text-on-surface bg-surface-container-lowest font-label text-label-sm hover:bg-surface-container-low transition-colors active:scale-95">I'm coming</button>
<button class="whitespace-nowrap px-4 py-2 rounded-full border border-outline-variant text-on-surface bg-surface-container-lowest font-label text-label-sm hover:bg-surface-container-low transition-colors active:scale-95">Where are you?</button>
</div>
<!-- Input Field -->
<div class="px-4 pb-4 flex items-end gap-2 pt-2">
<div class="flex-1 bg-surface-container-low rounded-xl border border-surface-container-highest focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all flex items-center px-3 min-h-[48px]">
<input class="w-full bg-transparent border-none focus:ring-0 text-on-surface font-body text-body-md placeholder:text-on-surface-variant py-3" placeholder="Type a message..." type="text">
</div>
<button class="bg-primary-container text-on-primary-container h-12 w-12 rounded-xl flex items-center justify-center hover:bg-primary-fixed-dim transition-colors active:scale-95 flex-shrink-0">
<span class="material-symbols-outlined" data-icon="send">send</span>
</button>
</div>
</footer>
<style>
        .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    </style>


</body></html>