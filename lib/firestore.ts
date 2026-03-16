import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { BlogPost, AppEvent, Conference, Interview } from '../types';

// --- Generic helper ---

function subscribeToCollection<T>(name: string, cb: (items: T[]) => void) {
  return onSnapshot(collection(db, name), snap => {
    cb(snap.docs.map(d => d.data() as T));
  });
}

// --- Blog Posts ---

export const subscribeToPosts = (cb: (posts: BlogPost[]) => void) =>
  subscribeToCollection<BlogPost>('posts', cb);

export const savePost = (post: BlogPost) =>
  setDoc(doc(db, 'posts', post.id), post);

export const deletePost = (id: string) =>
  deleteDoc(doc(db, 'posts', id));

// --- Events ---

export const subscribeToEvents = (cb: (events: AppEvent[]) => void) =>
  subscribeToCollection<AppEvent>('events', cb);

export const saveEvent = (event: AppEvent) =>
  setDoc(doc(db, 'events', event.id), event);

export const deleteEvent = (id: string) =>
  deleteDoc(doc(db, 'events', id));

// --- Conferences ---

export const subscribeToConferences = (cb: (conferences: Conference[]) => void) =>
  subscribeToCollection<Conference>('conferences', cb);

export const saveConference = (conference: Conference) =>
  setDoc(doc(db, 'conferences', conference.id), conference);

export const deleteConference = (id: string) =>
  deleteDoc(doc(db, 'conferences', id));

// --- Interviews ---

export const subscribeToInterviews = (cb: (interviews: Interview[]) => void) =>
  subscribeToCollection<Interview>('interviews', cb);

export const saveInterview = (interview: Interview) =>
  setDoc(doc(db, 'interviews', interview.id), interview);

export const deleteInterview = (id: string) =>
  deleteDoc(doc(db, 'interviews', id));

// --- Site Settings (media library, profile image, visitor toggle) ---

export type SiteSettings = {
  mediaLibrary?: string[];
  profileImage?: string;
  showVisitorCount?: boolean;
};

const settingsRef = () => doc(db, 'settings', 'main');

export const subscribeToSettings = (cb: (s: SiteSettings) => void) =>
  onSnapshot(settingsRef(), snap => {
    if (snap.exists()) cb(snap.data() as SiteSettings);
  });

export const saveSettings = (settings: Partial<SiteSettings>) =>
  setDoc(settingsRef(), settings, { merge: true });

// --- Initial seed (runs once when Firestore is empty on first deploy) ---

const DEFAULT_MEDIA = [
  'https://images.unsplash.com/photo-1519682337058-a94d519337bc?q=80&w=2070&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1455390582262-044cdead2708?q=80&w=1973&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=2070&auto=format&fit=crop',
];

const DEFAULT_PROFILE_IMAGE =
  'https://storage.googleapis.com/salondesinconnus/Caroline/Gemini_Generated_Image_8wrovw8wrovw8wro.png';

export async function seedIfEmpty(initialPosts: BlogPost[]) {
  // Seed blog posts
  const postsSnap = await getDocs(collection(db, 'posts'));
  if (postsSnap.empty && initialPosts.length > 0) {
    const batch = writeBatch(db);
    initialPosts.forEach(post => batch.set(doc(db, 'posts', post.id), post));
    await batch.commit();
  }

  // Seed settings doc
  const settingsSnap = await getDoc(settingsRef());
  if (!settingsSnap.exists()) {
    await setDoc(settingsRef(), {
      mediaLibrary: DEFAULT_MEDIA,
      profileImage: DEFAULT_PROFILE_IMAGE,
      showVisitorCount: true,
    });
  }
}
