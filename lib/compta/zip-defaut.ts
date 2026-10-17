// Un zip fabriqué dans le navigateur, sans compression et sans dépendance.
//
// Le kit de presse se rend à l'écran (components/presse/CartePresse.tsx) plutôt que dans un script, si
// bien que le zip d'un seul geste se fabrique au clic, à partir des visuels que la page vient de
// capturer et des photos servies par le site. Des JPEG et des PNG sont déjà compressés, alors la méthode
// « stored » ne perd rien et tient en cinquante lignes, là où un vrai deflate demanderait une
// bibliothèque de plus.
//
// Vérification : node scripts/zip.test.mjs (fabrique une archive et la fait valider par unzip -t).

const TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export interface FichierZip {
  nom: string;
  data: Uint8Array;
}

/** Empile les fichiers dans une archive zip (méthode « stored », noms en UTF-8). */
export function zipper(fichiers: FichierZip[]): Blob {
  const enc = new TextEncoder();
  const corps: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  const d = new Date();
  const heure = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff;
  const date = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff;
  let offset = 0;

  for (const f of fichiers) {
    const nom = enc.encode(f.nom);
    const crc = crc32(f.data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // noms en UTF-8
    local.setUint16(8, 0, true); // stored
    local.setUint16(10, heure, true);
    local.setUint16(12, date, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, f.data.length, true);
    local.setUint32(22, f.data.length, true);
    local.setUint16(26, nom.length, true);
    corps.push(new Uint8Array(local.buffer), nom, f.data);

    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true);
    cd.setUint16(4, 20, true);
    cd.setUint16(6, 20, true);
    cd.setUint16(8, 0x0800, true);
    cd.setUint16(10, 0, true);
    cd.setUint16(12, heure, true);
    cd.setUint16(14, date, true);
    cd.setUint32(16, crc, true);
    cd.setUint32(20, f.data.length, true);
    cd.setUint32(24, f.data.length, true);
    cd.setUint16(28, nom.length, true);
    cd.setUint32(42, offset, true);
    central.push(new Uint8Array(cd.buffer), nom);

    offset += 30 + nom.length + f.data.length;
  }

  const tailleCentral = central.reduce((n, c) => n + c.length, 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true);
  fin.setUint16(8, fichiers.length, true);
  fin.setUint16(10, fichiers.length, true);
  fin.setUint32(12, tailleCentral, true);
  fin.setUint32(16, offset, true);

  return new Blob([...corps, ...central, new Uint8Array(fin.buffer)] as BlobPart[], { type: 'application/zip' });
}

/** Les octets d'une adresse : une donnée en base64 comme un fichier du site. */
export async function octets(url: string): Promise<Uint8Array> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} : ${r.status}`);
  return new Uint8Array(await r.arrayBuffer());
}

export const octetsTexte = (texte: string): Uint8Array => new TextEncoder().encode(texte);
