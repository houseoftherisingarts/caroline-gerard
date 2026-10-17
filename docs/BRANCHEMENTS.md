# Branchements du site Caroline Gérard

## Comptabilité

L'Espace Auteure contient deux écrans de comptabilité, Factures et Finances. Ils remplacent l'ancien créateur de facture. Factures sert aux devis, aux factures et aux notes de crédit. Finances garde les revenus, les dépenses, la TPS et la TVQ, les rapports et le paquet pour le comptable.

La facture L-0122 a été copiée dans le nouveau module avec son numéro. L'ancienne collection `invoices` reste intacte. Le script `scripts/migrer-factures.mjs` se relance sans créer de doublon.

Chaque ligne d'une facture choisit ses taxes. Un livre ne porte que la TPS, le transport porte la TPS et la TVQ. Les taux se modifient dans les réglages de facturation.

Les fonctions serveur sont déployées avec des secrets provisoires valant `A_REMPLIR`. Tant que les vraies valeurs manquent, l'envoi par courriel et le paiement par carte ne fonctionnent pas. Les relances automatiques et les envois récurrents sont éteints.

### Gestes d'Alex

1. Créer une clé Resend et vérifier le domaine carolinegerard.ca chez Resend.
2. Poser la clé avec `firebase functions:secrets:set RESEND_API_KEY --project carolinegerard-99f5d`.
3. Créer les clés Stripe de Caroline, puis les poser avec `STRIPE_SECRET_KEY_CAROLINE` et `STRIPE_WEBHOOK_SECRET_CAROLINE`.
4. Dans Stripe, ajouter le webhook `https://northamerica-northeast1-carolinegerard-99f5d.cloudfunctions.net/webhookStripeCaroline` pour l'événement `checkout.session.completed`.
5. Redéployer avec `firebase deploy --only functions --project carolinegerard-99f5d`.
