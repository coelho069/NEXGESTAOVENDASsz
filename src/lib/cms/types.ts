export interface CmsPlan {
  name: string;
  subtitle: string;
  price: string;
  unit: string;
  features: string[];
  featured: boolean;
  cta: string;
}

export interface CmsTestimonial {
  name: string;
  role: string;
  text: string;
  photo: string;
}

export interface SiteContent {
  brandName: string;
  footerBlurb: string;
  heroBadge: string;
  heroHeadline: string;
  heroHighlight: string;
  heroBody: string;
  heroCtaPrimary: string;
  heroCtaSecondary: string;
  heroTicker: string;
  painTitle: string;
  painSubtitle: string;
  featuresTitle: string;
  featuresSubtitle: string;
  pricingTitle: string;
  pricingSubtitle: string;
  pricingBadge: string;
  plans: CmsPlan[];
  socialTitle: string;
  socialSubtitle: string;
  storesLabel: string;
  storesCount: number;
  logos: string;
  testimonials: CmsTestimonial[];
  closerKicker: string;
  closerTitle: string;
  closerBody: string;
  closerCta: string;
  logoUrl: string;
}

export const CMS_KEY = "site";
