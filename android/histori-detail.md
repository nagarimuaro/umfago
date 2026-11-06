<!DOCTYPE html><html class="light" lang="en"><head>
<meta charset="utf-8">
<meta content="width=device-width, initial-scale=1.0" name="viewport">
<title>OpenJek - Receipt</title>
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
                        "outline": "#747a60",
                        "on-tertiary-fixed-variant": "#004395",
                        "surface-container-low": "#f3f3f6",
                        "tertiary-container": "#e7ecff",
                        "surface-container-lowest": "#ffffff",
                        "surface-bright": "#f9f9fc",
                        "secondary-fixed-dim": "#c7c5d5",
                        "surface-container": "#edeef1",
                        "secondary-container": "#e3e0f2",
                        "surface-tint": "#4f6600",
                        "secondary": "#5e5d6b",
                        "on-surface": "#1a1c1e",
                        "on-error": "#ffffff",
                        "error": "#ba1a1a",
                        "on-secondary-container": "#646371",
                        "primary-fixed": "#c0f500",
                        "on-surface-variant": "#434933",
                        "tertiary-fixed-dim": "#adc6ff",
                        "outline-variant": "#c4caac",
                        "primary": "#4f6600",
                        "primary-container": "#c8ff00",
                        "surface-variant": "#e2e2e5",
                        "on-error-container": "#93000a",
                        "on-secondary": "#ffffff",
                        "on-primary-container": "#597300",
                        "on-primary": "#ffffff",
                        "on-secondary-fixed-variant": "#464553",
                        "surface": "#f9f9fc",
                        "tertiary-fixed": "#d8e2ff",
                        "on-tertiary-container": "#0466d9",
                        "surface-container-highest": "#e2e2e5",
                        "on-tertiary": "#ffffff",
                        "primary-fixed-dim": "#a8d700",
                        "on-background": "#1a1c1e",
                        "on-primary-fixed": "#161f00",
                        "on-tertiary-fixed": "#001a42",
                        "inverse-surface": "#2f3133",
                        "on-primary-fixed-variant": "#3b4d00",
                        "inverse-on-surface": "#f0f0f3",
                        "background": "#f9f9fc",
                        "secondary-fixed": "#e3e0f2",
                        "inverse-primary": "#a8d700",
                        "error-container": "#ffdad6",
                        "tertiary": "#005ac2",
                        "surface-container-high": "#e8e8eb",
                        "on-secondary-fixed": "#1a1a26",
                        "surface-dim": "#d9dadd"
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
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .text-headline-xl { font-family: 'Inter', sans-serif; font-size: 32px; font-weight: 700; line-height: 40px; letter-spacing: -0.02em; }
        .text-headline-lg { font-family: 'Inter', sans-serif; font-size: 24px; font-weight: 700; line-height: 32px; letter-spacing: -0.01em; }
        .text-headline-md { font-family: 'Inter', sans-serif; font-size: 20px; font-weight: 600; line-height: 28px; }
        .text-body-lg { font-family: 'Inter', sans-serif; font-size: 18px; font-weight: 400; line-height: 26px; }
        .text-body-md { font-family: 'Inter', sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; }
        .text-label-md { font-family: 'Geist', monospace; font-size: 14px; font-weight: 500; line-height: 20px; letter-spacing: 0.02em; }
        .text-label-sm { font-family: 'Geist', monospace; font-size: 12px; font-weight: 600; line-height: 16px; }
    </style>
<style>
    body {
      min-height: max(884px, 100dvh);
    }
  </style>
  </head>
