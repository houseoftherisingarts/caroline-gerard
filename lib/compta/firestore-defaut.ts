import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDoc,
  doc,
  query,
  serverTimestamp,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './firebase-defaut';

/**
 * Subscribe to a Firestore collection. Returns live array with `id` populated from doc.id.
 * Pass query constraints (orderBy, where, limit) as the second arg.
 *
 *   const { data: clients, loading } = useCollection<Client>('clients');
 */
export function useCollection<T extends { id: string }>(
  path: string,
  constraints: QueryConstraint[] = []
) {
  const constraintsKey = useMemo(
    () => constraints.map((c: any) => `${c.type}:${c._field?.toString?.() ?? ''}:${c._direction ?? c._op ?? ''}`).join('|'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(constraints)]
  );

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    const ref = collection(db, path);
    const q = constraints.length > 0 ? query(ref, ...constraints) : ref;
    const unsub = onSnapshot(
      q,
      (snap) => {
        setData(
          snap.docs.map((d) => ({ ...(d.data() as Omit<T, 'id'>), id: d.id })) as T[]
        );
        setLoading(false);
      },
      (err) => {
        setError(err as Error);
        setLoading(false);
      }
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, constraintsKey]);

  return { data, loading, error };
}

/**
 * Subscribe to a single Firestore document.
 *
 *   const { data: settings, loading } = useDocument<Settings>('settings/main');
 */
export function useDocument<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(
      doc(db, path),
      (snap) => {
        setData(snap.exists() ? ((snap.data() as DocumentData) as T) : null);
        setLoading(false);
      },
      (err) => {
        setError(err as Error);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [path]);

  return { data, loading, error };
}

/** Create a new document in a collection. Returns the new ID. Strips client-side `id` if present. */
export async function createDoc<T extends Record<string, any>>(
  path: string,
  data: T,
  opts: { withTimestamp?: boolean } = { withTimestamp: true }
): Promise<string> {
  const { id: _drop, ...rest } = data as any;
  const payload = opts.withTimestamp ? { ...rest, createdAt: serverTimestamp() } : rest;
  const ref = await addDoc(collection(db, path), payload);
  return ref.id;
}

/**
 * Partial update of a document.
 * Accepts either `(collection, id, data)` or `(fullPath, data)`.
 */
export function patchDoc<T extends Record<string, any>>(
  collectionPath: string,
  id: string,
  data: Partial<T>
): Promise<void>;
export function patchDoc<T extends Record<string, any>>(
  fullPath: string,
  data: Partial<T>
): Promise<void>;
export async function patchDoc<T extends Record<string, any>>(
  a: string,
  b: any,
  c?: any
): Promise<void> {
  const isThreeArg = c !== undefined;
  const path = isThreeArg ? `${a}/${b}` : a;
  const data = isThreeArg ? c : b;
  const { id: _drop, ...rest } = data as any;
  await updateDoc(doc(db, path), rest);
}

/**
 * Full overwrite (or create) of a document at a known path.
 * Accepts either `(collection, id, data, opts?)` or `(fullPath, data, opts?)`.
 */
export function writeDoc<T extends Record<string, any>>(
  collectionPath: string,
  id: string,
  data: T,
  opts?: { merge?: boolean }
): Promise<void>;
export function writeDoc<T extends Record<string, any>>(
  fullPath: string,
  data: T,
  opts?: { merge?: boolean }
): Promise<void>;
export async function writeDoc<T extends Record<string, any>>(
  a: string,
  b: any,
  c?: any,
  d?: any
): Promise<void> {
  // Detect: if `b` is a string, it's the id (4-arg form). Otherwise b is the data (3-arg form).
  const isFourArg = typeof b === 'string';
  const path = isFourArg ? `${a}/${b}` : a;
  const data = isFourArg ? c : b;
  const opts = (isFourArg ? d : c) ?? {};
  const { id: _drop, ...rest } = data as any;
  await setDoc(doc(db, path), rest, { merge: !!opts.merge });
}

/**
 * Delete a document.
 * Accepts either `(collection, id)` or `(fullPath)`.
 */
export function removeDoc(collectionPath: string, id: string): Promise<void>;
export function removeDoc(fullPath: string): Promise<void>;
export async function removeDoc(a: string, b?: string): Promise<void> {
  const path = b !== undefined ? `${a}/${b}` : a;
  await deleteDoc(doc(db, path));
}

/** One-shot read of a document. */
export async function readDoc<T>(path: string): Promise<T | null> {
  const snap = await getDoc(doc(db, path));
  return snap.exists() ? ((snap.data() as DocumentData) as T) : null;
}

// --- Storage helpers ---

/** Upload a File to Storage and return its download URL + storage path. */
export async function uploadFile(
  storagePath: string,
  file: File
): Promise<{ url: string; path: string }> {
  const r = storageRef(storage, storagePath);
  await uploadBytes(r, file);
  const url = await getDownloadURL(r);
  return { url, path: storagePath };
}

/** Delete a Storage object by its path. */
export async function deleteFile(storagePath: string): Promise<void> {
  await deleteObject(storageRef(storage, storagePath));
}

/** Generate a unique storage path. */
export function makeStoragePath(folder: string, originalName: string): string {
  const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${folder}/${Date.now()}_${safe}`;
}
