<!DOCTYPE html>

<html class="light" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Ride Completed - OpenJek</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&amp;family=Geist:wght@500;600&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "surface-dim": "#d9dadd",
                        "on-error": "#ffffff",
                        "tertiary": "#005ac2",
                        "secondary-fixed-dim": "#c7c5d5",
                        "outline-variant": "#c4caac",
                        "on-secondary-fixed": "#1a1a26",
                        "on-primary-fixed-variant": "#3b4d00",
                        "primary-fixed-dim": "#a8d700",
                        "surface-tint": "#4f6600",
                        "inverse-surface": "#2f3133",
                        "on-surface-variant": "#434933",
                        "tertiary-container": "#e7ecff",
                        "surface-container": "#edeef1",
                        "on-background": "#1a1c1e",
                        "surface-variant": "#e2e2e5",
                        "on-primary-container": "#597300",
                        "secondary-container": "#e3e0f2",
                        "primary-container": "#c8ff00",
                        "surface-container-highest": "#e2e2e5",
                        "on-error-container": "#93000a",
                        "secondary-fixed": "#e3e0f2",
                        "error-container": "#ffdad6",
                        "on-tertiary-fixed-variant": "#004395",
                        "on-tertiary-container": "#0466d9",
                        "surface-bright": "#f9f9fc",
                        "inverse-on-surface": "#f0f0f3",
                        "on-tertiary-fixed": "#001a42",
                        "on-primary": "#ffffff",
                        "surface-container-lowest": "#ffffff",
                        "on-secondary-container": "#646371",
                        "inverse-primary": "#a8d700",
                        "tertiary-fixed": "#d8e2ff",
                        "background": "#f9f9fc",
                        "surface-container-low": "#f3f3f6",
                        "error": "#ba1a1a",
                        "primary": "#4f6600",
                        "tertiary-fixed-dim": "#adc6ff",
                        "on-secondary": "#ffffff",
                        "secondary": "#5e5d6b",
                        "on-surface": "#1a1c1e",
                        "on-secondary-fixed-variant": "#464553",
                        "primary-fixed": "#c0f500",
                        "surface-container-high": "#e8e8eb",
                        "surface": "#f9f9fc",
                        "on-tertiary": "#ffffff",
                        "outline": "#747a60",
                        "on-primary-fixed": "#161f00"
                    },
                    "borderRadius": {
                        "DEFAULT": "0.5rem",
                        "sm": "0.25rem",
                        "md": "0.75rem",
                        "lg": "1rem",
                        "xl": "1.5rem",
                        "full": "9999px"
                    },
                    "fontFamily": {
                        "headline": ["Inter"],
                        "body": ["Inter"],
                        "label": ["Geist"]
                    },
                    "spacing": {
                        "base": "4px",
                        "xs": "8px",
                        "sm": "12px",
                        "md": "16px",
                        "lg": "24px",
                        "xl": "32px",
                        "edge-margin": "16px",
                        "gutter": "12px"
                    }
                }
            }
        }
    </script>
<style>
        body { font-family: 'Inter', sans-serif; }
        .font-label { font-family: 'Geist', monospace; }
        .rating-star:hover ~ .rating-star,
        .rating-star:hover {
            color: #c8ff00;
            font-variation-settings: 'FILL' 1;
        }
        .rating-star.selected {
            color: #c8ff00;
            font-variation-settings: 'FILL' 1;
        }
    </style>
