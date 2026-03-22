import { logEvent } from 'firebase/analytics';
import { analytics } from '../firebase';

// Only fire analytics events if the visitor has explicitly accepted cookies (Loi 25)
const hasConsent = () => {
  try { return localStorage.getItem('_cg_consent') === 'accepted'; } catch { return false; }
};

const track = (event: string, params?: Record<string, unknown>) => {
  if (!hasConsent()) return;
  logEvent(analytics, event, params);
};

export const trackPageView = (page: string) =>
  track('page_view', { page_title: page });

export const trackAddToCart = (name: string, price: number) =>
  track('add_to_cart', { currency: 'CAD', value: price, items: [{ item_name: name, price }] });

export const trackBeginCheckout = (value: number) =>
  track('begin_checkout', { currency: 'CAD', value });

export const trackLead = (source: string) =>
  track('generate_lead', { source });

export const trackBlogView = (title: string) =>
  track('select_content', { content_type: 'blog_post', item_id: title });

export const trackEventView = (title: string) =>
  track('select_content', { content_type: 'event', item_id: title });

export const trackConferenceBooking = (title: string) =>
  track('select_content', { content_type: 'conference_booking', item_id: title });
