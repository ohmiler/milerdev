// The founder and the studio photos, shown on Home and on the About page so the two never disagree.

import { FACEBOOK_PAGE_URL } from '@/lib/content/contact';

export const FOUNDER = {
  name: 'ปฏิภาณ เพ็งเภา',
  role: 'ผู้ก่อตั้งและผู้สอน MilerDev',
  // From the public YouTube channel on 2026-10-07: 196K subscribers and 3.7K videos. Rounded down
  // so the claim stays true as the channel grows; recheck the channel before changing the numbers.
  bio: 'สอนเขียนโปรแกรมภาษาไทยผ่านช่อง YouTube MilerDev ที่มีผู้ติดตามกว่า 190,000 คน และวิดีโอกว่า 3,700 คลิป คอร์สใน MilerDev คือการจัดลำดับความรู้เหล่านั้นให้เรียนต่อเนื่องจนสร้างงานได้จริง',
  channelStats: [
    { label: 'ผู้ติดตามบน YouTube', value: '190,000+' },
    { label: 'คลิปสอนบน YouTube', value: '3,700+' },
  ],
  photo: '/showcase/07-showcase-1024x768.webp',
  youtube: 'https://www.youtube.com/@MilerDev',
  facebook: FACEBOOK_PAGE_URL,
} as const;

// Real photos from talks, workshops and the recording studio, each described for what it shows.
export const STUDIO_PHOTOS = [
  {
    src: '/showcase/01-showcase-1024x768.webp',
    alt: 'MilerDev แบ่งปันประสบการณ์ด้านการพัฒนาซอฟต์แวร์บนเวที',
    caption: 'บรรยายบนเวที แบ่งปันประสบการณ์การพัฒนาซอฟต์แวร์',
  },
  {
    src: '/showcase/02-showcase-1024x768.webp',
    alt: 'ผู้เรียนฟังการบรรยายในเวิร์กช็อปการเขียนโปรแกรมของ MilerDev',
    caption: 'เวิร์กช็อปการเขียนโปรแกรมกับผู้เรียน',
  },
  {
    src: '/showcase/09-showcase-1024x768.webp',
    alt: 'เบื้องหลังการถ่ายทำบทเรียนในสตูดิโอ MilerDev',
    caption: 'เบื้องหลังการถ่ายทำบทเรียนในสตูดิโอ',
  },
] as const;
