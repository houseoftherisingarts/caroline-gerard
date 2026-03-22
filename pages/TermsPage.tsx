import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { BookOpen, RotateCcw, Truck, Shield, Cookie, Scale, ChevronDown, ChevronUp } from 'lucide-react';

const Section = ({
  id,
  icon,
  title,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
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

const H3 = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-gold font-bold text-base mt-6 mb-2">{children}</h3>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-slate-300 text-sm leading-relaxed">{children}</p>
);

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

const TermsPage: React.FC = () => (
  <div className="min-h-screen pt-40 pb-20 px-6 md:px-12 max-w-4xl mx-auto">
    <Helmet>
      <title>Caroline Gérard | Conditions générales & Confidentialité</title>
      <meta name="description" content="Conditions générales de vente, politique de confidentialité (Loi 25), retours et délais de livraison." />
    </Helmet>

    {/* Header */}
    <div className="text-center mb-12">
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/20 text-gold mb-6">
        <Scale className="w-4 h-4" />
        <span className="text-xs font-bold uppercase tracking-widest">Documents légaux</span>
      </div>
      <h1 className="font-serif text-4xl md:text-5xl text-white mb-4">Conditions générales</h1>
      <p className="text-slate-400 max-w-xl mx-auto">
        Politique de confidentialité, conditions de vente, retours et délais de livraison pour{' '}
        <span className="text-gold font-semibold">unmilliondereves.com</span>.
      </p>
      <p className="text-slate-600 text-xs mt-4">Dernière mise à jour : mars 2026</p>
    </div>

    {/* Quick nav */}
    <nav className="flex flex-wrap gap-2 justify-center mb-10">
      {[
        ['#produit', 'Le livre'],
        ['#vente', 'Conditions de vente'],
        ['#retours', 'Retours'],
        ['#livraison', 'Livraison'],
        ['#confidentialite', 'Confidentialité'],
        ['#cookies', 'Cookies'],
        ['#droits', 'Propriété intellectuelle'],
      ].map(([href, label]) => (
        <a
          key={href}
          href={href}
          className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-400 text-xs font-bold hover:text-gold hover:border-gold/30 transition-all"
        >
          {label}
        </a>
      ))}
    </nav>

    <div className="space-y-4">
      {/* ── Le livre ── */}
      <Section id="produit" icon={<BookOpen className="w-5 h-5" />} title="Le livre — Mentions légales">
        <H3>Titre</H3>
        <Dl rows={[
          ['Titre complet', 'William et les univers invisibles – Quand les rêves prennent vie'],
          ['Format', '6 × 9 pouces'],
          ['Nombre de pages', '72'],
          ['Rédaction', 'Caroline Gérard et William Lorrain'],
          ['Accompagnement littéraire', 'Julie L\'Archer — legardiendephare.com'],
          ['Édition', 'Jérémy Parent'],
          ['Révision', 'Charles DuBois'],
          ['Couverture', 'Sonia Lapointe — Bulle Design & Événement'],
          ['Mise en page', 'Alejandro Natan'],
        ]} />
        <H3>Identifiants</H3>
        <Dl rows={[
          ['ISBN (Imprimé)', '978-2-925574-26-2'],
          ['ISBN (PDF)', '978-2-925574-27-9'],
          ['ISBN (ePUB)', '978-2-925574-28-6'],
        ]} />
        <H3>Éditeur / Responsable du site</H3>
        <P>Un Million de Rêves — unmilliondereves.com</P>
        <P>Courriel&nbsp;: <a href="mailto:caroline.gerard@live.ca" className="text-gold hover:underline">caroline.gerard@live.ca</a></P>
        <P>Responsable de la protection des renseignements personnels&nbsp;: Caroline Gérard</P>
      </Section>

      {/* ── Conditions de vente ── */}
      <Section id="vente" icon={<Scale className="w-5 h-5" />} title="Conditions générales de vente">
        <H3>Acceptation des conditions</H3>
        <P>
          Toute commande passée sur unmilliondereves.com implique l'acceptation pleine et entière des présentes
          conditions générales de vente. Ces conditions s'appliquent à l'exclusion de toutes autres conditions.
        </P>
        <H3>Prix</H3>
        <P>
          Les prix affichés sont en dollars canadiens (CAD) et s'entendent hors taxes. Les taxes applicables
          (TPS 5 % sur les livres et la livraison ; TVQ 9,975 % sur la livraison uniquement — les livres
          imprimés sont exonérés de TVQ au Québec) sont calculées et ajoutées lors du paiement.
        </P>
        <H3>Paiement</H3>
        <P>
          Les paiements sont traités de façon sécurisée par <strong className="text-white">Square</strong> (PCI-DSS).
          Nous n'avons jamais accès à vos informations de carte bancaire complètes.
          Les paiements sont acceptés en dollars canadiens uniquement.
        </P>
        <H3>Confirmation de commande</H3>
        <P>
          Un courriel de confirmation vous est envoyé après chaque achat. Il constitue la preuve de votre commande.
          Conservez-le précieusement.
        </P>
        <H3>Disponibilité</H3>
        <P>
          Les produits sont proposés dans la limite des stocks disponibles. En cas d'indisponibilité après
          passation de la commande, le client sera informé dans les meilleurs délais et pourra choisir entre
          un remboursement intégral ou un délai d'attente.
        </P>
      </Section>

      {/* ── Retours ── */}
      <Section id="retours" icon={<RotateCcw className="w-5 h-5" />} title="Retour de marchandise">
        <P>
          Les articles fournis par <strong className="text-white">unmilliondereves.com</strong> sont neufs et
          garantis sans défaut. S'il arrivait qu'un article soit défectueux ou ne corresponde pas à ce qui avait
          été commandé, <strong className="text-white">Un Million de Rêves</strong> s'engage à l'échanger ou à le
          rembourser, y compris les frais de port, dans les{' '}
          <strong className="text-white">10 jours suivant la date de livraison</strong>, à condition qu'il soit
          accompagné du bulletin de livraison ou d'une copie de la facture unmilliondereves.com.
        </P>
        <H3>Procédure</H3>
        <P>
          Pour initier un retour, veuillez contacter{' '}
          <a href="mailto:caroline.gerard@live.ca" className="text-gold hover:underline">caroline.gerard@live.ca</a>{' '}
          en indiquant votre numéro de commande et la raison du retour. Nous vous fournirons les instructions
          d'expédition.
        </P>
        <H3>État des articles retournés</H3>
        <P>
          Les articles doivent être retournés dans leur état d'origine, non utilisés et dans leur emballage
          d'origine. Tout article retourné endommagé ou incomplet ne pourra pas être remboursé.
        </P>
        <H3>Remboursement</H3>
        <P>
          Le remboursement sera effectué dans les 5 à 10 jours ouvrables suivant réception et vérification de
          l'article retourné, via le même mode de paiement utilisé lors de la commande.
        </P>
      </Section>

      {/* ── Livraison ── */}
      <Section id="livraison" icon={<Truck className="w-5 h-5" />} title="Délais de livraison">
        <P>
          Un délai de <strong className="text-white">deux jours ouvrables</strong> doit être alloué au traitement
          des commandes pour les produits en stock à notre entrepôt, auquel il faut ajouter :
        </P>
        <ul className="list-disc list-inside text-slate-300 text-sm space-y-1 ml-2">
          <li><strong className="text-white">1 à 3 jours ouvrables</strong> en moyenne pour une livraison standard au Québec</li>
          <li><strong className="text-white">1 jour ouvrable</strong> pour une livraison accélérée</li>
        </ul>
        <H3>Frais de livraison</H3>
        <P>
          Les frais de livraison sont de <strong className="text-white">6,00 $ CAD</strong> par commande
          (livraison standard au Canada). Les frais sont affichés lors du paiement.
        </P>
        <H3>Suivi</H3>
        <P>
          Un numéro de suivi vous sera communiqué par courriel dès l'expédition de votre commande.
          En cas de non-réception, veuillez nous contacter à{' '}
          <a href="mailto:caroline.gerard@live.ca" className="text-gold hover:underline">caroline.gerard@live.ca</a>.
        </P>
        <H3>Livraison internationale</H3>
        <P>
          La livraison est actuellement offerte au Canada uniquement. Pour toute demande de livraison
          internationale, veuillez nous contacter directement.
        </P>
      </Section>

      {/* ── Confidentialité (Loi 25) ── */}
      <Section id="confidentialite" icon={<Shield className="w-5 h-5" />} title="Politique de confidentialité — Loi 25 (Québec)">
        <P>
          La présente politique est conforme à la{' '}
          <strong className="text-white">Loi modernisant des dispositions législatives en matière de protection des renseignements personnels</strong>{' '}
          (Loi 25, Québec) et à la <em>Loi sur la protection des renseignements personnels dans le secteur privé</em> (LPRPSP).
        </P>

        <H3>Responsable de la protection des renseignements personnels</H3>
        <Dl rows={[
          ['Nom', 'Caroline Gérard'],
          ['Courriel', 'caroline.gerard@live.ca'],
          ['Site', 'unmilliondereves.com'],
        ]} />

        <H3>Renseignements collectés et finalités</H3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 pr-4 text-slate-400 font-medium">Renseignement</th>
                <th className="text-left py-2 pr-4 text-slate-400 font-medium">Finalité</th>
                <th className="text-left py-2 text-slate-400 font-medium">Rétention</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {[
                ['Adresse courriel (infolettre)', 'Envoi de l\'infolettre; notification d\'événements', 'Jusqu\'à désinscription'],
                ['Nom, adresse, courriel, téléphone (commande)', 'Traitement et livraison de la commande; reçu fiscal', '7 ans (obligations fiscales)'],
                ['Informations de carte bancaire', 'Paiement — traité par Square ; nous ne conservons aucune donnée bancaire', 'Non conservées'],
                ['Compte Google / courriel (communauté)', 'Accès à l\'espace membre, messagerie avec l\'auteure', 'Jusqu\'à suppression du compte'],
                ['Données analytiques (Firebase Analytics)', 'Statistiques de visite anonymisées — avec votre consentement uniquement', 'Agrégées, 14 mois'],
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

        <H3>Base légale du traitement</H3>
        <P>
          Le traitement repose sur l'exécution d'un contrat (commandes), votre consentement explicite
          (infolettre, analytics), et nos obligations légales (registres fiscaux).
        </P>

        <H3>Partage des renseignements</H3>
        <P>
          Vos renseignements personnels ne sont jamais vendus. Ils peuvent être partagés avec les sous-traitants
          suivants, uniquement aux fins décrites ci-dessus&nbsp;:
        </P>
        <ul className="list-disc list-inside text-slate-300 text-sm space-y-1 ml-2">
          <li><strong className="text-white">Square Inc.</strong> — traitement des paiements (États-Unis)</li>
          <li><strong className="text-white">Google LLC / Firebase</strong> — hébergement, base de données, authentification, analytique (États-Unis) — encadré par les clauses contractuelles types de l'UE</li>
          <li><strong className="text-white">Fournisseur SMTP (courriel)</strong> — envoi des reçus et infolettres</li>
        </ul>
        <P>
          Tout transfert de renseignements à l'extérieur du Québec fait l'objet d'une évaluation des facteurs
          relatifs à la vie privée (ÉFVP) conformément à la Loi 25.
        </P>

        <H3>Vos droits</H3>
        <P>Conformément à la Loi 25, vous disposez des droits suivants :</P>
        <ul className="list-disc list-inside text-slate-300 text-sm space-y-1 ml-2">
          <li><strong className="text-white">Accès</strong> — connaître les renseignements que nous détenons sur vous</li>
          <li><strong className="text-white">Rectification</strong> — corriger des renseignements inexacts ou incomplets</li>
          <li><strong className="text-white">Suppression</strong> — demander l'effacement de vos renseignements (sous réserve des obligations légales)</li>
          <li><strong className="text-white">Portabilité</strong> — recevoir une copie de vos données dans un format structuré</li>
          <li><strong className="text-white">Retrait du consentement</strong> — pour tout traitement basé sur votre consentement (infolettre, analytics)</li>
          <li><strong className="text-white">Désinscription</strong> — se désabonner de l'infolettre en tout temps via le lien inclus dans chaque courriel</li>
        </ul>
        <P>
          Pour exercer ces droits, contactez&nbsp;:{' '}
          <a href="mailto:caroline.gerard@live.ca" className="text-gold hover:underline">caroline.gerard@live.ca</a>.
          Nous répondrons dans un délai de <strong className="text-white">30 jours</strong>.
        </P>

        <H3>Sécurité</H3>
        <P>
          Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos
          renseignements personnels contre tout accès non autorisé, altération, divulgation ou destruction,
          notamment le chiffrement en transit (HTTPS/TLS), les règles de sécurité Firestore, et l'authentification
          à deux facteurs pour les accès administratifs.
        </P>

        <H3>Incidents de confidentialité</H3>
        <P>
          En cas d'incident de confidentialité présentant un risque de préjudice sérieux, nous notifierons la
          Commission d'accès à l'information du Québec (CAI) et les personnes concernées dans les délais prévus
          par la Loi 25.
        </P>
      </Section>

      {/* ── Cookies ── */}
      <Section id="cookies" icon={<Cookie className="w-5 h-5" />} title="Cookies et technologies de suivi">
        <P>
          Conformément à la Loi 25, nous vous demandons votre consentement <strong className="text-white">avant</strong>{' '}
          d'activer toute technologie de suivi non essentielle.
        </P>
        <H3>Cookies essentiels (sans consentement requis)</H3>
        <ul className="list-disc list-inside text-slate-300 text-sm space-y-1 ml-2">
          <li><code className="bg-white/5 px-1 rounded text-gold">_cg_visited</code> — sessionStorage, évite le comptage multiple de visiteurs par session</li>
          <li><code className="bg-white/5 px-1 rounded text-gold">_cg_consent</code> — localStorage, mémorise votre choix de consentement aux cookies analytiques</li>
          <li>Cookies Firebase Auth — nécessaires à l'authentification (espace membre)</li>
        </ul>
        <H3>Cookies analytiques (avec consentement)</H3>
        <ul className="list-disc list-inside text-slate-300 text-sm space-y-1 ml-2">
          <li><strong className="text-white">Firebase Analytics (Google)</strong> — mesure d'audience anonymisée (pages vues, ajouts au panier, conversions). Ces cookies ne sont activés qu'après votre acceptation via la bannière de consentement.</li>
        </ul>
        <H3>Modifier vos préférences</H3>
        <P>
          Vous pouvez retirer votre consentement aux cookies analytiques à tout moment en effaçant les données
          locales de votre navigateur pour ce site, ou en nous contactant à{' '}
          <a href="mailto:caroline.gerard@live.ca" className="text-gold hover:underline">caroline.gerard@live.ca</a>.
        </P>
      </Section>

      {/* ── Propriété intellectuelle ── */}
      <Section id="droits" icon={<BookOpen className="w-5 h-5" />} title="Propriété intellectuelle">
        <P>
          L'ensemble du contenu de ce site (textes, images, illustrations, photographies, logos, mise en page)
          est protégé par les droits d'auteur et demeure la propriété exclusive de Caroline Gérard,
          William Lorrain et leurs collaborateurs respectifs.
        </P>
        <P>
          Toute reproduction, représentation, modification, publication ou transmission de tout ou partie du
          contenu de ce site, par quelque moyen que ce soit, est interdite sans autorisation écrite préalable.
        </P>
        <H3>Marques</H3>
        <P>
          « Un Million de Rêves » et « William et les univers invisibles » sont des marques appartenant à
          leurs titulaires respectifs. Toute utilisation non autorisée est formellement interdite.
        </P>
        <H3>Droit applicable</H3>
        <P>
          Les présentes conditions sont régies par les lois en vigueur au Québec, Canada. Tout litige sera
          soumis aux tribunaux compétents du Québec.
        </P>
      </Section>
    </div>

    <p className="text-center text-slate-600 text-xs mt-12">
      Pour toute question : <a href="mailto:caroline.gerard@live.ca" className="text-gold hover:underline">caroline.gerard@live.ca</a>
    </p>
  </div>
);

export default TermsPage;
