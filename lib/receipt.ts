export interface ReceiptData {
  orderId: string;
  date: string;
  customerName: string;
  email: string;
  address: string;
  items: { title: string; price: number; quantity: number }[];
  subtotal: number;
  discount?: number;
  discountPct?: number;
  delivery: number;
  tps: number;
  tvq: number;
  total: number;
}

export function printReceipt(data: ReceiptData): void {
  const win = window.open('', '_blank', 'width=820,height=1000,scrollbars=yes');
  if (!win) {
    alert('Veuillez autoriser les fenêtres pop-up pour télécharger ton reçu.');
    return;
  }
  win.document.write(buildReceiptHtml(data));
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

function buildReceiptHtml(data: ReceiptData): string {
  const dateStr = new Date(data.date).toLocaleDateString('fr-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const itemRows = data.items
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #eee;">${item.title}</td>
          <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
          <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;">${(item.price * item.quantity).toFixed(2)} $</td>
        </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Reçu ${data.orderId}</title>
  <style>
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
    }
    body {
      font-family: Arial, sans-serif;
      background: #fff;
      color: #333;
      max-width: 760px;
      margin: 0 auto;
      padding: 40px 32px;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #C8A96E;
      padding-bottom: 24px;
      margin-bottom: 32px;
    }
    .header h1 { font-family: Georgia, serif; color: #C8A96E; font-size: 32px; margin: 0; }
    .header p { color: #888; margin: 6px 0 0; font-size: 14px; letter-spacing: 2px; text-transform: uppercase; }
    .meta table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
    .meta td { padding: 5px 0; font-size: 14px; }
    .meta td:last-child { text-align: right; font-weight: bold; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .items-table thead tr { border-bottom: 2px solid #C8A96E; }
    .items-table th { padding: 8px 0; font-size: 13px; color: #555; text-transform: uppercase; letter-spacing: 1px; }
    .items-table th:last-child, .items-table td:last-child { text-align: right; }
    .items-table th:nth-child(2), .items-table td:nth-child(2) { text-align: center; }
    .totals { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
    .totals td { padding: 5px 0; font-size: 14px; }
    .totals td:last-child { text-align: right; }
    .totals .grand-total td {
      border-top: 2px solid #C8A96E;
      padding-top: 12px;
      font-size: 18px;
      font-weight: bold;
      color: #C8A96E;
    }
    .footer { text-align: center; color: #888; font-size: 13px; border-top: 1px solid #eee; padding-top: 24px; }
    .print-btn {
      display: block;
      margin: 0 auto 32px;
      background: #C8A96E;
      color: #fff;
      border: none;
      padding: 12px 32px;
      font-size: 15px;
      border-radius: 8px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <button class="no-print print-btn" onclick="window.print()">Imprimer / Enregistrer en PDF</button>

  <div class="header">
    <h1>Caroline Gérard</h1>
    <p>Reçu officiel de commande</p>
  </div>

  <div class="meta">
    <table>
      <tr><td style="color:#888;">N° de commande</td><td>${data.orderId}</td></tr>
      <tr><td style="color:#888;">Date</td><td>${dateStr}</td></tr>
      <tr><td style="color:#888;">Client</td><td>${data.customerName}</td></tr>
      <tr><td style="color:#888;">Courriel</td><td>${data.email}</td></tr>
      <tr><td style="color:#888;">Adresse de livraison</td><td>${data.address}</td></tr>
    </table>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th style="text-align:left;">Article</th>
        <th>Qté</th>
        <th>Montant</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <table class="totals">
    <tr><td>Sous-total</td><td>${data.subtotal.toFixed(2)} $</td></tr>
    ${data.discount && data.discount > 0 ? `<tr style="color:#4ade80;"><td>Réduction (${data.discountPct}%)</td><td>−${data.discount.toFixed(2)} $</td></tr>` : ''}
    <tr><td>Livraison</td><td>${data.delivery.toFixed(2)} $</td></tr>
    <tr><td>TPS (5%)</td><td>${data.tps.toFixed(2)} $</td></tr>
    <tr><td>TVQ (9,975% sur livraison)</td><td>${data.tvq.toFixed(2)} $</td></tr>
    <tr class="grand-total"><td>TOTAL CAD</td><td>${data.total.toFixed(2)} $</td></tr>
  </table>

  <div class="footer">
    <p>Merci pour ta commande! Ton livre sera expédié sous 3 à 5 jours ouvrables.</p>
    <p style="margin-top:8px;">Questions? <a href="mailto:caroline@carolinegerard.ca" style="color:#C8A96E;">caroline@carolinegerard.ca</a></p>
    <p style="margin-top:16px;font-size:11px;color:#ccc;">Ce reçu fait foi de paiement. Paiement traité de façon sécurisée par Square.</p>
  </div>
</body>
</html>`;
}
