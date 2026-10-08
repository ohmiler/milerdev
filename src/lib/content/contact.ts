// How to reach MilerDev: the contact page and the footer read these, so they never disagree.

export const CONTACT_EMAIL = 'milerdev.official@gmail.com';
export const FACEBOOK_PAGE_URL = 'https://www.facebook.com/milerdevpro';

// A promise to the reader, set by the owner on 2026-10-08. Change it only when the real reply time changes.
export const CONTACT_RESPONSE_TIME = 'ภายใน 1 วันทำการ';

/**
 * What a message is about. The chosen label is sent as the message subject, which the contact API
 * accepts at 2 to 200 characters.
 */
export const CONTACT_TOPICS = [
  'คอร์สและการเรียน',
  'การชำระเงิน',
  'งานวิทยากรและความร่วมมือ',
  'อื่น ๆ',
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number];
