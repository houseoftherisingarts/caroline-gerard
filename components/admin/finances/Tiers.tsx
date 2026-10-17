// Clients et fournisseurs du grand livre (collection `tiers`, distincte du CRM `clients`). Un tiers
// se crée à la main ou en une touche depuis un client déjà au dossier CRM.
import React, { useMemo, useState } from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
import { Panneau, Bouton, Champ, Selection, Vide, Chargement, useCollection, createDoc, removeDoc, COLLECTION_CLIENTS, type Language, type Client } from '../../../lib/compta/ancrage';
import type { Tiers as TiersType } from '../../../lib/compta/types';

interface Props {
  lang: Language;
}

const TEXTES = {
  FR: {
    titre: 'Tiers', sous: 'Les clients et fournisseurs qui reviennent dans vos transactions.',
    client: 'Client', fournisseur: 'Fournisseur', type: 'Type', nom: 'Nom', courriel: 'Courriel',
    ajouter: 'Ajouter un tiers', enregistrer: 'Ajouter', supprimer: 'Supprimer',
    vide: 'Aucun tiers', videTexte: 'Ajoutez un client ou un fournisseur, ou reprenez-en un depuis vos clients.',
    depuisClients: 'Depuis vos clients', aucunClient: 'Aucun client au dossier pour l\'instant.',
    reprendre: 'Ajouter aux tiers', dejaTiers: 'Déjà dans les tiers',
  },
  EN: {
    titre: 'Parties', sous: 'The clients and vendors that come back in your transactions.',
    client: 'Client', fournisseur: 'Vendor', type: 'Type', nom: 'Name', courriel: 'Email',
    ajouter: 'Add a party', enregistrer: 'Add', supprimer: 'Delete',
    vide: 'No parties yet', videTexte: 'Add a client or a vendor, or bring one over from your clients.',
    depuisClients: 'From your clients', aucunClient: 'No client on file yet.',
    reprendre: 'Add to parties', dejaTiers: 'Already a party',
  },
};

const Tiers: React.FC<Props> = ({ lang }) => {
  const t = TEXTES[lang];
  const { data: tiers, loading } = useCollection<TiersType>('tiers');
  const { data: clients } = useCollection<Client>(COLLECTION_CLIENTS);
  const [nom, setNom] = useState('');
  const [courriel, setCourriel] = useState('');
  const [type, setType] = useState<'client' | 'fournisseur'>('client');
  const [busy, setBusy] = useState(false);

  const nomsExistants = useMemo(() => new Set(tiers.map((tr) => tr.nom.toLowerCase())), [tiers]);
  const clientsAReprendre = clients.filter((c) => !nomsExistants.has(c.name.toLowerCase()));

  const ajouter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;
    setBusy(true);
    try {
      await createDoc<any>('tiers', { nom: nom.trim(), type, courriel: courriel.trim() || undefined }, { withTimestamp: false });
      setNom('');
      setCourriel('');
    } finally {
      setBusy(false);
    }
  };

  const reprendre = async (client: Client) => {
    await createDoc<any>('tiers', { nom: client.name, type: 'client', courriel: client.email || undefined }, { withTimestamp: false });
  };

  const supprimer = async (id: string) => {
    if (!window.confirm(t.supprimer + ' ?')) return;
    await removeDoc('tiers', id);
  };

  const parType = (v: 'client' | 'fournisseur') => tiers.filter((tr) => tr.type === v);

  return (
    <div className="space-y-4">
      <Panneau titre={t.ajouter}>
        <form onSubmit={ajouter} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <Champ label={t.nom} value={nom} onChange={(e) => setNom(e.target.value)} required className="sm:col-span-2" />
          <Selection label={t.type} value={type} onChange={(e) => setType(e.target.value as 'client' | 'fournisseur')}>
            <option value="client">{t.client}</option>
            <option value="fournisseur">{t.fournisseur}</option>
          </Selection>
          <Champ label={t.courriel} type="email" value={courriel} onChange={(e) => setCourriel(e.target.value)} />
          <Bouton type="submit" icone={Plus} disabled={busy} className="sm:col-span-4 sm:w-fit">{t.enregistrer}</Bouton>
        </form>
      </Panneau>

      {loading ? (
        <Panneau titre={t.titre}><Chargement /></Panneau>
      ) : tiers.length === 0 && clientsAReprendre.length === 0 ? (
        <Panneau titre={t.titre}><Vide titre={t.vide} texte={t.videTexte} /></Panneau>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panneau titre={t.client}>
            {parType('client').length === 0 ? (
              <p className="text-gris text-sm">{t.vide}</p>
            ) : (
              <ul className="divide-y divide-filet">
                {parType('client').map((tr) => (
                  <li key={tr.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-encre truncate">{tr.nom}</p>
                      {tr.courriel && <p className="text-[13px] text-gris truncate">{tr.courriel}</p>}
                    </div>
                    <button type="button" onClick={() => supprimer(tr.id)} aria-label={t.supprimer} className="w-9 h-9 inline-flex items-center justify-center text-gris hover:text-rose transition-colors flex-shrink-0">
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panneau>
          <Panneau titre={t.fournisseur}>
            {parType('fournisseur').length === 0 ? (
              <p className="text-gris text-sm">{t.vide}</p>
            ) : (
              <ul className="divide-y divide-filet">
                {parType('fournisseur').map((tr) => (
                  <li key={tr.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-encre truncate">{tr.nom}</p>
                      {tr.courriel && <p className="text-[13px] text-gris truncate">{tr.courriel}</p>}
                    </div>
                    <button type="button" onClick={() => supprimer(tr.id)} aria-label={t.supprimer} className="w-9 h-9 inline-flex items-center justify-center text-gris hover:text-rose transition-colors flex-shrink-0">
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panneau>
        </div>
      )}

      {clientsAReprendre.length > 0 && (
        <Panneau titre={t.depuisClients}>
          <ul className="divide-y divide-filet">
            {clientsAReprendre.map((c) => (
              <li key={c.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex items-center gap-2">
                  <Users className="w-4 h-4 text-gris flex-shrink-0" aria-hidden="true" />
                  <p className="text-sm text-encre truncate">{c.name}{c.organization ? `, ${c.organization}` : ''}</p>
                </div>
                <Bouton variante="secondaire" petit onClick={() => reprendre(c)} className="flex-shrink-0">{t.reprendre}</Bouton>
              </li>
            ))}
          </ul>
        </Panneau>
      )}
    </div>
  );
};

export default Tiers;
