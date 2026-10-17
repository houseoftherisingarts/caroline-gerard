"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.argent = void 0;
exports.lienMailto = lienMailto;
exports.courrielDocument = courrielDocument;
exports.courrielRelance = courrielRelance;
exports.courrielEtatDeCompte = courrielEtatDeCompte;
const argent = (n) => `${n < -0.004 ? '−' : ''}${new Intl.NumberFormat('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n))} $`;
exports.argent = argent;
function lienMailto({ a, sujet, corps }) {
    return `mailto:${a.trim()}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`;
}
/** La première modalité, sans son numéro : assez pour un courriel, le reste est sur la facture. */
function modaliteCourte(terms) {
    const premiere = (terms || '').split('\n').map((l) => l.trim()).find(Boolean) || '';
    return premiere.replace(/^\d+\.\s*/, '').slice(0, 220);
}
const lignes = (...l) => l.filter((x) => x !== false && x !== undefined).join('\n');
/** Le courriel d'envoi d'une facture, d'un devis ou d'une note de crédit. `montant` : le solde, ou le total. */
function courrielDocument(doc, montant, { lang, nom, lien }) {
    const client = doc.clientName || (lang === 'FR' ? 'Madame, Monsieur' : 'Hello');
    const modalite = modaliteCourte(doc.terms);
    if (lang === 'EN') {
        const objet = doc.type === 'Quote' ? 'quote' : doc.type === 'Credit' ? 'credit note' : 'invoice';
        return {
            a: doc.clientEmail,
            sujet: doc.type === 'Quote' ? `Quote ${doc.number} to sign, from ${nom}` : doc.type === 'Credit' ? `Credit note ${doc.number} from ${nom}` : `Invoice ${doc.number} from ${nom}`,
            corps: lignes(`Hello ${client},`, '', `Here is your ${objet} ${doc.number}.`, `The amount is ${(0, exports.argent)(montant)}.`, doc.type === 'Credit' && doc.factureNumero ? `It applies to invoice ${doc.factureNumero}.` : undefined, doc.type === 'Invoice' && doc.dueDate ? `It is due on ${doc.dueDate}.` : undefined, '', doc.type === 'Invoice' ? 'You can view and pay it online:' : 'You can view it online:', lien, doc.type === 'Quote' ? 'To accept it, reply to this email.' : undefined, modalite ? '' : undefined, modalite || undefined, '', 'Thank you for your trust.', nom),
        };
    }
    const objet = doc.type === 'Quote' ? 'votre devis' : doc.type === 'Credit' ? 'votre note de crédit' : 'votre facture';
    return {
        a: doc.clientEmail,
        sujet: doc.type === 'Quote' ? `Devis ${doc.number} à signer, de ${nom}` : doc.type === 'Credit' ? `Note de crédit ${doc.number} de ${nom}` : `Facture ${doc.number} de ${nom}`,
        corps: lignes(`Bonjour ${client},`, '', `Voici ${objet} ${doc.number}.`, `Le montant est de ${(0, exports.argent)(montant)}.`, doc.type === 'Credit' && doc.factureNumero ? `Elle s'applique à la facture ${doc.factureNumero}.` : undefined, doc.type === 'Invoice' && doc.dueDate ? `L'échéance est le ${doc.dueDate}.` : undefined, '', doc.type === 'Invoice' ? 'Vous pouvez la consulter et la payer en ligne :' : doc.type === 'Quote' ? 'Vous pouvez le consulter en ligne :' : 'Vous pouvez la consulter en ligne :', lien, doc.type === 'Quote' ? 'Pour l\'accepter, répondez à ce courriel.' : undefined, modalite ? '' : undefined, modalite || undefined, '', 'Merci de votre confiance.', nom),
    };
}
/** Le rappel courtois d'une facture en retard. */
function courrielRelance(doc, solde, joursRetard, { lang, nom, lien }) {
    const client = doc.clientName || (lang === 'FR' ? 'Madame, Monsieur' : 'Hello');
    if (lang === 'EN') {
        return {
            a: doc.clientEmail,
            sujet: `Reminder: invoice ${doc.number}`,
            corps: lignes(`Hello ${client},`, '', `Invoice ${doc.number} was due on ${doc.dueDate}.`, `It is now ${joursRetard} day${joursRetard > 1 ? 's' : ''} overdue.`, `The balance is ${(0, exports.argent)(solde)}.`, '', 'You can view and pay it online:', lien, '', 'If your payment is already on its way, please disregard this message.', '', 'Thank you,', nom),
        };
    }
    return {
        a: doc.clientEmail,
        sujet: `Rappel : facture ${doc.number}`,
        corps: lignes(`Bonjour ${client},`, '', `La facture ${doc.number} était payable le ${doc.dueDate}.`, `Elle est en retard de ${joursRetard} jour${joursRetard > 1 ? 's' : ''}.`, `Le solde à payer est de ${(0, exports.argent)(solde)}.`, '', 'Vous pouvez la consulter et la payer en ligne :', lien, '', 'Si votre paiement est déjà parti, ne tenez pas compte de ce message.', '', 'Merci,', nom),
    };
}
/** L'état de compte : le total dû, puis chaque facture ouverte avec son lien. */
function courrielEtatDeCompte(client, totalDu, ouvertes, date, { lang, nom }) {
    const detail = ouvertes.map((l) => lang === 'FR'
        ? `${l.numero} : ${(0, exports.argent)(l.solde)}${l.dueDate ? `, échéance ${l.dueDate}` : ''}${l.lien ? `\n${l.lien}` : ''}`
        : `${l.numero}: ${(0, exports.argent)(l.solde)}${l.dueDate ? `, due ${l.dueDate}` : ''}${l.lien ? `\n${l.lien}` : ''}`);
    if (lang === 'EN') {
        return {
            a: client.courriel,
            sujet: `Statement of account at ${date}, from ${nom}`,
            corps: lignes(`Hello ${client.nom},`, '', `Here is your statement of account at ${date}.`, `The total due is ${(0, exports.argent)(totalDu)}.`, '', ...detail, '', 'Thank you for your trust.', nom),
        };
    }
    return {
        a: client.courriel,
        sujet: `État de compte au ${date}, de ${nom}`,
        corps: lignes(`Bonjour ${client.nom},`, '', `Voici votre état de compte au ${date}.`, `Le total dû est de ${(0, exports.argent)(totalDu)}.`, '', ...detail, '', 'Merci de votre confiance.', nom),
    };
}
//# sourceMappingURL=factures-courriel.js.map