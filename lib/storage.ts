import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

export async function uploadMediaFile(file: File): Promise<string> {
  const filename = `${Date.now()}_${file.name.replace(/[^\w.-]/g, '_')}`;
  const storageRef = ref(storage, `media/${filename}`);
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
}
