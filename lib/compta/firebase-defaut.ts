// Le pont Firebase du module compta. Le portage corrige le chemin vers le firebase.ts du site au premier port.
// Le squelette _vexel-base exporte app et db possiblement nuls (site sans configuration Firebase) : le module
// ne tourne que sur un site configuré, d'où l'assertion. Le site doit aussi exporter storage (getStorage(app)).
import { app as appSite, db as dbSite, storage as storageSite } from '../../firebase';

export const app = appSite!;
export const db = dbSite!;
export const storage = storageSite!;
