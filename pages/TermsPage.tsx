import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { BookOpen, RotateCcw, Truck, Shield, Cookie, Scale, ChevronDown, ChevronUp } from 'lucide-react';
import EditableText from '../components/EditableText';
import { subscribeToBooks } from '../lib/firestore';
import { Book } from '../types';

const Section = ({
  id,
  icon,
  title,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  title: React.ReactNode;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(true);
  return (
    <section id={id} className="bg-midnight/60 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4 px-8 py-6 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="bg-gold/15 p-2.5 rounded-xl text-gold shrink-0">{icon}</div>
          <h2 className="text-xl font-bold text-white">{title}</h2>
        </div>
        {open ? <ChevronUp className="text-slate-400 shrink-0 w-5 h-5" /> : <ChevronDown className="text-slate-400 shrink-0 w-5 h-5" />}
      </button>
      {open && (
        <div className="px-8 pb-8 text-slate-300 leading-relaxed space-y-4 text-sm border-t border-white/5">
          {children}
        </div>
      )}
    </section>
  );
};

const cls = {
  h3: 'text-gold font-bold text-base mt-6 mb-2',
  p: 'text-slate-300 text-sm leading-relaxed',
};

const Dl = ({ rows }: { rows: [string, string][] }) => (
  <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
    {rows.map(([label, value]) => (
      <React.Fragment key={label}>
        <dt className="text-slate-500 font-medium whitespace-nowrap">{label}</dt>
        <dd className="text-slate-300">{value}</dd>
      </React.Fragment>
    ))}
  </dl>
);

const TermsPage: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  useEffect(() => subscribeToBooks(all => setBooks(all.filter(b => !b.isHidden))), []);

  return (
  <div className="min-h-screen pt-40 pb-20 px-6 md:px-12 max-w-4xl mx-auto">
    <Helmet>
      <title>Conditions générales & Confidentialité | Caroline Gérard</title>
      <meta name="description" content="Conditions générales de vente, politique de confidentialité (Loi 25 — Québec), retours, délais de livraison et mentions légales pour carolinegerard.ca." />
      <link rel="canonical" href="https://carolinegerard.ca/conditions" />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content="fr_CA" />
      <meta property="og:url" content="https://carolinegerard.ca/conditions" />
    </Helmet>

    {/* Header */}
    <div className="text-center mb-12">
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/20 text-gold mb-6">
        <Scale className="w-4 h-4" />
        <EditableText tag="span" contentKey="terms_header_badge" defaultValue="Documents légaux" className="text-xs font-bold uppercase tracking-widest" />
      </div>
      <EditableText tag="h1" contentKey="terms_header_title" defaultValue="Conditions générales" className="font-serif text-4xl md:text-5xl text-white mb-4" />
      <EditableText
        tag="p"
        contentKey="terms_header_desc"
        defaultValue="Politique de confidentialité, conditions de vente, retours et délais de livraison pour <span class='text-gold font-semibold'>carolinegerard.ca</span>."
        className="text-slate-400 max-w-xl mx-auto"
      />
      <EditableText
        tag="p"
        contentKey="terms_last_updated"
        defaultValue="Dernière mise à jour : mars 2026"
        className="text-slate-600 text-xs mt-4"
      />
    </div>

    {/* Quick nav */}
    <nav className="flex flex-wrap gap-2 justify-center mb-10">
      {[
        ['#produit', 'terms_nav_produit', 'Le livre'],
        ['#vente', 'terms_nav_vente', 'Conditions de vente'],
        ['#retours', 'terms_nav_retours', 'Retours'],
        ['#livraison', 'terms_nav_livraison', 'Livraison'],
        ['#confidentialite', 'terms_nav_confidentialite', 'Confidentialité'],
        ['#cookies', 'terms_nav_cookies', 'Cookies'],
        ['#droits', 'terms_nav_droits', 'Propriété intellectuelle'],
      ].map(([href, key, label]) => (
        <a
          key={href}
          href={href}
          className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-400 text-xs font-bold hover:text-gold hover:border-gold/30 transition-all"
        >
          <EditableText tag="span" contentKey={key} defaultValue={label} />
        </a>
      ))}
    </nav>

    <div className="space-y-4">

      {/* ── Le livre (dynamique — toutes les œuvres visibles dans la boutique) ── */}
      <Section
        id="produit"
        icon={<BookOpen className="w-5 h-5" />}
        title={<EditableText tag="span" contentKey="terms_produit_title" defaultValue="Les livres — Mentions légales" />}
      >
        {books.length === 0 && (
          <p className={cls.p}>Chargement…</p>
        )}
        {books.map((b, idx) => {
          const metaRows: [string, string][] = [
            ['Titre complet', [b.title, b.subtitle].filter(Boolean).join(' — ')],
            ...(b.format ? [['Format', b.format + (b.pageCount ? ` · ${b.pageCount} pages` : '')] as [string, string]] : []),
            ...(b.pageCount && !b.format ? [['Nombre de pages', String(b.pageCount)] as [string, string]] : []),
            ...(b.redaction ? [['Rédaction', b.redaction] as [string, string]] : []),
            ...(b.direction ? [['Idéation et direction', b.direction] as [string, string]] : []),
            ...(b.coordination ? [['Accompagnement littéraire', b.coordination] as [string, string]] : []),
            ...(b.revision ? [['Révision', b.revision] as [string, string]] : []),
            ...(b.coverDesign ? [['Couverture', b.coverDesign] as [string, string]] : []),
            ...(b.layout ? [['Mise en page', b.layout] as [string, string]] : []),
          ];
          const isbnRows: [string, string][] = [
            ...(b.isbnPrint ? [['ISBN (Imprimé)', b.isbnPrint] as [string, string]] : []),
            ...(b.isbnPdf ? [['ISBN (PDF)', b.isbnPdf] as [string, string]] : []),
            ...(b.isbnEpub ? [['ISBN (ePUB)', b.isbnEpub] as [string, string]] : []),
          ];
          return (
            <div key={b.id} className={idx > 0 ? 'mt-8 pt-8 border-t border-white/10' : ''}>
              <h3 className={cls.h3}>{b.title}{b.subtitle ? <span className="text-slate-400 font-normal"> — {b.subtitle}</span> : ''}</h3>
              {metaRows.length > 0 && <Dl rows={metaRows} />}
              {isbnRows.length > 0 && (
                <>
                  <EditableText tag="h3" contentKey={`terms_produit_h3_isbn_${b.id}`} defaultValue="Identifiants" className={cls.h3} />
                  <Dl rows={isbnRows} />
                </>
              )}
              {metaRows.length <= 1 && isbnRows.length === 0 && (
                <EditableText
                  tag="p"
                  contentKey={`terms_produit_details_${b.id}`}
                  defaultValue="Informations bibliographiques à compléter dans l'administration du catalogue."
                  className={cls.p}
                />
              )}
            </div>
          );
        })}
        <div className="mt-8 pt-8 border-t border-white/10">
          <EditableText tag="h3" contentKey="terms_produit_h3_editeur" defaultValue="Éditeur / Responsable du site" className={cls.h3} />
          <EditableText
            tag="p"
            contentKey="terms_produit_editeur"
            defaultValue="Un Million de Rêves — carolinegerard.ca<br>Courriel&nbsp;: <a href='mailto:caroline@carolinegerard.ca' class='text-gold hover:underline'>caroline@carolinegerard.ca</a><br>Responsable de la protection des renseignements personnels&nbsp;: Caroline Gérard"
            className={cls.p}
          />
        </div>
      </Section>

      {/* ── Conditions de vente ── */}
      <Section
        id="vente"
        icon={<Scale className="w-5 h-5" />}
        title={<EditableText tag="span" contentKey="terms_vente_title" defaultValue="Conditions générales de vente" />}
      >
        <EditableText
          tag="h3"
          contentKey="terms_vente_acceptance_title"
          defaultValue="Acceptation des conditions"
          className={cls.h3}
        />
        <EditableText
          tag="p"
          contentKey="terms_vente_acceptance"
          defaultValue="Toute commande passée sur carolinegerard.ca implique l'acceptation pleine et entière des présentes conditions générales de vente. Ces conditions s'appliquent à l'exclusion de toutes autres conditions."
          className={cls.p}
        />
        <EditableText
          tag="h3"
          contentKey="terms_vente_prix_title"
          defaultValue="Prix"
          className={cls.h3}
        />
        <EditableText
          tag="p"
          contentKey="terms_vente_prix"
          defaultValue="Les prix affichés sont en dollars canadiens (CAD) et s'entendent hors taxes. Les taxes applicables (TPS 5 % sur les livres et la livraison ; TVQ 9,975 % sur la livraison uniquement — les livres imprimés sont exonérés de TVQ au Québec) sont calculées et ajoutées lors du paiement."
          className={cls.p}
        />
        <EditableText
          tag="h3"
          contentKey="terms_vente_paiement_title"
          defaultValue="Paiement"
          className={cls.h3}
        />
        <EditableText
          tag="p"
          contentKey="terms_vente_paiement"
          defaultValue="Les paiements sont traités de façon sécurisée par <strong>Square</strong> (PCI-DSS). Nous n'avons jamais accès à tes informations de carte bancaire complètes. Les paiements sont acceptés en dollars canadiens uniquement."
          className={cls.p}
        />
        <EditableText
          tag="h3"
          contentKey="terms_vente_confirmation_title"
          defaultValue="Confirmation de commande"
          className={cls.h3}
        />
        <EditableText
          tag="p"
          contentKey="terms_vente_confirmation"
          defaultValue="Un courriel de confirmation t'est envoyé après chaque achat. Il constitue la preuve de ta commande. Conserve-le précieusement."
          className={cls.p}
        />
        <EditableText
          tag="h3"
          contentKey="terms_vente_dispo_title"
          defaultValue="Disponibilité"
          className={cls.h3}
        />
        <EditableText
          tag="p"
          contentKey="terms_vente_dispo"
          defaultValue="Les produits sont proposés dans la limite des stocks disponibles. En cas d'indisponibilité après passation de la commande, le client sera informé dans les meilleurs délais et pourra choisir entre un remboursement intégral ou un délai d'attente."
          className={cls.p}
        />
      </Section>

      {/* ── Retours ── */}
      <Section
        id="retours"
        icon={<RotateCcw className="w-5 h-5" />}
        title={<EditableText tag="span" contentKey="terms_retours_title" defaultValue="Retour de marchandise" />}
      >
        <EditableText
          tag="p"
          contentKey="terms_retours_intro"
          defaultValue="Les articles fournis par <strong>carolinegerard.ca</strong> sont neufs et garantis sans défaut. S'il arrivait qu'un article soit défectueux ou ne corresponde pas à ce qui avait été commandé, <strong>Un Million de Rêves</strong> s'engage à l'échanger ou à le rembourser, y compris les frais de port, dans les <strong>10 jours suivant la date de livraison</strong>, à condition qu'il soit accompagné du bulletin de livraison ou d'une copie de la facture carolinegerard.ca."
          className={cls.p}
        />
        <EditableText
          tag="h3"
          contentKey="terms_retours_procedure_title"
          defaultValue="Procédure"
          className={cls.h3}
        />
        <EditableText
          tag="p"
          contentKey="terms_retours_procedure"
          defaultValue="Pour initier un retour, contacte-nous à <a href='mailto:caroline@carolinegerard.ca' class='text-gold hover:underline'>caroline@carolinegerard.ca</a> en indiquant ton numéro de commande et la raison du retour. Nous te fournirons les instructions d'expédition."
          className={cls.p}
        />
        <EditableText
          tag="h3"
          contentKey="terms_retours_etat_title"
          defaultValue="État des articles retournés"
          className={cls.h3}
        />
        <EditableText
          tag="p"
          contentKey="terms_retours_etat"
          defaultValue="Les articles doivent être retournés dans leur état d'origine, non utilisés et dans leur emballage d'origine. Tout article retourné endommagé ou incomplet ne pourra pas être remboursé."
          className={cls.p}
        />
        <EditableText
          tag="h3"
          contentKey="terms_retours_remboursement_title"
          defaultValue="Remboursement"
          className={cls.h3}
        />
        <EditableText
          tag="p"
          contentKey="terms_retours_remboursement"
          defaultValue="Le remboursement sera effectué dans les 5 à 10 jours ouvrables suivant réception et vérification de l'article retourné, via le même mode de paiement utilisé lors de la commande."
          className={cls.p}
        />
      </Section>

      {/* ── Livraison ── */}
      <Section
        id="livraison"
        icon={<Truck className="w-5 h-5" />}
        title={<EditableText tag="span" contentKey="terms_livraison_title" defaultValue="Délais de livraison" />}
      >
        <EditableText
          tag="p"
          contentKey="terms_livraison_intro"
          defaultValue="Un délai de <strong>deux jours ouvrables</strong> doit être alloué au traitement des commandes pour les produits en stock à notre entrepôt, auquel il faut ajouter :"
          className={cls.p}
        />
        <ul className="list-disc list-inside text-slate-300 text-sm space-y-1 ml-2">
          <li>
            <EditableText
              tag="span"
              contentKey="terms_livraison_delay_standard"
              defaultValue="<strong>1 à 3 jours ouvrables</strong> en moyenne pour une livraison standard au Québec"
            />
          </li>
          <li>
            <EditableText
              tag="span"
              contentKey="terms_livraison_delay_express"
              defaultValue="<strong>1 jour ouvrable</strong> pour une livraison accélérée"
            />
          </li>
        </ul>
        <EditableText
          tag="h3"
          contentKey="terms_livraison_frais_title"
          defaultValue="Frais de livraison"
          className={cls.h3}
        />
        <EditableText
          tag="p"
          contentKey="terms_livraison_frais"
          defaultValue="Les frais de livraison sont de <strong>6,00 $ CAD</strong> par commande (livraison standard au Canada). Les frais sont affichés lors du paiement."
          className={cls.p}
        />
        <EditableText
          tag="h3"
          contentKey="terms_livraison_suivi_title"
          defaultValue="Suivi"
          className={cls.h3}
        />
        <EditableText
          tag="p"
          contentKey="terms_livraison_suivi"
          defaultValue="Un numéro de suivi te sera communiqué par courriel dès l'expédition de ta commande. En cas de non-réception, écris-nous à <a href='mailto:caroline@carolinegerard.ca' class='text-gold hover:underline'>caroline@carolinegerard.ca</a>."
          className={cls.p}
        />
        <EditableText
          tag="h3"
          contentKey="terms_livraison_international_title"
          defaultValue="Livraison internationale"
          className={cls.h3}
        />
        <EditableText
          tag="p"
          contentKey="terms_livraison_international"
          defaultValue="La livraison est actuellement offerte au Canada uniquement. Pour toute demande de livraison internationale, écris-nous directement."
          className={cls.p}
        />
      </Section>

      {/* ── Confidentialité (Loi 25) ── */}
      <Section
        id="confidentialite"
        icon={<Shield className="w-5 h-5" />}
        title={<EditableText tag="span" contentKey="terms_confidentialite_title" defaultValue="Politique de confidentialité — Loi 25 (Québec)" />}
      >
        <EditableText
          tag="p"
          contentKey="terms_confidentialite_intro"
          defaultValue="La présente politique est conforme à la <strong>Loi modernisant des dispositions législatives en matière de protection des renseignements personnels</strong> (Loi 25, Québec) et à la <em>Loi sur la protection des renseignements personnels dans le secteur privé</em> (LPRPSP)."
          className={cls.p}
        />

        <EditableText tag="h3" contentKey="terms_conf_h3_responsable" defaultValue="Responsable de la protection des renseignements personnels" className={cls.h3} />
        <Dl rows={[
          ['Nom', 'Caroline Gérard'],
          ['Courriel', 'caroline@carolinegerard.ca'],
          ['Site', 'carolinegerard.ca'],
        ]} />

        <EditableText tag="h3" contentKey="terms_conf_h3_renseignements" defaultValue="Renseignements collectés et finalités" className={cls.h3} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 pr-4 text-slate-400 font-medium"><EditableText tag="span" contentKey="terms_conf_table_col_renseignement" defaultValue="Renseignement" /></th>
                <th className="text-left py-2 pr-4 text-slate-400 font-medium"><EditableText tag="span" contentKey="terms_conf_table_col_finalite" defaultValue="Finalité" /></th>
                <th className="text-left py-2 text-slate-400 font-medium"><EditableText tag="span" contentKey="terms_conf_table_col_retention" defaultValue="Rétention" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {[
                ["Adresse courriel (infolettre)", "Envoi de l'infolettre; notification d'événements", "Jusqu'à désinscription"],
                ['Nom, adresse, courriel, téléphone (commande)', 'Traitement et livraison de la commande; reçu fiscal', '7 ans (obligations fiscales)'],
                ['Informations de carte bancaire', 'Paiement — traité par Square ; nous ne conservons aucune donnée bancaire', 'Non conservées'],
                ['Compte Google / courriel (communauté)', "Accès à l'espace membre, messagerie avec l'auteure", "Jusqu'à suppression du compte"],
                ['Données analytiques (Firebase Analytics)', 'Statistiques de visite anonymisées — avec ton consentement uniquement', 'Agrégées, 14 mois'],
              ].map(([r, f, ret]) => (
                <tr key={r}>
                  <td className="py-2 pr-4 text-slate-300 align-top">{r}</td>
                  <td className="py-2 pr-4 text-slate-400 align-top">{f}</td>
                  <td className="py-2 text-slate-400 align-top">{ret}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <EditableText tag="h3" contentKey="terms_conf_h3_base_legale" defaultValue="Base légale du traitement" className={cls.h3} />
        <EditableText
          tag="p"
          contentKey="terms_confidentialite_base_legale"
          defaultValue="Le traitement repose sur l'exécution d'un contrat (commandes), ton consentement explicite (infolettre, analytics), et nos obligations légales (registres fiscaux)."
          className={cls.p}
        />

        <EditableText tag="h3" contentKey="terms_conf_h3_partage" defaultValue="Partage des renseignements" className={cls.h3} />
        <EditableText
          tag="p"
          contentKey="terms_confidentialite_partage"
          defaultValue="Tes renseignements personnels ne sont jamais vendus. Ils peuvent être partagés avec les sous-traitants suivants, uniquement aux fins décrites ci-dessus&nbsp;: <strong>Square Inc.</strong> (traitement des paiements), <strong>Google LLC / Firebase</strong> (hébergement, base de données, authentification, analytique), <strong>Fournisseur SMTP</strong> (envoi des reçus et infolettres)."
          className={cls.p}
        />

        <EditableText tag="h3" contentKey="terms_conf_h3_droits" defaultValue="Tes droits" className={cls.h3} />
        <EditableText
          tag="p"
          contentKey="terms_confidentialite_droits"
          defaultValue="Conformément à la Loi 25, tu disposes des droits d'accès, de rectification, de suppression, de portabilité et de retrait du consentement. Pour exercer ces droits, écris-nous à&nbsp;: <a href='mailto:caroline@carolinegerard.ca' class='text-gold hover:underline'>caroline@carolinegerard.ca</a>. Nous répondrons dans un délai de <strong>30 jours</strong>."
          className={cls.p}
        />

        <EditableText tag="h3" contentKey="terms_conf_h3_securite" defaultValue="Sécurité" className={cls.h3} />
        <EditableText
          tag="p"
          contentKey="terms_confidentialite_securite"
          defaultValue="Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger tes renseignements personnels contre tout accès non autorisé, altération, divulgation ou destruction, notamment le chiffrement en transit (HTTPS/TLS), les règles de sécurité Firestore, et l'authentification à deux facteurs pour les accès administratifs."
          className={cls.p}
        />

        <EditableText tag="h3" contentKey="terms_conf_h3_incidents" defaultValue="Incidents de confidentialité" className={cls.h3} />
        <EditableText
          tag="p"
          contentKey="terms_confidentialite_incidents"
          defaultValue="En cas d'incident de confidentialité présentant un risque de préjudice sérieux, nous notifierons la Commission d'accès à l'information du Québec (CAI) et les personnes concernées dans les délais prévus par la Loi 25."
          className={cls.p}
        />
      </Section>

      {/* ── Cookies ── */}
      <Section
        id="cookies"
        icon={<Cookie className="w-5 h-5" />}
        title={<EditableText tag="span" contentKey="terms_cookies_title" defaultValue="Cookies et technologies de suivi" />}
      >
        <EditableText
          tag="p"
          contentKey="terms_cookies_intro"
          defaultValue="Conformément à la Loi 25, nous te demandons ton consentement <strong>avant</strong> d'activer toute technologie de suivi non essentielle."
          className={cls.p}
        />
        <EditableText tag="h3" contentKey="terms_cookies_h3_essentiels" defaultValue="Cookies essentiels (sans consentement requis)" className={cls.h3} />
        <EditableText
          tag="p"
          contentKey="terms_cookies_essentiels"
          defaultValue="<code style='background:rgba(255,255,255,0.05);padding:0 4px;border-radius:4px;color:#C8A96E'>_cg_visited</code> — sessionStorage, évite le comptage multiple de visiteurs par session.<br><code style='background:rgba(255,255,255,0.05);padding:0 4px;border-radius:4px;color:#C8A96E'>_cg_consent</code> — localStorage, mémorise ton choix de consentement aux cookies analytiques.<br>Cookies Firebase Auth — nécessaires à l'authentification (espace membre)."
          className={cls.p}
        />
        <EditableText tag="h3" contentKey="terms_cookies_h3_analytiques" defaultValue="Cookies analytiques (avec consentement)" className={cls.h3} />
        <EditableText
          tag="p"
          contentKey="terms_cookies_analytiques"
          defaultValue="<strong>Firebase Analytics (Google)</strong> — mesure d'audience anonymisée (pages vues, ajouts au panier, conversions). Ces cookies ne sont activés qu'après ton acceptation via la bannière de consentement."
          className={cls.p}
        />
        <EditableText tag="h3" contentKey="terms_cookies_h3_preferences" defaultValue="Modifier tes préférences" className={cls.h3} />
        <EditableText
          tag="p"
          contentKey="terms_cookies_preferences"
          defaultValue="Tu peux retirer ton consentement aux cookies analytiques à tout moment en effaçant les données locales de ton navigateur pour ce site, ou en nous écrivant à <a href='mailto:caroline@carolinegerard.ca' class='text-gold hover:underline'>caroline@carolinegerard.ca</a>."
          className={cls.p}
        />
      </Section>

      {/* ── Propriété intellectuelle ── */}
      <Section
        id="droits"
        icon={<BookOpen className="w-5 h-5" />}
        title={<EditableText tag="span" contentKey="terms_droits_title" defaultValue="Propriété intellectuelle" />}
      >
        <EditableText
          tag="p"
          contentKey="terms_droits_intro"
          defaultValue="L'ensemble du contenu de ce site (textes, images, illustrations, photographies, logos, mise en page) est protégé par les droits d'auteur et demeure la propriété exclusive de Caroline Gérard, William Lorrain et leurs collaborateurs respectifs."
          className={cls.p}
        />
        <EditableText
          tag="p"
          contentKey="terms_droits_reproduction"
          defaultValue="Toute reproduction, représentation, modification, publication ou transmission de tout ou partie du contenu de ce site, par quelque moyen que ce soit, est interdite sans autorisation écrite préalable."
          className={cls.p}
        />
        <EditableText
          tag="h3"
          contentKey="terms_droits_marques_title"
          defaultValue="Marques"
          className={cls.h3}
        />
        <EditableText
          tag="p"
          contentKey="terms_droits_marques"
          defaultValue="« Un Million de Rêves » et « William et les univers invisibles » sont des marques appartenant à leurs titulaires respectifs. Toute utilisation non autorisée est formellement interdite."
          className={cls.p}
        />
        <EditableText
          tag="h3"
          contentKey="terms_droits_loi_title"
          defaultValue="Droit applicable"
          className={cls.h3}
        />
        <EditableText
          tag="p"
          contentKey="terms_droits_loi"
          defaultValue="Les présentes conditions sont régies par les lois en vigueur au Québec, Canada. Tout litige sera soumis aux tribunaux compétents du Québec."
          className={cls.p}
        />
      </Section>
    </div>

    <EditableText
      tag="p"
      contentKey="terms_footer_contact"
      defaultValue="Pour toute question : <a href='mailto:caroline@carolinegerard.ca' class='text-gold hover:underline'>caroline@carolinegerard.ca</a>"
      className="text-center text-slate-600 text-xs mt-12"
    />
  </div>
  );
};

export default TermsPage;
