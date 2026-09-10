/**
 * Le journal des changements du site de Caroline, tel qu'elle le lit dans son Espace Auteure.
 *
 * Il vit dans le code plutôt que dans Firestore : il part avec chaque déploiement, il porte
 * l'historique du dépôt, et personne ne peut l'effacer par mégarde depuis l'admin.
 *
 * RÈGLE DE TENUE : chaque journée de travail sur ce site ajoute son entrée EN TÊTE du tableau,
 * le jour même, avant de dire que la livraison est finie. Le texte s'adresse à Caroline, au
 * « tu », sans vocabulaire de programmeur : elle doit reconnaître ce qui a changé pour elle,
 * pas lire un rapport technique. Une journée déjà inscrite ne se récrit pas.
 */

export type EntreeJournal = {
  /** AAAA-MM-JJ, la journée de travail. */
  date: string;
  titre: string;
  /** Une ou deux phrases qui situent la journée. */
  intro: string;
  /** Ce qui a été fait, une phrase entière par étape. */
  etapes: string[];
};

export const JOURNAL: EntreeJournal[] = [
  {
    date: '2026-09-10',
    titre: 'Ton fil d’actualités, et le crayon qui te suit sur le site',
    intro: "Tu voulais publier depuis ton site plutôt que de toujours partir de Facebook, et tu voulais un endroit pour tes nouvelles. Les deux sont en ligne.",
    etapes: [
      "Un onglet Actualités est apparu dans ton Espace Auteure : tu y mets une photo, un titre, quelques lignes et un bouton facultatif vers une autre page de ton site, puis tu publies.",
      "La page Actualités du site montre tout ton fil, et les trois nouvelles les plus récentes montent d’elles-mêmes sur ta page d’accueil, sous le grand bandeau.",
      "Chaque nouvelle possède maintenant sa propre adresse, du genre carolinegerard.ca/actualites/salon-du-livre, ce qui la rend partageable toute seule.",
      "Sous chaque nouvelle, une rangée de boutons te laisse partager : la fenêtre de partage habituelle sur ton téléphone, avec Facebook et Messenger, puis le bouton Facebook, la copie du lien et la copie du texte sur l’ordinateur.",
      "Quand tu colles un de ces liens dans Facebook, ta photo et ton titre s’affichent tout seuls dans l’aperçu, comme lorsque tu partages un article de journal.",
      "Un crayon doré t’attend en bas à droite de ton site quand tu es connectée : tu cliques dessus et tu corriges n’importe quel texte ou n’importe quelle photo directement sur la vraie page, sans passer par l’aperçu de l’admin.",
      "Un vieux défaut a été réparé au passage : un texte modifiable placé dans un lien ouvrait la fenêtre de correction et changeait de page en même temps.",
      "Ce journal que tu lis a été bâti, et l’historique complet du projet y a été remonté depuis le premier jour.",
    ],
  },
  {
    date: '2026-09-06',
    titre: 'Les événements sur plusieurs jours, et les dates encore floues',
    intro: "Le Festival Western de Saint-Tite durait une semaine et tu devais changer la date chaque matin. Un lancement repoussé en 2027 n’avait pas encore de date du tout.",
    etapes: [
      "Un événement peut désormais couvrir une période : tu inscris le début et la fin, et la carte affiche « 13-20 sept 2026 » d’un seul coup.",
      "Une date peut aussi n’être qu’un mois ou qu’une année. L’événement se publie quand même et descend au bas de la liste, sous un petit trait « Dates à confirmer », jusqu’à ce que tu précises.",
      "Un décalage d’une journée qui faisait afficher certaines dates la veille a été corrigé sur la page Communauté, dans l’infolettre et dans les encarts.",
      "Le bouton « Demander un changement » est arrivé dans le menu de ton Espace Auteure, pour nous écrire sans sortir du site.",
      "Un mécanisme de déploiement automatique qui n’avait jamais fonctionné a été retiré, parce qu’il risquait de mettre en ligne du travail à moitié fini.",
    ],
  },
  {
    date: '2026-08-26',
    titre: 'Tes dépositaires au complet, et la fin des bouts de papier',
    intro: "Tu avais relevé plusieurs choses en utilisant l’onglet Dépositaires pour de vrai, et tes ventes de kiosque vivaient encore sur des feuilles volantes.",
    etapes: [
      "Tu peux maintenant cliquer sur n’importe quelle ligne de l’historique pour la corriger, que ce soit la date, le livre, la quantité ou le prix, sans rien supprimer.",
      "Chaque ligne montre de quel livre il s’agit, si bien que tu vois enfin ce que contenait chaque dépôt.",
      "Les lignes d’une même journée gardent l’ordre où tu les as inscrites, et deux petites flèches te laissent en monter ou en descendre une.",
      "Chaque carte de dépositaire affiche le nombre d’exemplaires de chaque titre encore en consigne chez lui.",
      "Un onglet Ventes & stock a été bâti pour remplacer tes papiers : tu inscris tes livres reçus, puis chaque vente avec son mode de paiement, son événement et le coût du kiosque s’il y en a un.",
      "Les sous que William reçoit en plus ont leur propre case et ne se mêlent plus à tes ventes.",
      "L’onglet calcule ton stock chez toi et en consigne, ton total annuel tous canaux confondus, et ce qui te reste par événement une fois le kiosque payé.",
    ],
  },
  {
    date: '2026-08-25',
    titre: 'Un réglage technique du côté serveur',
    intro: "Rien de visible sur ton site, mais une permission changée dans sa configuration.",
    etapes: [
      "Une autorisation a été ouverte pour que ton site puisse s’afficher en direct dans une fenêtre du portfolio de Vexel plutôt qu’en simple capture d’écran.",
    ],
  },
  {
    date: '2026-07-28',
    titre: 'Des pages qui s’ouvrent plus vite',
    intro: "Tes photos partaient à leur taille d’origine vers chaque visiteur, ce qui pesait lourd sur un cellulaire.",
    etapes: [
      "Toutes les images du site passent maintenant par un service qui les redimensionne et les allège avant de les envoyer, sans que tu changes quoi que ce soit à ta façon de téléverser.",
      "Une rangée d’essai qui traînait dans tes contacts a été retirée.",
      "La réponse à tes deux demandes du mois t’a été envoyée, avec une proposition d’appel pour peaufiner ensemble.",
    ],
  },
  {
    date: '2026-07-27',
    titre: 'Tes dépositaires, le tome 2 en libre-service, et une grande passe de sécurité',
    intro: "Tu voulais suivre tes livres en consigne chez Zélia, Magie-Lune et Aux Cinq Soeurs, et pouvoir repousser toi-même la sortie du tome 2. Le site a aussi reçu la même vérification de sécurité que nos autres projets.",
    etapes: [
      "Le bloc du tome 2 dans la boutique est devenu modifiable par toi : l’étiquette, la date de sortie et le mot en dessous se changent depuis Inventaire Livres, et c’est en ligne aussitôt.",
      "L’onglet Dépositaires a été bâti, avec un pourcentage de commission par commerce que tu inscris toi-même, et qui reste figé sur les ventes déjà passées si tu changes le taux plus tard.",
      "Tu y notes tes dépôts, tes ventes, tes retours et les paiements reçus, et le tableau calcule ce qu’il te reste à chaque endroit et ce qui doit te revenir.",
      "Les règles de ta base de données ont été récrites au complet : les coordonnées de tes prospects, les paniers abandonnés avec leur adresse, ton journal de courriels et tes factures étaient lisibles par n’importe qui, et ta boutique était modifiable de l’extérieur.",
      "L’envoi de ton infolettre et de tes messages était ouvert à tout le monde, ce qui permettait à un inconnu d’envoyer du courrier signé de ton adresse. Les deux sont maintenant réservés à ton compte.",
      "La caisse recharge les prix depuis la base plutôt que de croire ce que le navigateur lui envoie, et la livraison de 6 $ se compte par exemplaire : tu la perdais sur les commandes de plusieurs livres.",
      "Un défaut avalé en silence empêchait l’enregistrement des membres inscrits par courriel, et il a été corrigé.",
      "La mise en forme du site est maintenant compilée au moment de la construction, si bien que tes pages ne dépendent plus d’un service extérieur pour s’afficher correctement.",
      "Seize passages en italique ont été retirés du design public, et le bandeau des témoins ne passe plus par-dessus ton panier.",
    ],
  },
  {
    date: '2026-06-04',
    titre: 'Le compteur de visiteurs et la chaîne des courriels',
    intro: "Tu voulais savoir combien de personnes passent, et il fallait s’assurer que chaque courriel du site part vraiment.",
    etapes: [
      "Un compteur de visiteurs uniques a été bâti. Il compte une même personne une seule fois et ne conserve jamais son adresse réseau, comme la Loi 25 l’exige.",
      "Toute la chaîne de courriels a été vérifiée de bout en bout : le reçu de commande, l’avis qui te prévient d’une vente, le formulaire de contact, le message direct à un membre et l’infolettre.",
      "Les témoignages et l’inventaire de l’Espace Auteure ont été retravaillés, avec la galerie en sphère et la boutique.",
      "Le moteur qui fait tourner les fonctions du site est passé à sa version suivante, avant que l’ancienne cesse d’être entretenue.",
    ],
  },
  {
    date: '2026-05-18',
    titre: 'Le livre en trois dimensions, et la copie de sûreté du projet',
    intro: "Une grosse journée de contenu, versée d’un coup, avec la mise à l’abri de tout le projet.",
    etapes: [
      "Ton livre est devenu un objet en trois dimensions que le visiteur peut faire tourner, avec une fenêtre qui le fait feuilleter page par page.",
      "La galerie en arc a été bâtie pour la page d’accueil.",
      "La caisse a été refaite et les champs modifiables du site se sont étendus.",
      "Tout le projet a été versé sur GitHub, ce qui lui donne un historique complet et une copie de sûreté hors de l’ordinateur.",
    ],
  },
  {
    date: '2026-03-22',
    titre: 'À propos, l’écriture riche, l’infolettre, et le site sur le téléphone',
    intro: "La journée la plus dense du démarrage.",
    etapes: [
      "La page À propos a été créée.",
      "L’éditeur de texte est devenu riche : gras, italique, tailles et vrais paragraphes se posent directement dans la page.",
      "Le téléversement de photos dans la médiathèque a été refait au complet, et le deuxième livre a pris sa place dans la boutique du même coup.",
      "L’infolettre est née, avec son formulaire d’abonnement, la fenêtre qui te sert à composer l’envoi, et la page Communauté où tes abonnés atterrissent.",
      "Le bandeau des témoins est apparu, le reçu de commande a été bâti et la caisse a gagné en solidité.",
      "Tout le site a été repassé page par page pour le téléphone, ton Espace Auteure et son menu compris.",
    ],
  },
  {
    date: '2026-03-20',
    titre: 'L’entrée dans les étoiles',
    intro: "Le premier écran que voit un visiteur qui arrive chez toi.",
    etapes: [
      "L’écran d’ouverture animé a été bâti : ton nom qui se lève dans les étoiles, puis le bouton Entrer qui fond vers le site.",
    ],
  },
  {
    date: '2026-03-19',
    titre: 'La porte de ton Espace Auteure, et les images des articles',
    intro: "L’admin est passé du décor au véritable outil, avec une vraie serrure.",
    etapes: [
      "La connexion se fait maintenant avec un compte et un mot de passe véritables plutôt qu’avec un code écrit dans la page.",
      "Ton kanban et tes factures se sauvegardent dans la base de données, donc plus rien ne se perd quand tu fermes l’onglet.",
      "Les règles de l’entrepôt de photos ont été posées.",
      "Les cartes du blogue et des événements vont chercher la première image de l’article quand aucune photo de couverture n’est choisie.",
      "La mesure d’audience a été branchée pour que les visites se comptent.",
    ],
  },
  {
    date: '2026-03-16',
    titre: 'Le jour où la maquette est devenue ton site',
    intro: "Le point de départ du projet. Tout ce qui existait en maquette a été rebâti en vrai site branché sur une base de données.",
    etapes: [
      "Les pages publiques ont été montées : l’accueil, la boutique, le blogue, les événements, les conférences, les interviews et le contact.",
      "Ton Espace Auteure a reçu ses premiers onglets, du tableau de bord aux commandes, en passant par les factures, le blogue, les événements, les conférences, les interviews, la médiathèque, l’inventaire, le kanban et le Studio social.",
      "Le mode « Modifier le site » est né : tu cliques sur un texte de ton site et tu le récris toi-même.",
      "Les photos que tu téléverses ont quitté la mémoire du navigateur pour être rangées dans un entrepôt permanent.",
      "Un défaut de l’éditeur de blocs qui faisait clignoter le texte et bloquait la frappe a été corrigé.",
      "Le mode de modification, d’abord limité à l’accueil, a été étendu à toutes les pages publiques et au pied de page.",
    ],
  },
];

/** Le nombre d’étapes livrées depuis le début, pour l’en-tête du journal. */
export const nombreEtapes = (): number => JOURNAL.reduce((n, e) => n + e.etapes.length, 0);
