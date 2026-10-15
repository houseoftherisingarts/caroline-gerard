// Lecture d'une copie Facebook (« Télécharger vos informations », format JSON) pour en tirer
// les publications de Caroline : texte, date, photos et lien. Facebook change le nom et la
// forme de ses fichiers d'une année à l'autre (posts/your_posts.json avec une clé
// status_updates, puis posts/your_posts_1.json en tableau nu, puis
// your_facebook_activity/posts/…), alors on cherche des publications dans tout fichier JSON
// du dossier sans dépendre d'un chemin précis.

export type PublicationFacebook = {
  /** « facebook:<horodatage> », le garde-fou contre un deuxième import de la même publication. */
  id: string;
  /** AAAA-MM-JJ, à la date locale. */
  date: string;
  texte: string;
  /** Les photos trouvées dans le dossier, dans l'ordre de la publication. */
  photos: File[];
  /** Photos nommées par Facebook mais absentes du dossier (copie partielle, vidéo non comprise). */
  manquantes: number;
  /** Un lien partagé avec la publication, s'il y en a un. */
  lien?: string;
};

/** Facebook écrit les accents en octets UTF-8 lus comme du latin-1 (« Ã© » pour « é »). */
export const decoderTexte = (s: string): string => {
  if (!/[\u0080-ÿ]/.test(s) || /[Ā-￿]/.test(s)) return s;
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(s, c => c.charCodeAt(0)));
  } catch {
    return s;
  }
};

type Brut = Record<string, unknown>;
const estObjet = (v: unknown): v is Brut => !!v && typeof v === 'object' && !Array.isArray(v);
const estPublication = (v: unknown): v is Brut =>
  estObjet(v) && typeof v.timestamp === 'number' && (Array.isArray(v.data) || Array.isArray(v.attachments));

/** Trouve toutes les publications d'un JSON, où qu'elles soient nichées. */
const cueillir = (v: unknown, dans: Brut[] = []): Brut[] => {
  if (Array.isArray(v)) {
    if (v.length && v.every(estPublication)) dans.push(...v);
    else v.forEach(x => cueillir(x, dans));
  } else if (estObjet(v)) {
    Object.values(v).forEach(x => cueillir(x, dans));
  }
  return dans;
};

const texteDe = (p: Brut): string => {
  const data = Array.isArray(p.data) ? p.data : [];
  const morceaux = data
    .map(d => (estObjet(d) && typeof d.post === 'string' ? decoderTexte(d.post).trim() : ''))
    .filter(Boolean);
  return [...new Set(morceaux)].join('\n\n');
};

type Piece = { uri?: string; url?: string };
const piecesDe = (p: Brut): Piece[] => {
  const out: Piece[] = [];
  const attachments = Array.isArray(p.attachments) ? p.attachments : [];
  for (const a of attachments) {
    const data = estObjet(a) && Array.isArray(a.data) ? a.data : [];
    for (const d of data) {
      if (!estObjet(d)) continue;
      const media = estObjet(d.media) ? d.media : null;
      if (media && typeof media.uri === 'string') out.push({ uri: media.uri });
      const ext = estObjet(d.external_context) ? d.external_context : null;
      if (ext && typeof ext.url === 'string') out.push({ url: ext.url });
    }
  }
  return out;
};

const EST_PHOTO = /\.(jpe?g|png|gif|webp|heic)$/i;
const chemin = (f: File) => (f.webkitRelativePath || f.name).replace(/\\/g, '/');
/** Le chemin sans le dossier racine choisi par Caroline, pour le comparer aux uri de Facebook. */
const cheminRelatif = (f: File) => chemin(f).split('/').slice(1).join('/');

export const dateLocale = (horodatage: number): string =>
  new Date(horodatage * 1000).toLocaleDateString('fr-CA');

/**
 * Lit les fichiers d'un dossier (l'entrée `webkitdirectory`) et rend les publications, la plus
 * récente d'abord. Une publication sans texte ni photo est passée.
 */
export const lirePublications = async (fichiers: File[]): Promise<PublicationFacebook[]> => {
  const parChemin = new Map<string, File>();
  const parNom = new Map<string, File>();
  for (const f of fichiers) {
    parChemin.set(cheminRelatif(f), f);
    if (!parNom.has(f.name)) parNom.set(f.name, f);
  }
  const trouver = (uri: string): File | undefined => {
    const propre = uri.replace(/^\.?\//, '');
    const exact = parChemin.get(propre);
    if (exact) return exact;
    const suffixe = [...parChemin.keys()].find(c => c.endsWith('/' + propre) || propre.endsWith('/' + c));
    if (suffixe) return parChemin.get(suffixe);
    return parNom.get(propre.split('/').pop() || '');
  };

  let jsons = fichiers.filter(f => /\.json$/i.test(f.name) && /post|publication/i.test(chemin(f)));
  if (!jsons.length) jsons = fichiers.filter(f => /\.json$/i.test(f.name) && f.size < 20 * 1024 * 1024);

  const vues = new Map<string, PublicationFacebook>();
  for (const f of jsons) {
    let json: unknown;
    try { json = JSON.parse(await f.text()); } catch { continue; }
    for (const p of cueillir(json)) {
      const horodatage = p.timestamp as number;
      const id = `facebook:${horodatage}`;
      if (vues.has(id)) continue;
      const texte = texteDe(p);
      const photos: File[] = [];
      let manquantes = 0;
      let lien: string | undefined;
      for (const piece of piecesDe(p)) {
        if (piece.url && !lien) lien = piece.url;
        if (!piece.uri || !EST_PHOTO.test(piece.uri)) continue;
        const fichier = trouver(piece.uri);
        if (fichier) photos.push(fichier);
        else manquantes++;
      }
      if (!texte && !photos.length) continue;
      vues.set(id, { id, date: dateLocale(horodatage), texte, photos, manquantes, lien });
    }
  }
  return [...vues.values()].sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }));
};

/** Un titre tiré de la première phrase du texte, ou de la date quand il n'y a pas de texte. */
export const titreDepuis = (texte: string, dateLisible: string): string => {
  const ligne = texte.split('\n').map(l => l.trim()).find(Boolean) || '';
  if (!ligne) return `Publication du ${dateLisible}`;
  const phrase = ligne.split(/(?<=[.!?…])\s/)[0].replace(/[.:;,]+$/, '');
  if (phrase.length <= 80) return phrase;
  const coupe = phrase.slice(0, 70);
  return coupe.slice(0, coupe.lastIndexOf(' ') > 30 ? coupe.lastIndexOf(' ') : 70).replace(/[.:;,]+$/, '');
};
