/**
 * Club facts – the single source of truth for everything that is not
 * translated copy. Values marked "verified" come from the club's own
 * communication (registration e-mails, ASKÖ club directory, ÖH WU course page).
 * Everything left as `null` / empty is unknown and simply not rendered
 * until it is filled in.
 */
import type { ImageMetadata } from 'astro';

export interface Membership {
  id: string;
  /** Same wording as in the club's registration e-mails – this is what gets submitted. */
  label: { de: string; en: string };
  /** Compact text shown in the form's dropdown. */
  short: { de: string; en: string };
  trainingsPerWeek: number;
  priceEur: number;
}

export interface ScheduleSlot {
  day: { de: string; en: string };
  time: string;
  title: { de: string; en: string };
}

export interface Photo {
  src: ImageMetadata;
  alt: { de: string; en: string };
}

export const club = {
  name: 'FightFlow',
  /** verified – account holder / association name */
  legalName: 'Kampfsportverein FightFlow Wien – ASKÖ',
  sport: { de: 'Kickboxen', en: 'Kickboxing' },
  /** verified – ASKÖ WAT Wien club directory */
  phone: '+43 678 7803878',
  phoneHref: 'tel:+436787803878',
  /** verified */
  email: 'fightflow01@gmail.com',
  /** verified – postal code only, the street address is not public yet */
  address: {
    street: null as string | null,
    postalCode: '1020',
    city: 'Wien',
    district: 'Leopoldstadt',
    country: 'AT',
  },
  /** Umbrella organisation (verified) */
  umbrella: { name: 'ASKÖ Wien', url: 'https://www.askoewat.wien/' },
  /** ZVR number for the imprint – not public yet. */
  zvr: null as string | null,
  /** Board member(s) authorised to represent the association – not public yet. */
  representative: null as string | null,
  social: {
    instagram: null as string | null,
    facebook: null as string | null,
  },
};

/** verified – "Basic (1 training per week) - 49€/month" */
export const memberships: Membership[] = [
  {
    id: 'basic',
    label: { de: 'Basic (1 Training pro Woche) – 49 €/Monat', en: 'Basic (1 training per week) - 49€/month' },
    short: { de: 'Basic · 1×/Woche · 49 €', en: 'Basic · 1×/week · €49' },
    trainingsPerWeek: 1,
    priceEur: 49,
  },
];

/**
 * Weekly timetable. Left empty on purpose: the current times are not
 * published anywhere we could verify. Fill in and the timetable renders.
 */
export const schedule: ScheduleSlot[] = [];

export const coach = {
  /** e.g. 'Max Mustermann' – unknown, the section works without it. */
  name: null as string | null,
  /** e.g. ['Weltmeister 2019 (WKF)', …] */
  achievements: [] as { de: string; en: string }[],
  photo: null as Photo | null,
};

/** Photos of the club. Drop files into src/assets/photos and import them here. */
export const photos = {
  hero: null as Photo | null,
  gallery: [] as Photo[],
};

/**
 * Registration backend. Set PUBLIC_FORM_ENDPOINT (e.g. the Google Apps Script
 * web-app URL from /apps-script) at build time. Without it the form falls
 * back to opening a pre-filled e-mail to the club.
 */
export const formEndpoint: string = import.meta.env.PUBLIC_FORM_ENDPOINT ?? '';
