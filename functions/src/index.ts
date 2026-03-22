import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { defineSecret, defineString } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { SquareClient, SquareEnvironment } from 'square';
import * as nodemailer from 'nodemailer';
import { randomUUID } from 'crypto';

initializeApp();
const db = getFirestore();

// Secrets (set via: firebase functions:secrets:set SECRET_NAME)
const squareAccessToken = defineSecret('SQUARE_ACCESS_TOKEN');
const emailUser = defineSecret('EMAIL_USER');
const emailPass = defineSecret('EMAIL_PASS');

// Config strings (set in functions/.env or firebase.json)
const squareEnvironment = defineString('SQUARE_ENVIRONMENT', { default: 'sandbox' });
const squareLocationId = defineString('SQUARE_LOCATION_ID');
const emailHost = defineString('EMAIL_HOST', { default: 'smtp.gmail.com' });

// Server-side pricing constants (source of truth — never trust client prices)
const DELIVERY_FEE = 6.00;
const TPS_RATE = 0.05;
const TVQ_RATE = 0.09975;

interface CartItemPayload {
  title: string;
  price: number;
  quantity: number;
}

interface CheckoutPayload {
  sourceId: string;
  sessionId?: string;
  cartItems: CartItemPayload[];
  customer: {
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  shipping: {
    address: string;
    city: string;
    postalCode: string;
  };
}

export const processCheckout = onCall(
  {
    region: 'northamerica-northeast1',
    secrets: [squareAccessToken, emailUser, emailPass],
  },
  async (request) => {
    const { sourceId, sessionId, cartItems, customer, shipping } = request.data as CheckoutPayload;

    if (!sourceId || !customer?.email || !cartItems?.length) {
      throw new HttpsError('invalid-argument', 'Données de commande incomplètes.');
    }

    // ── 1. Recalculate totals server-side ──────────────────────────────────
    const subtotal = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    // Books are zero-rated for TVQ in Quebec; TPS applies to everything.
    const tps = parseFloat(((subtotal + DELIVERY_FEE) * TPS_RATE).toFixed(2));
    const tvq = parseFloat((DELIVERY_FEE * TVQ_RATE).toFixed(2));
    const grandTotal = parseFloat((subtotal + DELIVERY_FEE + tps + tvq).toFixed(2));
    const amountInCents = BigInt(Math.round(grandTotal * 100));

    // ── 2. Charge via Square ───────────────────────────────────────────────
    const squareClient = new SquareClient({
      token: squareAccessToken.value(),
      environment:
        squareEnvironment.value() === 'production'
          ? SquareEnvironment.Production
          : SquareEnvironment.Sandbox,
    });

    let squarePaymentId: string;
    try {
      const response = await squareClient.payments.create({
        sourceId,
        locationId: squareLocationId.value(),
        idempotencyKey: randomUUID(),
        amountMoney: { amount: amountInCents, currency: 'CAD' },
        buyerEmailAddress: customer.email,
        shippingAddress: {
          addressLine1: shipping.address,
          locality: shipping.city,
          postalCode: shipping.postalCode,
          country: 'CA',
        },
        note: cartItems.map((i) => `${i.quantity}× ${i.title}`).join(', '),
      });

      if (!response.payment?.id) {
        throw new Error('No payment ID returned by Square');
      }
      squarePaymentId = response.payment.id;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Échec du paiement Square.';
      throw new HttpsError('internal', msg);
    }

    // ── 3. Persist order to Firestore ──────────────────────────────────────
    const orderId = `CMD-${Date.now()}`;
    const now = new Date().toISOString();
    const order = {
      id: orderId,
      squarePaymentId,
      customerName: `${customer.firstName} ${customer.lastName}`,
      email: customer.email,
      phone: customer.phone ?? '',
      address: `${shipping.address}, ${shipping.city} ${shipping.postalCode}`,
      items: cartItems,
      subtotal,
      delivery: DELIVERY_FEE,
      tps,
      tvq,
      total: grandTotal,
      status: 'Payé',
      date: now,
    };

    await db.collection('orders').doc(orderId).set(order as FirebaseFirestore.DocumentData);

    // ── 4. Remove the abandoned checkout record (payment succeeded) ────────
    if (sessionId) {
      await db.collection('abandonedCheckouts').doc(sessionId).delete().catch(() => null);
    }

    // ── 5. Send receipt email (non-blocking) ───────────────────────────────
    try {
      const transporter = nodemailer.createTransport({
        host: emailHost.value(),
        port: 587,
        secure: false,
        auth: { user: emailUser.value(), pass: emailPass.value() },
      });
      await transporter.sendMail({
        from: `"Caroline Gérard" <${emailUser.value()}>`,
        to: customer.email,
        subject: `Votre reçu de commande ${orderId}`,
        html: buildEmailHtml(order as OrderRecord, cartItems),
      });
    } catch (emailErr) {
      // Email failure must not cancel a successful payment
      console.error('Email receipt failed (non-blocking):', emailErr);
    }

    // ── 6. Return confirmation to frontend ─────────────────────────────────
    return {
      success: true,
      orderId,
      customerName: order.customerName,
      total: grandTotal,
      subtotal,
      delivery: DELIVERY_FEE,
      tps,
      tvq,
      date: now,
    };
  }
);

// ── Email HTML builder ───────────────────────────────────────────────────────

interface OrderRecord {
  id: string;
  date: string;
  customerName: string;
  address: string;
  subtotal: number;
  delivery: number;
  tps: number;
  tvq: number;
  total: number;
}

// ── Transporter factory (reusable) ───────────────────────────────────────────

function makeTransporter() {
  return nodemailer.createTransport({
    host: emailHost.value(),
    port: 587,
    secure: false,
    auth: { user: emailUser.value(), pass: emailPass.value() },
  });
}

// ── Newsletter notification helpers ──────────────────────────────────────────

async function notifySubscribers(subject: string, htmlContent: string): Promise<void> {
  const snap = await db.collection('subscribers').get();
  if (snap.empty) return;
  const emails = snap.docs.map(d => (d.data() as { email: string }).email).filter(Boolean);
  if (emails.length === 0) return;
  const transporter = makeTransporter();
  // BCC all subscribers in batches of 50
  for (let i = 0; i < emails.length; i += 50) {
    const batch = emails.slice(i, i + 50);
    await transporter.sendMail({
      from: `"Caroline Gérard" <${emailUser.value()}>`,
      bcc: batch.join(','),
      subject,
      html: htmlContent,
    });
  }
}

function notificationHtml(type: string, title: string, description: string, link?: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
    <div style="background:#0f0f23;padding:36px 32px;text-align:center;">
      <h1 style="color:#C8A96E;font-size:28px;margin:0;font-family:Georgia,serif;">Caroline Gérard</h1>
      <p style="color:#888;margin:8px 0 0;letter-spacing:2px;font-size:12px;text-transform:uppercase;">${type}</p>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#0f0f23;font-size:22px;margin:0 0 16px;">${title}</h2>
      <p style="color:#555;font-size:15px;line-height:1.6;">${description}</p>
      ${link ? `<div style="text-align:center;margin-top:28px;"><a href="${link}" style="background:#C8A96E;color:#0f0f23;padding:14px 32px;border-radius:8px;font-weight:bold;text-decoration:none;font-size:15px;">Lire la suite</a></div>` : ''}
    </div>
    <div style="background:#f0f0f0;padding:16px;text-align:center;font-size:11px;color:#aaa;">
      © 2026 Caroline Gérard — Vous recevez ce courriel car vous êtes abonné(e) à la communauté des rêveurs.
    </div>
  </div>
</body>
</html>`;
}

// ── sendNewsletter callable — triggered manually from the admin UI ────────────
// (replaces the automatic onPostPublished / onEventPublished triggers so the
//  admin can customise the subject, body and image before sending)

function buildNewsletterHtml(title: string, bodyText: string, imageUrl?: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
    <div style="background:#0f0f23;padding:36px 32px;text-align:center;">
      <h1 style="color:#C8A96E;font-size:28px;margin:0;font-family:Georgia,serif;">Caroline Gérard</h1>
      <p style="color:#888;margin:8px 0 0;letter-spacing:2px;font-size:12px;text-transform:uppercase;">Infolettre</p>
    </div>
    ${imageUrl ? `<img src="${imageUrl}" alt="" style="width:100%;max-height:300px;object-fit:cover;display:block;" />` : ''}
    <div style="padding:32px;">
      <h2 style="color:#0f0f23;font-size:22px;margin:0 0 16px;font-family:Georgia,serif;">${title}</h2>
      <p style="color:#555;font-size:15px;line-height:1.7;white-space:pre-wrap;">${bodyText}</p>
    </div>
    <div style="background:#f0f0f0;padding:16px;text-align:center;font-size:11px;color:#aaa;">
      © 2026 Caroline Gérard &nbsp;·&nbsp; Vous recevez ce courriel car vous êtes abonné(e) à la communauté des rêveurs.
    </div>
  </div>
</body>
</html>`;
}

export const sendNewsletter = onCall(
  {
    region: 'northamerica-northeast1',
    secrets: [emailUser, emailPass],
  },
  async (request) => {
    const { subject, title, bodyText, imageUrl } = request.data as {
      subject: string;
      title: string;
      bodyText: string;
      imageUrl?: string;
    };

    if (!subject?.trim() || !title?.trim() || !bodyText?.trim()) {
      throw new HttpsError('invalid-argument', 'Sujet, titre et texte sont requis.');
    }

    const snap = await db.collection('subscribers').get();
    if (snap.empty) return { success: true, sent: 0 };

    const emails = snap.docs
      .map(d => (d.data() as { email: string }).email)
      .filter(Boolean);
    if (emails.length === 0) return { success: true, sent: 0 };

    const html = buildNewsletterHtml(title, bodyText, imageUrl);
    const transporter = makeTransporter();

    for (let i = 0; i < emails.length; i += 50) {
      const batch = emails.slice(i, i + 50);
      await transporter.sendMail({
        from: `"Caroline Gérard" <${emailUser.value()}>`,
        bcc: batch.join(','),
        subject,
        html,
      });
    }

    return { success: true, sent: emails.length };
  }
);

export const onConferencePublished = onDocumentWritten(
  {
    document: 'conferences/{confId}',
    region: 'northamerica-northeast1',
    secrets: [emailUser, emailPass],
  },
  async (event) => {
    const before = event.data?.before?.data() as { isPublished?: boolean; title?: string; description?: string } | undefined;
    const after = event.data?.after?.data() as { isPublished?: boolean; title?: string; description?: string } | undefined;
    if (!after?.isPublished || before?.isPublished === true) return;
    await notifySubscribers(
      `Nouvelle conférence : ${after.title}`,
      notificationHtml('Nouvelle conférence', after.title ?? '', after.description ?? '')
    );
  }
);

// ── sendDirectMessage callable ────────────────────────────────────────────────

export const sendDirectMessage = onCall(
  {
    region: 'northamerica-northeast1',
    secrets: [emailUser, emailPass],
  },
  async (request) => {
    const { recipients, subject, body } = request.data as {
      recipients: string[];
      subject: string;
      body: string;
    };

    if (!recipients?.length || !subject || !body) {
      throw new HttpsError('invalid-argument', 'Données incomplètes.');
    }

    const transporter = makeTransporter();
    const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;">
    <div style="background:#0f0f23;padding:28px 32px;text-align:center;">
      <h1 style="color:#C8A96E;font-size:26px;margin:0;font-family:Georgia,serif;">Caroline Gérard</h1>
    </div>
    <div style="padding:32px;">
      <pre style="font-family:Arial,sans-serif;font-size:15px;color:#333;line-height:1.7;white-space:pre-wrap;">${body}</pre>
    </div>
    <div style="background:#f0f0f0;padding:14px;text-align:center;font-size:11px;color:#aaa;">© 2026 Caroline Gérard</div>
  </div>
</body>
</html>`;

    for (let i = 0; i < recipients.length; i += 50) {
      const batch = recipients.slice(i, i + 50);
      await transporter.sendMail({
        from: `"Caroline Gérard" <${emailUser.value()}>`,
        bcc: batch.join(','),
        subject,
        html,
      });
    }

    return { success: true, sent: recipients.length };
  }
);

function buildEmailHtml(order: OrderRecord, items: CartItemPayload[]): string {
  const o = order;

  const dateStr = new Date(o.date).toLocaleDateString('fr-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const rows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;">${item.title}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;">${(item.price * item.quantity).toFixed(2)} $</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>Reçu ${o.id}</title></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">

    <div style="background:#0f0f23;padding:36px 32px;text-align:center;">
      <h1 style="color:#C8A96E;font-size:30px;margin:0;font-family:Georgia,serif;">Caroline Gérard</h1>
      <p style="color:#888;margin:8px 0 0;letter-spacing:2px;font-size:12px;text-transform:uppercase;">Reçu de commande</p>
    </div>

    <div style="padding:32px;">
      <table style="width:100%;border-collapse:collapse;margin-bottom:28px;font-size:14px;">
        <tr><td style="padding:4px 0;color:#888;">N° de commande</td><td style="text-align:right;font-weight:bold;">${o.id}</td></tr>
        <tr><td style="padding:4px 0;color:#888;">Date</td><td style="text-align:right;">${dateStr}</td></tr>
        <tr><td style="padding:4px 0;color:#888;">Client</td><td style="text-align:right;">${o.customerName}</td></tr>
        <tr><td style="padding:4px 0;color:#888;">Livraison à</td><td style="text-align:right;">${o.address}</td></tr>
      </table>

      <table style="width:100%;border-collapse:collapse;border-top:2px solid #C8A96E;margin-bottom:24px;font-size:14px;">
        <thead>
          <tr style="background:#faf8f3;">
            <th style="padding:10px 12px;text-align:left;color:#555;">Article</th>
            <th style="padding:10px 12px;text-align:center;color:#555;">Qté</th>
            <th style="padding:10px 12px;text-align:right;color:#555;">Montant</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:28px;">
        <tr><td style="padding:4px 0;color:#888;">Sous-total</td><td style="text-align:right;">${o.subtotal.toFixed(2)} $</td></tr>
        <tr><td style="padding:4px 0;color:#888;">Livraison</td><td style="text-align:right;">${o.delivery.toFixed(2)} $</td></tr>
        <tr><td style="padding:4px 0;color:#888;">TPS (5%)</td><td style="text-align:right;">${o.tps.toFixed(2)} $</td></tr>
        <tr><td style="padding:4px 0;color:#888;">TVQ (9,975% sur livraison)</td><td style="text-align:right;">${o.tvq.toFixed(2)} $</td></tr>
        <tr style="border-top:2px solid #C8A96E;">
          <td style="padding:14px 0 0;font-weight:bold;font-size:18px;">TOTAL</td>
          <td style="padding:14px 0 0;text-align:right;font-weight:bold;font-size:18px;color:#C8A96E;">${o.total.toFixed(2)} $</td>
        </tr>
      </table>

      <div style="background:#f9f6f0;border-radius:8px;padding:18px;text-align:center;">
        <p style="margin:0;color:#555;font-size:14px;">Merci pour votre commande! Votre livre sera expédié sous 3 à 5 jours ouvrables.</p>
        <p style="margin:10px 0 0;color:#999;font-size:12px;">
          Questions? <a href="mailto:caroline.gerard@live.ca" style="color:#C8A96E;text-decoration:none;">caroline.gerard@live.ca</a>
        </p>
      </div>
    </div>

    <div style="background:#f0f0f0;padding:16px;text-align:center;font-size:11px;color:#aaa;">
      Paiement traité de façon sécurisée par Square &nbsp;|&nbsp; © 2026 Caroline Gérard
    </div>
  </div>
</body>
</html>`;
}
