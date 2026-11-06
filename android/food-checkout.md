<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8">
<meta content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" name="viewport">
<title>Checkout - OpenFood</title>
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
                        "tertiary-fixed-dim": "#adc6ff", "inverse-primary": "#a8d700", "outline": "#747a60", "on-surface": "#1a1c1e",
                        "surface-container-lowest": "#ffffff", "tertiary-container": "#e7ecff", "inverse-surface": "#2f3133", "on-tertiary-container": "#0466d9",
                        "on-surface-variant": "#434933", "tertiary-fixed": "#d8e2ff", "secondary-fixed": "#e3e0f2", "on-primary-container": "#597300",
                        "surface-container": "#edeef1", "on-error-container": "#93000a", "on-secondary-container": "#646371", "tertiary": "#005ac2",
                        "on-background": "#1a1c1e", "background": "#f9f9fc", "error": "#ba1a1a", "primary-container": "#c8ff00",
                        "secondary": "#5e5d6b", "surface-bright": "#f9f9fc", "error-container": "#ffdad6", "surface-container-high": "#e8e8eb",
                        "surface": "#f9f9fc", "on-secondary": "#ffffff", "on-error": "#ffffff", "inverse-on-surface": "#f0f0f3",
                        "secondary-container": "#e3e0f2", "surface-container-low": "#f3f3f6", "surface-container-highest": "#e2e2e5", "on-primary-fixed-variant": "#3b4d00",
                        "on-tertiary": "#ffffff", "on-tertiary-fixed": "#001a42", "on-primary": "#ffffff", "surface-dim": "#d9dadd",
                        "primary-fixed-dim": "#a8d700", "on-secondary-fixed": "#1a1a26", "outline-variant": "#c4caac", "primary": "#4f6600",
                        "secondary-fixed-dim": "#c7c5d5", "on-secondary-fixed-variant": "#464553", "on-tertiary-fixed-variant": "#004395", "surface-tint": "#4f6600",
                        "primary-fixed": "#c0f500", "on-primary-fixed": "#161f00", "surface-variant": "#e2e2e5"
                    },
                    borderRadius: { "DEFAULT": "0.25rem", "lg": "0.5rem", "xl": "0.75rem", "full": "9999px" },
                    spacing: { "base": "4px", "xs": "8px", "sm": "12px", "md": "16px", "lg": "24px", "xl": "32px", "edge-margin": "16px", "gutter": "12px" },
                    fontFamily: { "headline": ["Inter"], "display": ["Inter"], "body": ["Inter"], "label": ["Geist"] },
                    fontSize: {
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
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
        .icon-filled { font-variation-settings: 'FILL' 1; }
        /* Safe area utilities */
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 16px); }
    </style>
</head>
<body class="bg-background text-on-surface font-body antialiased pb-[120px]">
<!-- Top App Bar (Transactional variant) -->
<header class="sticky top-0 z-50 bg-surface-container-lowest h-16 flex items-center px-edge-margin justify-between border-b border-surface-variant">
<button aria-label="Go back" class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors -ml-2 text-on-surface">
<span class="material-symbols-outlined">arrow_back</span>
</button>
<h1 class="font-headline text-headline-md font-bold absolute left-1/2 -translate-x-1/2">Checkout</h1>
<div class="w-10"></div> <!-- Spacer for centering -->
</header>
<main class="p-edge-margin space-y-gutter">
<!-- Delivery Address Card -->
<section class="bg-surface-container-lowest border border-surface-variant rounded-xl p-md">
<div class="flex items-start justify-between">
<div class="flex gap-sm">
<span class="material-symbols-outlined icon-filled text-primary mt-1">location_on</span>
<div>
<h2 class="font-headline text-[15px] font-semibold mb-1">Delivery Address</h2>
<p class="text-body-md font-bold">Home</p>
<p class="text-label-md text-on-surface-variant mt-1 leading-snug">Jl. Sudirman No. 45, Tower B, Apt 1205<br>Jakarta Selatan</p>
<div class="mt-2 inline-flex items-center gap-1 bg-surface-container-low px-2 py-1 rounded-sm border border-surface-variant">
<span class="material-symbols-outlined text-[16px] text-on-surface-variant">edit_note</span>
<span class="text-label-sm text-on-surface-variant">Note: Leave at lobby</span>
</div>
</div>
</div>
<button class="text-label-md text-primary font-semibold py-1 px-2 hover:bg-surface-container rounded transition-colors">Edit</button>
</div>
</section>
<!-- Order Summary Card -->
<section class="bg-surface-container-lowest border border-surface-variant rounded-xl p-md">
<div class="flex items-center gap-2 mb-4 pb-3 border-b border-surface-variant">
<span class="material-symbols-outlined text-on-surface-variant">storefront</span>
<h2 class="font-headline text-[16px] font-bold">Burger Broz</h2>
</div>
<div class="space-y-4">
<!-- Item 1 -->
<div class="flex items-start justify-between gap-3">
<div class="w-6 text-label-md font-bold text-on-surface-variant mt-1">1x</div>
<img class="w-16 h-16 rounded-lg object-cover border border-surface-variant bg-surface-container" data-alt="A mouth-watering double smash burger with melted american cheese, crispy edges, fresh lettuce, and signature sauce on a toasted brioche bun, highly detailed food photography, bright even lighting, set against a clean modern background." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDG0hx9yyOpifEim3tfiG5ahyKbE2P7CoHcRgXHShN94RnTSWNMD2wFoMEFKEAHAnFKL4ZTiI5-wXvJI0Eb-y7BaYdcAtW5yQzz-vi4ZacThGJ_CFOcI8gCyYMgIqZfCvN0Ciwaa6Ud-zQJJgWbcVq3wcCDrO7oVFW8kQqPCxEOxrrmbNdMg_l-7FKcV_BQ3NQAyYWPI5RUE4uOx_cDdcZF7XdnOrHhrz0_VyCFE30mFZ5Hjdm1ZkUj">
<div class="flex-1">
<p class="text-body-md font-semibold">Double Smash Burger</p>
<p class="text-label-sm text-on-surface-variant mt-1">No onions, extra pickles</p>
</div>
<div class="text-right">
<p class="font-label text-label-md font-semibold">Rp 75.000</p>
</div>
</div>
<!-- Item 2 -->
<div class="flex items-start justify-between gap-3">
<div class="w-6 text-label-md font-bold text-on-surface-variant mt-1">1x</div>
<img class="w-16 h-16 rounded-lg object-cover border border-surface-variant bg-surface-container" data-alt="A generous portion of crispy golden french fries tossed in truffle oil and parmesan cheese, served in a modern minimalist paper boat, high contrast food photography, appetizing lighting." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAyovjWukQquISAH5B3Pbd6ugiCH7Fui7oGLne37Xg5gbdfchti-C9BDyyR7YV1sTzdlw1IOOhkVGb3SudpdPiux0CrIZ49lgtcIA110OKJbNaQKW-S-yd8XWYeeAYoeir-c-sz8XCFOH-b0vpPX-KHMN2WPwwvVX33xmF9CvdYOP_6hyJkvgQYyPv-nayIIdIRjLYDvlN_6Xlj0tDqGGNflYnxklo0QUIIJmvxVGIMQYS6eb84NBxx">
<div class="flex-1">
<p class="text-body-md font-semibold">Truffle Fries</p>
<p class="text-label-sm text-on-surface-variant mt-1">Large size</p>
</div>
<div class="text-right">
<p class="font-label text-label-md font-semibold">Rp 45.000</p>
</div>
</div>
</div>
<button class="w-full mt-4 py-3 border border-outline-variant rounded-lg text-label-md font-semibold flex items-center justify-center gap-2 hover:bg-surface-container transition-colors">
<span class="material-symbols-outlined text-[20px]">add_circle</span>
                Add More Items
            </button>
