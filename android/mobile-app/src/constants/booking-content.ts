/**
 * Static content for the booking flow, transcribed from the Stitch design.
 * Replace the map still with a real map view once a maps SDK is wired up.
 */

/** The confirm screen's map backdrop, served from the Stitch design asset host. */
export const MapBackdrop = {
  uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB414mL_gQftqOMdL9D88y_mAEicxHVEIWey-dj408WJZpm7fiWQFxkJ2iBUTlyoATUWv3B_mC8Tyq3jFoB2BQbgpxPMpLatIJG0MKWhng-lbvQffXE_oWaUhpUG2DmvSiq-60zsf87W8JELcyOBmuC1nOGspfUy73_aS71SGY0NnblZXLW46ez-iEClE8nHEY2e-yL7PKgrqhG-PlK0pJJQOzsbV4RSwDl5C-GzDXeY2S4CbZyJohy1JAS4qjI_p5ay2Iow8OWd7nQ',
  alt: 'Peta rute perjalanan di Jakarta Pusat',
} as const;

export const BookingCopy = {
  pickupLabel: 'Jemput',
  pickupPlaceholder: 'Lokasi jemput',
  destinationLabel: 'Tujuan',
  destinationPlaceholder: 'Mau kemana?',
  savedPlaces: 'Alamat tersimpan',
  paymentLabel: 'Metode pembayaran',
  paymentPlaceholder: 'Pilih metode pembayaran',
  promoPlaceholder: 'Masukkan kode promo',
  promoAction: 'Pakai',
  fareTitle: 'Rincian Pembayaran',
  tripFare: 'Tarif perjalanan',
  serviceFee: 'Biaya layanan',
  discount: 'Potongan promo',
  total: 'Total dibayar',
  disclaimer: 'Estimasi tarif, dapat berubah menyesuaikan rute final.',
  confirm: 'Cari Driver',
  distance: 'Jarak Perjalanan',
  pricePerKm: 'Harga per km',
  searchingHeader: 'Mencari driver Anda…',
  searchingSubtext: 'Menghubungkan ke mitra terdekat',
  cancelRequest: 'Batalkan Pencarian',
  trackingHeader: 'Driver is on the way',
  trackingEtaPrefix: 'Arriving in',
  trackingEtaSuffix: 'mins',
  paymentMethodLabel: 'Payment Method',
  arrivedTitle: 'You have arrived at your destination',
  arrivedSubtitle: 'Hope you enjoyed the ride with UmfaGo.',
  totalFareLabel: 'Total Fare',
  distanceLabel: 'Distance',
  durationLabel: 'Duration',
  durationUnit: 'mins',
  rateTitle: 'Rate your Driver',
  quickFeedback: 'Quick Feedback',
  commentsLabel: 'Additional Comments (Optional)',
  commentsPlaceholder: 'Leave a note for Budi...',
  submitRating: 'Submit Rating',
  rideSummaryTitle: 'Ride Summary',
  feedbackTags: [
    'Friendly',
    'Safe Driving',
    'Clean Vehicle',
    'Great Music',
  ],
} as const;
