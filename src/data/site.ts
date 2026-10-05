/**
 * Club facts – the single source of truth for everything that is not
 * translated copy. Taken from the club's current website (www.fightflow.at,
 * imported to content/original/), its registration e-mails and the ASKÖ
 * club directory. Anything left as `null` is unknown and not rendered.
 */
import type { ImageMetadata } from 'astro';
import googleForms from './google-forms.json';

import logo from '../assets/brand/logo-fist.png';
import gymVault from '../assets/photos/gym-vault.jpg';
import gymTrophies from '../assets/photos/gym-trophies.jpg';
import gymRack from '../assets/photos/gym-rack.jpg';
import gymPads from '../assets/photos/gym-pads.jpg';
import gymBagTall from '../assets/photos/gym-bag-tall.jpg';
import trainingKick from '../assets/photos/training-kick.jpg';
import trainingPushups from '../assets/photos/training-pushups.jpg';
import trainingSparring from '../assets/photos/training-sparring.jpg';
import trainingPads from '../assets/photos/training-pads.jpg';
import team from '../assets/photos/team.jpg';

type L10n = { de: string; en: string };

export interface Photo {
  src: ImageMetadata;
  alt: L10n;
  /** CSS object-position for crops, e.g. '50% 30%'. */
  position?: string;
}

export const club = {
  name: 'FightFlow',
  /** Association name (registration e-mails, ASKÖ directory). */
  legalName: 'Kampfsportverein FightFlow Wien – ASKÖ',
  sport: { de: 'Kickboxen', en: 'Kickboxing' },
  phone: '+43 678 7803878',
  phoneHref: 'tel:+436787803878',
  email: 'fightflow01@gmail.com',
  instagram: { handle: '@_fightflow', url: 'https://www.instagram.com/_fightflow/' },
  /** Training location (schedule on fightflow.at). */
  gym: {
    street: 'Haymerlegasse 27',
    door: { de: 'Tür 17', en: 'door 17' },
    postalCode: '1160',
    city: { de: 'Wien', en: 'Vienna' },
    district: 'Ottakring',
    country: 'AT',
    geo: { lat: 48.208, lng: 16.327182 },
  },
  maps: {
    open: 'https://www.google.com/maps/search/?api=1&query=Haymerlegasse+27%2C+1160+Wien',
    directions: 'https://www.google.com/maps/dir/?api=1&destination=Haymerlegasse+27%2C+1160+Wien',
    embed: 'https://maps.google.com/maps?q=48.208,16.327182&z=16&output=embed',
  },
  umbrella: { name: 'ASKÖ Wien', url: 'https://www.askoewat.wien/' },
  /** Imprint data – not public yet. */
  seat: null as string | null,
  zvr: null as string | null,
  representative: null as string | null,
  logo,
};

export interface Price {
  id: 'trial' | 'single' | 'basic' | 'full';
  name: L10n;
  /** EUR; 0 = free */
  price: number;
  monthly: boolean;
  trainingsPerWeek?: number;
  /** Value submitted with the form – wording of the club's own price list / e-mails. */
  formValue?: string;
  featured?: boolean;
}

/** Price list from fightflow.at */
export const prices: Price[] = [
  { id: 'trial', name: { de: 'Probetraining', en: 'Trial training' }, price: 0, monthly: false },
  {
    id: 'single',
    name: { de: 'Einzeltraining', en: 'Single pass' },
    price: 20,
    monthly: false,
    formValue: 'Single Pass - 20€',
  },
  {
    id: 'basic',
    name: { de: 'Basic', en: 'Basic' },
    price: 49,
    monthly: true,
    trainingsPerWeek: 1,
    formValue: 'Basic (1 training per week) - 49€/month',
  },
  {
    id: 'full',
    name: { de: 'Full', en: 'Full' },
    price: 79,
    monthly: true,
    trainingsPerWeek: 3,
    formValue: 'Full (3 trainings per week) - 79€/month',
    featured: true,
  },
];