</head>
<body class="bg-surface text-on-surface antialiased pb-24 min-h-screen flex flex-col">
<!-- Top App Bar - No Nav / Transactional -->
<header class="bg-surface dark:bg-on-surface-variant w-full top-0 sticky z-50 flex items-center justify-between px-edge-margin h-14 max-w-screen-xl mx-auto flat no shadows">
<button aria-label="Back" class="p-2 -ml-2 rounded-full hover:bg-surface-container-high transition-colors active:scale-95 text-primary dark:text-primary-fixed-dim">
<span class="material-symbols-outlined text-xl">arrow_back</span>
</button>
<h1 class="font-headline-md text-[20px] leading-[28px] font-bold text-on-surface dark:text-inverse-on-surface">Ride Summary</h1>
<div class="w-10"></div> <!-- Spacer for centering -->
</header>
<main class="flex-grow flex flex-col items-center px-edge-margin pt-lg pb-xl max-w-screen-md mx-auto w-full gap-lg">
<!-- Success Header -->
<section class="w-full flex flex-col items-center text-center space-y-sm">
<div class="w-16 h-16 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center mb-2 shadow-sm">
<span class="material-symbols-outlined text-[32px]" style="font-variation-settings: 'FILL' 1;">check_circle</span>
</div>
<h2 class="text-[24px] leading-[32px] font-bold text-on-surface tracking-tight">You have arrived at your destination</h2>
<p class="text-[16px] leading-[24px] text-secondary">Hope you enjoyed the ride with OpenJek.</p>
</section>
<!-- Trip Details Card (Bento Style) -->
<section class="w-full bg-surface-container-lowest border border-surface-variant rounded-lg p-md shadow-sm space-y-md">
<div class="flex justify-between items-end border-b border-surface-variant pb-md">
<div>
<p class="text-[14px] text-secondary font-medium mb-1">Total Fare</p>
<h3 class="text-[32px] leading-[40px] font-bold text-on-surface tracking-tight font-label">Rp 13.000</h3>
</div>
<div class="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-full">
<span class="material-symbols-outlined text-primary text-sm" style="font-variation-settings: 'FILL' 1;">wallet</span>
<span class="text-[14px] font-semibold text-on-surface">OpenPay</span>
</div>
</div>
<div class="grid grid-cols-2 gap-md">
<div>
<p class="text-[12px] text-secondary font-medium mb-1 uppercase tracking-wider">Distance</p>
<p class="text-[16px] font-semibold text-on-surface font-label">4.2 km</p>
</div>
<div>
<p class="text-[12px] text-secondary font-medium mb-1 uppercase tracking-wider">Duration</p>
<p class="text-[16px] font-semibold text-on-surface font-label">18 mins</p>
</div>
</div>
</section>
<!-- Rate Driver Section -->
<section class="w-full bg-surface-container-lowest border border-surface-variant rounded-lg p-md shadow-sm space-y-md">
<h3 class="text-[20px] font-bold text-on-surface border-b border-surface-variant pb-sm">Rate your Driver</h3>
<div class="flex items-center gap-md pt-sm">
<div class="relative">
<img class="w-16 h-16 rounded-full object-cover border-2 border-surface-variant" data-alt="A professional headshot of a friendly Indonesian male driver wearing a standard uniform jacket, smiling warmly against a bright, neutral light-mode background. The lighting is clean and crisp, projecting reliability and approachability." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCAts4L0WuOqG2AWqCLzgbcmZ5g5QBo8dOmmu-0FVsiKgTrh8ps9YE5fxJK0XFFrTxwRhyt3UO5QI_YuBfhg2COn69F7tskJUEwvQ4iZ0ETyfuinIOcrj9ZXNJdmqOPHbIioLPKsEfXaFTmUKiz1P62hkZ98-23s4J0KKHR0Ke91ebbKA-6dKzgCQa6ZVvGM3FIMsupuAEIhg2x0gsiToDo74Xg-JfstUdgHG6TDmOQM3dG1EWbAr7Z"/>
<div class="absolute -bottom-1 -right-1 bg-surface-container-lowest rounded-full p-1 border border-surface-variant">
<span class="material-symbols-outlined text-primary text-[14px]" style="font-variation-settings: 'FILL' 1;">verified</span>
</div>
</div>
<div>
<h4 class="text-[18px] font-bold text-on-surface">Budi Santoso</h4>
<p class="text-[14px] text-secondary font-medium">Black Honda Vario • B 1234 XYZ</p>
</div>
</div>
<div class="flex justify-center gap-xs py-sm">
<button aria-label="Rate 1 star" class="rating-star text-surface-variant hover:text-primary-container transition-colors p-1"><span class="material-symbols-outlined text-[40px]">star</span></button>
<button aria-label="Rate 2 stars" class="rating-star text-surface-variant hover:text-primary-container transition-colors p-1"><span class="material-symbols-outlined text-[40px]">star</span></button>
<button aria-label="Rate 3 stars" class="rating-star text-surface-variant hover:text-primary-container transition-colors p-1"><span class="material-symbols-outlined text-[40px]">star</span></button>
<button aria-label="Rate 4 stars" class="rating-star text-surface-variant hover:text-primary-container transition-colors p-1"><span class="material-symbols-outlined text-[40px]">star</span></button>
<button aria-label="Rate 5 stars" class="rating-star text-surface-variant hover:text-primary-container transition-colors p-1"><span class="material-symbols-outlined text-[40px]">star</span></button>
</div>
<div class="space-y-sm">
<p class="text-[14px] font-medium text-on-surface">Quick Feedback</p>
<div class="flex flex-wrap gap-2">
<button class="px-4 py-2 rounded-full border border-outline-variant text-[14px] text-on-surface-variant hover:bg-surface-container-low hover:border-outline transition-colors active:scale-95">Friendly</button>
<button class="px-4 py-2 rounded-full border border-outline-variant text-[14px] text-on-surface-variant hover:bg-surface-container-low hover:border-outline transition-colors active:scale-95">Safe Driving</button>
<button class="px-4 py-2 rounded-full border border-outline-variant text-[14px] text-on-surface-variant hover:bg-surface-container-low hover:border-outline transition-colors active:scale-95">Clean Vehicle</button>
<button class="px-4 py-2 rounded-full border border-outline-variant text-[14px] text-on-surface-variant hover:bg-surface-container-low hover:border-outline transition-colors active:scale-95">Great Music</button>
</div>
</div>
<div class="space-y-sm">
<label class="text-[14px] font-medium text-on-surface block" for="comment">Additional Comments (Optional)</label>
<textarea class="w-full rounded-md border-surface-variant bg-surface-bright text-on-surface placeholder:text-secondary focus:border-on-surface focus:ring-0 p-sm text-[16px] resize-none" id="comment" placeholder="Leave a note for Budi..." rows="3"></textarea>
</div>
</section>
</main>
<!-- Fixed Bottom Action -->
<div class="fixed bottom-0 left-0 w-full bg-surface-container-lowest p-edge-margin border-t border-surface-variant shadow-[0px_-4px_20px_0px_rgba(0,0,0,0.05)] z-50">
<button class="w-full bg-primary-container text-on-secondary-fixed font-bold text-[18px] py-4 rounded-lg active:scale-[0.98] transition-transform flex justify-center items-center gap-2 shadow-sm">
            Submit Rating
        </button>