<body class="bg-background text-on-background font-body min-h-screen flex flex-col">
<!-- Top App Bar -->
<header class="w-full sticky top-0 z-50 bg-surface dark:bg-background flex items-center justify-between px-4 h-16 shadow-sm">
<div class="flex items-center gap-4">
<button class="p-2 rounded-full hover:bg-surface-variant transition-colors active:scale-95 duration-100">
<span class="material-symbols-outlined text-primary">arrow_back</span>
</button>
<h1 class="text-headline-md font-bold text-primary dark:text-primary-fixed-dim">Receipt</h1>
</div>
<button class="p-2 rounded-full hover:bg-surface-variant transition-colors active:scale-95 duration-100">
<span class="material-symbols-outlined text-primary">share</span>
</button>
</header>
<!-- Main Content Canvas -->
<main class="flex-grow w-full max-w-2xl mx-auto px-4 py-6 space-y-6">
<!-- Receipt Header Info -->
<div class="text-center space-y-1">
<p class="text-label-md text-secondary uppercase tracking-widest">Order ID: #OJ-123456789</p>
<p class="text-body-md text-on-surface-variant">12 Oct 2023, 14:45</p>
</div>
<!-- Transaction Summary Card -->
<div class="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-surface-variant">
<div class="flex flex-col items-center justify-center space-y-2 mb-6 border-b border-surface-variant pb-6">
<span class="material-symbols-outlined text-4xl text-primary mb-2" style="font-variation-settings: 'FILL' 1;">check_circle</span>
<p class="text-label-md text-secondary">Total Paid</p>
<h2 class="text-headline-xl text-on-surface">Rp 12.500</h2>
<div class="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-container-high rounded-full mt-2">
<span class="material-symbols-outlined text-sm text-primary">account_balance_wallet</span>
<span class="text-label-sm text-on-surface">OpenPay</span>
</div>
</div>
<!-- Fare Breakdown -->
<div class="space-y-4">
<h3 class="text-label-md text-on-surface-variant font-semibold">Fare Breakdown</h3>
<div class="space-y-2">
<div class="flex justify-between items-center text-body-md text-on-surface">
<span>Base Fare</span>
<span class="font-label">Rp 14.000</span>
</div>
<div class="flex justify-between items-center text-body-md text-on-surface">
<span>Service Fee</span>
<span class="font-label">Rp 2.500</span>
</div>
<div class="flex justify-between items-center text-body-md text-error">
<span>Promo Discount</span>
<span class="font-label">-Rp 4.000</span>
</div>
</div>
<div class="pt-4 border-t border-surface-variant flex justify-between items-center text-headline-md text-on-surface">
<span>Total Amount</span>
<span class="font-label">Rp 12.500</span>
</div>
</div>
</div>
<!-- Trip Details -->
<div class="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-surface-variant">
<h3 class="text-label-md text-on-surface-variant font-semibold mb-4">Trip Details</h3>
<div class="relative pl-8 space-y-6 before:absolute before:inset-y-2 before:left-3 before:w-0.5 before:bg-surface-variant">
<!-- Pickup -->
<div class="relative">
<div class="absolute -left-[1.35rem] top-1 w-3 h-3 rounded-full bg-primary ring-4 ring-surface-container-lowest"></div>
<p class="text-label-sm text-secondary mb-0.5">Pickup</p>
<p class="text-body-md text-on-surface">Sudirman Central Business District</p>
</div>
<!-- Drop-off -->
<div class="relative">
<div class="absolute -left-[1.35rem] top-1 w-3 h-3 rounded-none bg-secondary ring-4 ring-surface-container-lowest" style="clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);"></div>
<p class="text-label-sm text-secondary mb-0.5">Drop-off</p>
<p class="text-body-md text-on-surface">Grand Indonesia Mall</p>
</div>
</div>
<div class="mt-6 pt-4 border-t border-surface-variant grid grid-cols-2 gap-4">
<div class="flex items-center gap-2 text-on-surface-variant">
<span class="material-symbols-outlined text-xl">route</span>
<div>
<p class="text-label-sm text-secondary">Distance</p>
<p class="text-label-md text-on-surface">4.2 km</p>
</div>
</div>
<div class="flex items-center gap-2 text-on-surface-variant">
<span class="material-symbols-outlined text-xl">schedule</span>
<div>
<p class="text-label-sm text-secondary">Duration</p>
<p class="text-label-md text-on-surface">18 mins</p>
</div>
</div>
</div>
</div>
<!-- Driver Info -->
<div class="bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-surface-variant flex items-center gap-4">
<img alt="Driver Avatar" class="w-12 h-12 rounded-full object-cover border-2 border-surface-variant" data-alt="A clean, professional headshot of a friendly driver wearing a dark green polo shirt, smiling against a neutral gray background. Soft studio lighting, highly detailed face." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCn-Y4D3cHb5c6dWCVe2-mUii1-WgvZEWN3KquGouaKhmm2A9YEWW5cF2B8JbZ9qQ6_llshxd2Vahz3mNFUCglKa8dTsK9H2NgWjrZxVDDztX3EzJHTYLNINWldgJN74Pg5C_A4j30-5GWB899Et1dABd1mOcwNfCb1v1nCrcjfYG-LQFCNQgc1CaKwm0pXYxRLImaJ1Ny4NbRCC5HWkJxbQLUtymbHl_lD1E3Y4GodVDLm11_Pc1Ip">
<div class="flex-grow">
<p class="text-body-md font-semibold text-on-surface">Budi Santoso</p>
<p class="text-label-sm text-secondary flex items-center gap-1">
<span class="material-symbols-outlined text-sm">two_wheeler</span>
                    Black Honda Vario (B 1234 XYZ)
                </p>
</div>
</div>
<!-- Action Buttons -->
<div class="pt-6 pb-8 space-y-3">
<button class="w-full bg-primary-container text-on-primary-container font-headline-md py-4 rounded-xl shadow-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
<span class="material-symbols-outlined">download</span>
                Download PDF Receipt
            </button>
<button class="w-full bg-transparent border-2 border-outline-variant text-on-surface font-headline-md py-3.5 rounded-xl hover:bg-surface-variant active:scale-[0.98] transition-all flex items-center justify-center gap-2">
<span class="material-symbols-outlined">mail</span>
                Send to Email
            </button>
<div class="text-center mt-6">
<a class="text-label-md text-primary hover:underline underline-offset-4" href="#">Back to Home</a>
</div>
</div>
</main>
</body></html>