export interface Session {
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
  day: L10n;
  short: L10n;
  start: string;
  end: string;
}

/** Weekly schedule from fightflow.at – all sessions at the gym address above. */
export const schedule: Session[] = [
  { weekday: 2, day: { de: 'Dienstag', en: 'Tuesday' }, short: { de: 'Di', en: 'Tue' }, start: '18:00', end: '19:30' },
  { weekday: 4, day: { de: 'Donnerstag', en: 'Thursday' }, short: { de: 'Do', en: 'Thu' }, start: '18:00', end: '19:30' },
  { weekday: 0, day: { de: 'Sonntag', en: 'Sunday' }, short: { de: 'So', en: 'Sun' }, start: '14:30', end: '16:00' },
];

export const coach = {
  /** Not published on the current site. */
  name: null as string | null,
};

export const photos = {
  hero: { src: gymVault, alt: { de: 'Das FightFlow-Gym im Ziegelgewölbe', en: 'The FightFlow gym under brick vaults' } },
  coach: {
    src: gymTrophies,
    alt: { de: 'Pokale im Regal des FightFlow-Gyms', en: 'Trophies on the shelf of the FightFlow gym' },
  },
  gym: [
    { src: gymBagTall, alt: { de: 'Schwerer Sandsack und Pratzen unter dem Gewölbe', en: 'Heavy bag and pads under the vault' } },
    { src: gymRack, alt: { de: 'Kraftstation im Gym', en: 'Power rack in the gym' } },
    { src: gymPads, alt: { de: 'Schlagpolster und Kopfschutz an der Ziegelwand', en: 'Strike shields and headgear on the brick wall' } },
    { src: gymVault, alt: { de: 'Trainingsbereich mit Sandsack, Kraftstation und Trainingsplan', en: 'Training area with heavy bag, power rack and workout plan' }, position: '50% 45%' },
  ] satisfies Photo[],
  training: [
    { src: trainingKick, alt: { de: 'Sparring mit Tritt zum Körper', en: 'Sparring with a body kick' }, position: '50% 35%' },
    { src: trainingSparring, alt: { de: 'Boxsparring im Training', en: 'Boxing sparring in training' }, position: '50% 30%' },
    { src: trainingPads, alt: { de: 'Pratzentraining in Zweiergruppen', en: 'Pad work in pairs' }, position: '50% 40%' },
    { src: trainingPushups, alt: { de: 'Liegestütze beim Konditionstraining', en: 'Push-ups during conditioning' }, position: '50% 60%' },
  ] satisfies Photo[],
  team: { src: team, alt: { de: 'Die FightFlow-Trainingsgruppe', en: 'The FightFlow training group' } },
};

/**
 * Where registrations go. Priority:
 *  1. the club's own Google Forms – `npm run forms:sync` fills
 *     src/data/google-forms.json, so the existing sheet + e-mail automation
 *     keeps working untouched,
 *  2. PUBLIC_FORM_ENDPOINT (Apps Script backend in /apps-script),
 *  3. a pre-filled e-mail to the club.
 */
export type FieldKey = 'name' | 'email' | 'phone' | 'membership' | 'month' | 'date' | 'experience' | 'message';

export interface GoogleFormTarget {
  /** https://docs.google.com/forms/d/e/<id>/formResponse */
  action: string;
  /** our field → "entry.123456" (or "emailAddress") */
  fields: Partial<Record<FieldKey, string>>;
  /** our submitted value → the form's exact option text (choice questions) */
  values?: Partial<Record<FieldKey, Record<string, string>>>;
  /** "date" when the form asks for the session as a Google date question */
  dateType?: 'date' | 'text';
}

export const forms = {
  trial: googleForms.trial as GoogleFormTarget | null,
  membership: googleForms.membership as GoogleFormTarget | null,
};

export const formEndpoint: string = import.meta.env.PUBLIC_FORM_ENDPOINT ?? '';