</div>
<script>
        // Simple star rating interaction
        const stars = document.querySelectorAll('.rating-star');
        let currentRating = 0;

        stars.forEach((star, index) => {
            star.addEventListener('click', () => {
                currentRating = index + 1;
                updateStars(currentRating);
            });
        });

        function updateStars(rating) {
            stars.forEach((s, i) => {
                if (i < rating) {
                    s.classList.add('selected');
                    s.classList.replace('text-surface-variant', 'text-primary-container');
                    s.querySelector('span').style.fontVariationSettings = "'FILL' 1";
                } else {
                    s.classList.remove('selected');
                    s.classList.replace('text-primary-container', 'text-surface-variant');
                    s.querySelector('span').style.fontVariationSettings = "'FILL' 0";
                }
            });
        }
        
        // Quick feedback chips interaction
        const chips = document.querySelectorAll('button.rounded-full');
        chips.forEach(chip => {
            chip.addEventListener('click', function() {
                if(this.parentElement.classList.contains('flex-wrap')) {
                    this.classList.toggle('bg-primary-container');
                    this.classList.toggle('border-primary-container');
                    this.classList.toggle('text-on-secondary-fixed');
                    this.classList.toggle('text-on-surface-variant');
                    this.classList.toggle('border-outline-variant');
                }
            });
        });
    </script>
</body></html>