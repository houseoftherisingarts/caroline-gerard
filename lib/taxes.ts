/**
 * Taxes perçues sur une vente de livre, telles que Caroline les remet ensuite.
 *
 * Au Québec, le livre imprimé porte la TPS (5 %) mais pas la TVQ; le transport facturé porte
 * les deux. Le pourcentage de TPS reste modifiable sur chaque vente, parce qu'un dépositaire
 * peut ne rien charger ou vendre le livre « taxes incluses », et les montants en dollars se
 * corrigent à la main quand le calcul ne colle pas à ce qui a vraiment été perçu.
 */

export const TPS_PCT = 5;
export const TVQ_PCT = 9.975;

export type VenteTaxable = {
  qty?: number;
  unitPrice?: number;
  shipping?: number;        // transport facturé, en $
  taxesIncluses?: boolean;  // le prix et le transport comprennent déjà les taxes
  tpsPct?: number;          // % de TPS sur les livres (TPS_PCT si absent)
  tps?: number;             // TPS perçue en $, telle qu'enregistrée
  tvq?: number;             // TVQ perçue en $, telle qu'enregistrée
};

const cents = (n: number) => Math.round(n * 100) / 100;

/** Taxes calculées d'après le prix, le transport et le pourcentage, sans tenir compte d'une correction à la main. */
export const calculerTaxes = (v: VenteTaxable) => {
  const brut = (v.qty ?? 0) * (v.unitPrice ?? 0);
  const transport = v.shipping ?? 0;
  const pct = v.tpsPct ?? TPS_PCT;
  if (v.taxesIncluses) {
    const baseLivres = brut / (1 + pct / 100);
    const baseTransport = transport / (1 + (TPS_PCT + TVQ_PCT) / 100);
    return {
      tps: cents(brut - baseLivres + baseTransport * TPS_PCT / 100),
      tvq: cents(baseTransport * TVQ_PCT / 100),
    };
  }
  return {
    tps: cents(brut * pct / 100 + transport * TPS_PCT / 100),
    tvq: cents(transport * TVQ_PCT / 100),
  };
};

/** Ce que rapportent les livres avant taxes : le prix affiché, ou le prix débarrassé de la TPS quand elle y était comprise. */
export const revenuLivres = (v: VenteTaxable) => {
  const brut = (v.qty ?? 0) * (v.unitPrice ?? 0);
  return v.taxesIncluses ? cents(brut / (1 + (v.tpsPct ?? TPS_PCT) / 100)) : brut;
};

/** Ce que la personne a payé pour les livres et le transport, taxes comprises (le pourboire est à part). */
export const montantEncaisse = (v: VenteTaxable) => {
  const brut = (v.qty ?? 0) * (v.unitPrice ?? 0) + (v.shipping ?? 0);
  return v.taxesIncluses ? brut : cents(brut + (v.tps ?? 0) + (v.tvq ?? 0));
};
