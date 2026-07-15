export interface FeaturedPromoItem {
  pkid: number;
  scheduleOn: string;
  trainingCenterPkid: number;
  slot: number;
  promotionPkid: number;
  topic: string;
  description: string;
  // JOIN-resolved FK labels
  promoCode: string;
}

export interface FeaturedPromoItemRequest {
  pkid: number;
  scheduleOn: string;
  trainingCenterPkid: number;
  slot: number;
  promotionPkid: number;
  topic: string;
  description: string;
}

export interface FeaturedPromoItemQuery {
  scheduleOnFrom?: string | null;
  scheduleOnTo?: string | null;
  trainingCenterPkid?: number | null;
}

export interface TrainingCenterLookup {
  pkid: number;
  name: string;
}

export interface PromotionLookup {
  pkid: number;
  promoCode: string;
  topic: string;
  description: string;
}
