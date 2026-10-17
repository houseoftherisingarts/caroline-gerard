// Les courriels de la facturation : facture, devis, note de crédit, relance et état de compte.
// Chaque fonction rend une adresse mailto: que le logiciel de courriel de Laurie ouvre, déjà remplie.
// Elle relit et envoie elle-même. Avec le forfait Blaze et Resend, l'envoi pourra partir directement
// (docs/BRANCHEMENTS.md, section « Courriel des factures »).
import type { Document, Language } from '../types';

export interface Courriel {
  a: string;
  sujet: string;
  corps: string;
}

export const argent = (n: number) => `${n < -0.004 ? '−' : ''}${new Intl.NumberFormat('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n))} $`;

export function lienMailto({ a, sujet, corps }: Courriel): string {
  return `mailto:${a.trim()}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`;
}

/** La première modalité, sans son numéro : assez pour un courriel, le reste est sur la facture. */
function modaliteCourte(terms: string): string {
  const premiere = (terms || '').split('\n').map((l) => l.trim()).find(Boolean) || '';
  return premiere.replace(/^\d+\.\s*/, '').slice(0, 220);
}

const lignes = (...l: (string | false | undefined)[]) => l.filter((x) => x !== false && x !== undefined).join('\n');

interface Contexte {
  lang: Language;
  nom: string;
  lien: string;
}

/** Le courriel d'envoi d'une facture, d'un devis ou d'une note de crédit. `montant` : le solde, ou le total. */
export function courrielDocument(doc: Document, montant: number, { lang, nom, lien }: Contexte): Courriel {
  const client = doc.clientName || (lang === 'FR' ? 'Madame, Monsieur' : 'Hello');
  const modalite = modaliteCourte(doc.terms);
  if (lang === 'EN') {
    const objet = doc.type === 'Quote' ? 'quote' : doc.type === 'Credit' ? 'credit note' : 'invoice';
    return {
      a: doc.clientEmail,
      sujet: doc.type === 'Quote' ? `Quote ${doc.number} to sign, from ${nom}` : doc.type === 'Credit' ? `Credit note ${doc.number} from ${nom}` : `Invoice ${doc.number} from ${nom}`,
      corps: lignes(
        `Hello ${client},`,
        '',
        `Here is your ${objet} ${doc.number}.`,
        `The amount is ${argent(montant)}.`,
        doc.type === 'Credit' && doc.factureNumero ? `It applies to invoice ${doc.factureNumero}.` : undefined,
        doc.type === 'Invoice' && doc.dueDate ? `It is due on ${doc.dueDate}.` : undefined,
        '',
        doc.type === 'Invoice' ? 'You can view and pay it online:' : 'You can view it online:',
        lien,
        doc.type === 'Quote' ? 'To accept it, reply to this email.' : undefined,
        modalite ? '' : undefined,
        modalite || undefined,
        '',
        'Thank you for your trust.',
        nom,
      ),
    };
  }
  const objet = doc.type === 'Quote' ? 'votre devis' : doc.type === 'Credit' ? 'votre note de crédit' : 'votre facture';
  return {
    a: doc.clientEmail,
    sujet: doc.type === 'Quote' ? `Devis ${doc.number} à signer, de ${nom}` : doc.type === 'Credit' ? `Note de crédit ${doc.number} de ${nom}` : `Facture ${doc.number} de ${nom}`,
    corps: lignes(
      `Bonjour ${client},`,
      '',
      `Voici ${objet} ${doc.number}.`,
      `Le montant est de ${argent(montant)}.`,
      doc.type === 'Credit' && doc.factureNumero ? `Elle s'applique à la facture ${doc.factureNumero}.` : undefined,
      doc.type === 'Invoice' && doc.dueDate ? `L'échéance est le ${doc.dueDate}.` : undefined,
      '',
      doc.type === 'Invoice' ? 'Vous pouvez la consulter et la payer en ligne :' : doc.type === 'Quote' ? 'Vous pouvez le consulter en ligne :' : 'Vous pouvez la consulter en ligne :',
      lien,
      doc.type === 'Quote' ? 'Pour l\'accepter, répondez à ce courriel.' : undefined,
      modalite ? '' : undefined,
      modalite || undefined,
      '',
      'Merci de votre confiance.',
      nom,
    ),
  };
}

/** Le rappel courtois d'une facture en retard. */
export function courrielRelance(doc: Document, solde: number, joursRetard: number, { lang, nom, lien }: Contexte): Courriel {
  const client = doc.clientName || (lang === 'FR' ? 'Madame, Monsieur' : 'Hello');
  if (lang === 'EN') {
    return {
      a: doc.clientEmail,
      sujet: `Reminder: invoice ${doc.number}`,
      corps: lignes(
        `Hello ${client},`,
        '',
        `Invoice ${doc.number} was due on ${doc.dueDate}.`,
        `It is now ${joursRetard} day${joursRetard > 1 ? 's' : ''} overdue.`,
        `The balance is ${argent(solde)}.`,
        '',
        'You can view and pay it online:',
        lien,
        '',
        'If your payment is already on its way, please disregard this message.',
        '',
        'Thank you,',
        nom,
      ),
    };
  }
  return {
    a: doc.clientEmail,
    sujet: `Rappel : facture ${doc.number}`,
    corps: lignes(
      `Bonjour ${client},`,
      '',
      `La facture ${doc.number} était payable le ${doc.dueDate}.`,
      `Elle est en retard de ${joursRetard} jour${joursRetard > 1 ? 's' : ''}.`,
      `Le solde à payer est de ${argent(solde)}.`,
      '',
      'Vous pouvez la consulter et la payer en ligne :',
      lien,
      '',
      'Si votre paiement est déjà parti, ne tenez pas compte de ce message.',
      '',
      'Merci,',
      nom,
    ),
  };
}

export interface LigneEtat {
  numero: string;
  dueDate?: string;
  solde: number;
  lien: string;
}

/** L'état de compte : le total dû, puis chaque facture ouverte avec son lien. */
export function courrielEtatDeCompte(
  client: { nom: string; courriel: string },
  totalDu: number,
  ouvertes: LigneEtat[],
  date: string,
  { lang, nom }: Omit<Contexte, 'lien'>,
): Courriel {
  const detail = ouvertes.map((l) =>
    lang === 'FR'
      ? `${l.numero} : ${argent(l.solde)}${l.dueDate ? `, échéance ${l.dueDate}` : ''}${l.lien ? `\n${l.lien}` : ''}`
      : `${l.numero}: ${argent(l.solde)}${l.dueDate ? `, due ${l.dueDate}` : ''}${l.lien ? `\n${l.lien}` : ''}`,
  );
  if (lang === 'EN') {
    return {
      a: client.courriel,
      sujet: `Statement of account at ${date}, from ${nom}`,
      corps: lignes(`Hello ${client.nom},`, '', `Here is your statement of account at ${date}.`, `The total due is ${argent(totalDu)}.`, '', ...detail, '', 'Thank you for your trust.', nom),
    };
  }
  return {
    a: client.courriel,
    sujet: `État de compte au ${date}, de ${nom}`,
    corps: lignes(`Bonjour ${client.nom},`, '', `Voici votre état de compte au ${date}.`, `Le total dû est de ${argent(totalDu)}.`, '', ...detail, '', 'Merci de votre confiance.', nom),
  };
}
