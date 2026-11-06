export const PromoImages = {
  ride: require('@/assets/images/promos/promo-ride.webp'),
  car: require('@/assets/images/promos/promo-car.webp'),
  food: require('@/assets/images/promos/promo-food.webp'),
  send: require('@/assets/images/promos/promo-send.webp'),
  ppob: require('@/assets/images/promos/promo-ppob.webp'),
  weekend: require('@/assets/images/promos/promo-weekend.webp'),
} as const;

export type PromoImageKey = keyof typeof PromoImages;