</section>
<!-- Promo Section -->
<section class="bg-surface-container-lowest border border-surface-variant rounded-xl p-md flex items-center justify-between cursor-pointer hover:bg-surface-container-low transition-colors">
<div class="flex items-center gap-3">
<span class="material-symbols-outlined text-error">local_offer</span>
<span class="text-body-md font-semibold">Use Promo Code</span>
</div>
<div class="flex items-center gap-2">
<span class="text-label-md text-on-surface-variant">1 Available</span>
<span class="material-symbols-outlined text-on-surface-variant">chevron_right</span>
</div>
</section>
<!-- Payment Method -->
<section class="bg-surface-container-lowest border border-surface-variant rounded-xl p-md">
<div class="flex items-center justify-between">
<div class="flex items-center gap-3">
<div class="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center">
<span class="material-symbols-outlined icon-filled text-on-surface text-[20px]">account_balance_wallet</span>
</div>
<div>
<p class="text-label-sm text-on-surface-variant">Payment Method</p>
<p class="text-body-md font-bold">OpenPay</p>
<p class="font-label text-label-sm text-primary font-semibold">Balance: Rp 250.000</p>
</div>
</div>
<button class="text-label-md text-on-surface font-semibold py-1 px-2 border border-outline-variant rounded hover:bg-surface-container transition-colors">Change</button>
</div>
</section>
<!-- Price Breakdown -->
<section class="bg-surface-container-lowest border border-surface-variant rounded-xl p-md">
<h3 class="text-body-md font-semibold mb-3">Payment Summary</h3>
<div class="space-y-2 text-label-md text-on-surface-variant">
<div class="flex justify-between">
<span>Subtotal (2 items)</span>
<span class="font-label text-on-surface">Rp 120.000</span>
</div>
<div class="flex justify-between">
<span>Delivery Fee</span>
<span class="font-label text-on-surface">Rp 15.000</span>
</div>
<div class="flex justify-between">
<span>Service Fee</span>
<span class="font-label text-on-surface">Rp 3.000</span>
</div>
</div>
<div class="border-t border-surface-variant my-3 pt-3 flex justify-between items-center">
<span class="text-body-md font-bold">Total Payment</span>
<span class="font-label text-headline-md font-bold text-on-surface">Rp 138.000</span>
</div>
</section>
</main>
<!-- Fixed Bottom Action Bar -->
<div class="fixed bottom-0 w-full bg-surface-container-lowest border-t border-surface-variant p-edge-margin pb-safe z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
<div class="flex items-center justify-between mb-3">
<div class="flex flex-col">
<span class="text-label-sm text-on-surface-variant">Total</span>
<span class="font-label text-headline-md font-bold">Rp 138.000</span>
</div>
<div class="flex flex-col items-end">
<span class="text-label-sm text-on-surface-variant flex items-center gap-1">
<span class="material-symbols-outlined text-[14px]">account_balance_wallet</span> OpenPay
                </span>
</div>
</div>
<button class="w-full bg-primary-container text-on-surface font-headline font-bold text-[16px] py-4 rounded-xl flex justify-center items-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all">
            Pesan Sekarang
        </button>
</div>
</body></html>