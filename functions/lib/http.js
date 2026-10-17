"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pageWebhook = pageWebhook;
/**
 * Page rendue quand quelqu'un OUVRE l'adresse d'un webhook dans un navigateur (GET). Un webhook ne
 * reçoit que des POST signés par la plateforme qui l'appelle; cette page le dit en clair au lieu
 * d'un « POST only » blanc, et redit où l'adresse se colle.
 */
function pageWebhook(res, nomFonction, plateforme, ouColler) {
    res.status(405).set('Content-Type', 'text/html; charset=utf-8').send(`<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>Webhook ${plateforme} · Caroline Gérard</title>
<meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#F7F4EE;color:#1A1A1E;font:16px/1.6 Figtree,system-ui,sans-serif}
main{max-width:560px;padding:32px 24px}h1{font:500 26px/1.2 'Playfair Display',Georgia,serif;margin:0 0 16px}p{margin:0 0 12px}code{background:#fff;border:1px solid #e3ded4;border-radius:6px;padding:2px 6px;font-size:14px;word-break:break-all}</style></head>
<body><main><h1>Ce point de terminaison fonctionne.</h1>
<p>Il reçoit les événements que <strong>${plateforme}</strong> lui envoie en POST, signés. Il n'y a rien à voir dans un navigateur.</p>
<p>Collez cette adresse dans ${ouColler} :</p><p><code>https://${res.req?.get('host') || ''}/${nomFonction}</code></p></main></body></html>`);
}
//# sourceMappingURL=http.js.map