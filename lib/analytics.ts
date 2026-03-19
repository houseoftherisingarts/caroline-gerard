import { logEvent } from 'firebase/analytics';
import { analytics } from '../firebase';

export const trackPageView = (page: string) =>
  logEvent(analytics, 'page_view', { page_title: page });

export const trackAddToCart = (name: string, price: number) =>
  logEvent(analytics, 'add_to_cart', {
    currency: 'CAD',
    value: price,
    items: [{ item_name: name, price }],
  });

export const trackBeginCheckout = (value: number) =>
  logEvent(analytics, 'begin_checkout', { currency: 'CAD', value });

export const trackLead = (source: string) =>
  logEvent(analytics, 'generate_lead', { source });

export const trackBlogView = (title: string) =>
  logEvent(analytics, 'select_content', { content_type: 'blog_post', item_id: title });

export const trackEventView = (title: string) =>
  logEvent(analytics, 'select_content', { content_type: 'event', item_id: title });

export const trackConferenceBooking = (title: string) =>
  logEvent(analytics, 'select_content', { content_type: 'conference_booking', item_id: title });
