import React from 'react';
import { Eye, EyeOff, Images } from 'lucide-react';
import { VisibilitySettings } from '../../lib/firestore';

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

const ToggleRow = ({ label, description, checked, onChange }: ToggleRowProps) => (
  <div className="flex items-center justify-between gap-6 py-4 border-b border-white/5 last:border-0">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-xl transition-colors shrink-0 ${checked ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
        {checked ? <EyeOff size={16} /> : <Eye size={16} />}
      </div>
      <div>
        <p className="text-white font-bold text-sm">{label}</p>
        <p className="text-slate-500 text-xs mt-0.5">{description}</p>
      </div>
    </div>
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 ${
        checked ? 'bg-red-500/70' : 'bg-green-500/70'
      }`}
      aria-pressed={checked}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);

interface GroupProps { title: string; children: React.ReactNode }
const Group = ({ title, children }: GroupProps) => (
  <div className="bg-midnight/60 backdrop-blur-md rounded-2xl border border-white/10 px-6 py-2 mb-5">
    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest pt-4 pb-1">{title}</p>
    {children}
  </div>
);

// ── Slider row ────────────────────────────────────────────────────────────────

interface SliderRowProps {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: (v: number) => string;
  onChange: (v: number) => void;
}

const SliderRow = ({ label, description, value, min, max, step, display, onChange }: SliderRowProps) => (
  <div className="py-4 border-b border-white/5 last:border-0">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gold/10 text-gold shrink-0">
          <Images size={16} />
        </div>
        <div>
          <p className="text-white font-bold text-sm">{label}</p>
          <p className="text-slate-500 text-xs mt-0.5">{description}</p>
        </div>
      </div>
      <span className="text-gold font-bold text-sm ml-4 shrink-0">{display(value)}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={e => onChange(parseFloat(e.target.value))}
      className="w-full mt-1"
      style={{
        accentColor: '#C8A96E',
        height: 4,
        borderRadius: 9999,
        cursor: 'pointer',
      }}
    />
    <div className="flex justify-between text-slate-600 text-xs mt-1">
      <span>Petit</span>
      <span>Grand</span>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────

interface AdminVisibiliteProps {
  vis: VisibilitySettings;
  onSetVis: (key: keyof VisibilitySettings, value: boolean) => void;
  sphereImageScale: number;
  onSetSphereImageScale: (v: number) => void;
}

const AdminVisibilite = ({ vis, onSetVis, sphereImageScale, onSetSphereImageScale }: AdminVisibiliteProps) => {
  const t = (key: keyof VisibilitySettings) => (v: boolean) => onSetVis(key, v);

  return (
    <div className="max-w-2xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-white">Masquer / Afficher</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Activez un interrupteur pour masquer un élément du site public. La modification est immédiate.
          <span className="block mt-1 text-slate-600 text-xs">Vert = visible · Rouge = masqué</span>
        </p>
      </div>

      {/* ── Apparence — Galerie ── */}
      <Group title="Apparence — Galerie sphère (page Accueil)">
        <SliderRow
          label="Taille des photos"
          description="Ajuste la taille des photos flottantes dans la galerie sphère."
          value={sphereImageScale}
          min={0.10}
          max={0.90}
          step={0.01}
          display={v => `${Math.round((v / 0.42) * 100)} %`}
          onChange={onSetSphereImageScale}
        />
        <div className="py-3 border-t border-white/5">
          <p className="text-slate-500 text-xs flex items-center gap-2"><Images size={13} /> Gérez les photos dans <span className="text-gold font-bold">Médiathèque → Galerie Sphère</span></p>
        </div>
      </Group>

      {/* ── Pages complètes ── */}
      <Group title="Pages complètes (masque le lien et redirige vers l'accueil)">
        <ToggleRow label="À Propos" description="Masque la page /a-propos et son lien dans le menu." checked={vis.hidePageAPropos} onChange={t('hidePageAPropos')} />
        <ToggleRow label="Boutique" description="Masque la page /boutique et son lien dans le menu." checked={vis.hidePageBoutique} onChange={t('hidePageBoutique')} />
        <ToggleRow label="Événements" description="Masque la page /evenements et son lien dans le menu." checked={vis.hidePageEvenements} onChange={t('hidePageEvenements')} />
        <ToggleRow label="Interviews & Médias" description="Masque la page /interviews et son lien dans le menu." checked={vis.hidePageInterviews} onChange={t('hidePageInterviews')} />
        <ToggleRow label="Conférences" description="Masque la page /conferences et son lien dans le menu." checked={vis.hideConferences} onChange={t('hideConferences')} />
        <ToggleRow label="Blog" description="Masque la page /blog et son lien dans le menu." checked={vis.hidePageBlog} onChange={t('hidePageBlog')} />
        <ToggleRow label="Contact" description="Masque la page /contact et son lien dans le menu." checked={vis.hidePageContact} onChange={t('hidePageContact')} />
        <ToggleRow label="Espace client / Communauté" description="Masque la page /communaute et le bouton « Espace client » dans le menu." checked={vis.hideEspaceClient} onChange={t('hideEspaceClient')} />
      </Group>

      {/* ── Sections — Accueil ── */}
      <Group title="Sections — Page Accueil">
        <ToggleRow label="Section héros" description="Masque le grand bandeau d'introduction avec la photo et les boutons." checked={vis.hideHomeHero} onChange={t('hideHomeHero')} />
        <ToggleRow label="Bouton « Lire le blog »" description="Masque le bouton « Lire le blog » dans la section héros de l'Accueil." checked={vis.hideHomeLireLeBlog} onChange={t('hideHomeLireLeBlog')} />
        <ToggleRow label="Section mission" description="Masque le bloc « Une mission de cœur » avec les cartes Inspiration / Imaginaire." checked={vis.hideHomeMission} onChange={t('hideHomeMission')} />
        <ToggleRow label="Galerie photos" description="Masque la galerie de 6 photos sur la page Accueil. Chaque photo est modifiable individuellement via « Modifier le site »." checked={vis.hideHomeGallery} onChange={t('hideHomeGallery')} />
        <ToggleRow label="Section infolettre" description="Masque le formulaire d'abonnement à l'infolettre en bas de la page Accueil." checked={vis.hideHomeNewsletter} onChange={t('hideHomeNewsletter')} />
      </Group>

      {/* ── Sections — Contact ── */}
      <Group title="Sections — Page Contact">
        <ToggleRow label="Formulaire de contact" description="Masque la carte « Formulaire de contact » sur la page Contact. Utile pour tester avant publication." checked={vis.hideContactForm} onChange={t('hideContactForm')} />
      </Group>

      {/* ── Sections — À Propos ── */}
      <Group title="Sections — Page À Propos">
        <ToggleRow label="Section Caroline" description="Masque le bloc de présentation de l'auteure Caroline Gérard." checked={vis.hideAProposCaroline} onChange={t('hideAProposCaroline')} />
        <ToggleRow label="Section William" description="Masque le bloc de présentation de William Lorrain." checked={vis.hideAProposWilliam} onChange={t('hideAProposWilliam')} />
        <ToggleRow label="Section infolettre" description="Masque le formulaire d'abonnement à l'infolettre en bas de la page À Propos." checked={vis.hideAProposNewsletter} onChange={t('hideAProposNewsletter')} />
      </Group>

      {/* ── Éléments communs ── */}
      <Group title="Éléments communs">
        <ToggleRow
          label="Infolettre (pied de page)"
          description="Masque le formulaire d'abonnement à l'infolettre affiché dans le pied de page sur toutes les pages du site."
          checked={vis.hideFooterNewsletter}
          onChange={t('hideFooterNewsletter')}
        />
        <ToggleRow
          label="Bloc « Créer mon espace membre »"
          description="Masque le bouton et le texte d'invitation à créer un compte membre au bas de la section infolettre (Accueil et À Propos)."
          checked={vis.hideMemberCta}
          onChange={t('hideMemberCta')}
        />
      </Group>
    </div>
  );
};

export default AdminVisibilite;
