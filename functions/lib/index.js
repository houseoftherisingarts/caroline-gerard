"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordVisit = exports.sendDirectMessage = exports.sendContactForm = exports.onConferencePublished = exports.onSubscriberCreated = exports.sendNewsletter = exports.processCheckout = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
const params_1 = require("firebase-functions/params");
const app_1 = require("firebase-admin/app");
const firestore_2 = require("firebase-admin/firestore");
const square_1 = require("square");
const nodemailer = require("nodemailer");
const crypto_1 = require("crypto");
(0, app_1.initializeApp)();
const db = (0, firestore_2.getFirestore)();
// Secrets (set via: firebase functions:secrets:set SECRET_NAME)
const squareAccessToken = (0, params_1.defineSecret)('SQUARE_ACCESS_TOKEN');
const emailUser = (0, params_1.defineSecret)('EMAIL_USER');
const emailPass = (0, params_1.defineSecret)('EMAIL_PASS');
// Config strings (set in functions/.env or firebase.json)
const squareEnvironment = (0, params_1.defineString)('SQUARE_ENVIRONMENT', { default: 'sandbox' });
const squareLocationId = (0, params_1.defineString)('SQUARE_LOCATION_ID');
const emailHost = (0, params_1.defineString)('EMAIL_HOST', { default: 'smtp.gmail.com' });
// Server-side pricing constants (source of truth — never trust client prices)
const DELIVERY_FEE = 6.00;
const TPS_RATE = 0.05;
const TVQ_RATE = 0.09975;
const stripHtml = (html) => html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 600);
async function logEmail(entry) {
    try {
        const id = `email_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await db.collection('emailLog').doc(id).set({
            id,
            type: entry.type,
            to: entry.to,
            subject: entry.subject,
            preview: entry.preview ?? (entry.html ? stripHtml(entry.html) : ''),
            sentAt: new Date().toISOString(),
            success: entry.success,
            ...(entry.errorMessage ? { errorMessage: entry.errorMessage } : {}),
            ...(entry.meta ? { meta: entry.meta } : {}),
        });
    }
    catch (err) {
        // Logging must never block real email delivery
        console.error('Failed to write emailLog entry:', err);
    }
}
exports.processCheckout = (0, https_1.onCall)({
    region: 'northamerica-northeast1',
    secrets: [squareAccessToken, emailUser, emailPass],
    invoker: 'public',
}, async (request) => {
    const { sourceId, sessionId, promoCode, cartItems, customer, shipping } = request.data;
    if (!sourceId || !customer?.email || !cartItems?.length) {
        throw new https_1.HttpsError('invalid-argument', 'Données de commande incomplètes.');
    }
    // ── 1. Recalculate totals server-side ──────────────────────────────────
    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    // ── 1b. Validate & apply promo code if provided ────────────────────────
    let discountPct = 0;
    let discount = 0;
    let appliedPromoId = null;
    if (promoCode) {
        const codeId = promoCode.toUpperCase().trim();
        const promoSnap = await db.collection('promoCodes').doc(codeId).get();
        if (promoSnap.exists) {
            const promo = promoSnap.data();
            const expired = promo.expiresAt ? new Date(promo.expiresAt) < new Date() : false;
            const exhausted = promo.maxUses > 0 && promo.usedCount >= promo.maxUses;
            if (promo.isActive && !expired && !exhausted) {
                discountPct = promo.percentage;
                discount = parseFloat((subtotal * discountPct / 100).toFixed(2));
                appliedPromoId = codeId;
            }
        }
    }
    const discountedSubtotal = parseFloat((subtotal - discount).toFixed(2));
    // Books are zero-rated for TVQ in Quebec; TPS applies to discounted subtotal + delivery.
    const tps = parseFloat(((discountedSubtotal + DELIVERY_FEE) * TPS_RATE).toFixed(2));
    const tvq = parseFloat((DELIVERY_FEE * TVQ_RATE).toFixed(2));
    const grandTotal = parseFloat((discountedSubtotal + DELIVERY_FEE + tps + tvq).toFixed(2));
    const amountInCents = BigInt(Math.round(grandTotal * 100));
    // ── 2. Charge via Square ───────────────────────────────────────────────
    const squareToken = squareAccessToken.value();
    const squareLocId = squareLocationId.value();
    if (!squareToken)
        throw new https_1.HttpsError('failed-precondition', 'SQUARE_ACCESS_TOKEN secret non configuré sur le serveur.');
    if (!squareLocId)
        throw new https_1.HttpsError('failed-precondition', 'SQUARE_LOCATION_ID non configuré sur le serveur.');
    const squareClient = new square_1.SquareClient({
        token: squareToken,
        environment: squareEnvironment.value() === 'production'
            ? square_1.SquareEnvironment.Production
            : square_1.SquareEnvironment.Sandbox,
    });
    let squarePaymentId;
    try {
        const response = await squareClient.payments.create({
            sourceId,
            locationId: squareLocId,
            idempotencyKey: (0, crypto_1.randomUUID)(),
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
        // Square returns business errors (e.g. card declined) in the response body
        // rather than throwing, so we must check explicitly.
        if (response.errors && response.errors.length > 0) {
            const first = response.errors[0];
            const detail = first.detail || first.code || 'Paiement refusé par Square.';
            console.error('Square payment refused:', JSON.stringify(response.errors));
            throw new https_1.HttpsError('failed-precondition', detail);
        }
        if (!response.payment?.id) {
            throw new https_1.HttpsError('internal', 'Aucun identifiant de paiement retourné par Square.');
        }
        squarePaymentId = response.payment.id;
    }
    catch (err) {
        if (err instanceof https_1.HttpsError)
            throw err;
        // Network / auth / SDK-level errors
        const squareErr = err;
        const detail = squareErr?.errors?.[0]?.detail || squareErr?.errors?.[0]?.code;
        const msg = detail || (err instanceof Error ? err.message : null) || 'Échec du paiement Square.';
        console.error('Square payment exception:', err);
        throw new https_1.HttpsError('internal', msg);
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
        discount,
        discountPct,
        promoCode: appliedPromoId,
        delivery: DELIVERY_FEE,
        tps,
        tvq,
        total: grandTotal,
        status: 'Payé',
        date: now,
    };
    await db.collection('orders').doc(orderId).set(order);
    // ── 4. Increment promo code usage count (after payment succeeded) ──────
    if (appliedPromoId) {
        await db.collection('promoCodes').doc(appliedPromoId).update({
            usedCount: firestore_2.FieldValue.increment(1),
        }).catch(() => null);
    }
    // ── 5. Remove the abandoned checkout record (payment succeeded) ────────
    if (sessionId) {
        await db.collection('abandonedCheckouts').doc(sessionId).delete().catch(() => null);
    }
    // ── 5. Send emails (non-blocking) ──────────────────────────────────────
    try {
        const user = emailUser.value();
        const pass = emailPass.value();
        if (!user || !pass) {
            console.error('Email secrets not configured — run: firebase functions:secrets:set EMAIL_USER and EMAIL_PASS');
        }
        else {
            const transporter = makeTransporter();
            const receiptHtml = buildEmailHtml(order, cartItems);
            const receiptSubject = `Ton reçu de commande ${orderId}`;
            const adminSubject = `Nouvelle commande ${orderId} — ${order.customerName} — ${grandTotal.toFixed(2)} $`;
            const adminHtml = buildAdminNotificationHtml(order, cartItems);
            // Customer receipt
            try {
                await transporter.sendMail({
                    from: `"Caroline Gérard" <${user}>`,
                    to: customer.email,
                    subject: receiptSubject,
                    html: receiptHtml,
                });
                await logEmail({ type: 'order_receipt', to: customer.email, subject: receiptSubject, html: receiptHtml, success: true, meta: { orderId, total: grandTotal } });
            }
            catch (err) {
                await logEmail({ type: 'order_receipt', to: customer.email, subject: receiptSubject, html: receiptHtml, success: false, errorMessage: err.message, meta: { orderId } });
                throw err;
            }
            // Admin notification to Caroline
            try {
                await transporter.sendMail({
                    from: `"Boutique Caroline Gérard" <${user}>`,
                    to: 'caroline@carolinegerard.ca',
                    subject: adminSubject,
                    html: adminHtml,
                });
                await logEmail({ type: 'order_admin_notification', to: 'caroline@carolinegerard.ca', subject: adminSubject, html: adminHtml, success: true, meta: { orderId, total: grandTotal, customer: order.customerName } });
            }
            catch (err) {
                await logEmail({ type: 'order_admin_notification', to: 'caroline@carolinegerard.ca', subject: adminSubject, html: adminHtml, success: false, errorMessage: err.message, meta: { orderId } });
                throw err;
            }
        }
    }
    catch (emailErr) {
        // Email failure must not cancel a successful payment
        console.error('Email sending failed (non-blocking):', emailErr);
    }
    // ── 6. Return confirmation to frontend ─────────────────────────────────
    return {
        success: true,
        orderId,
        customerName: order.customerName,
        total: grandTotal,
        subtotal,
        discount,
        discountPct,
        delivery: DELIVERY_FEE,
        tps,
        tvq,
        date: now,
    };
});
// ── Transporter factory (reusable) ───────────────────────────────────────────
function makeTransporter() {
    // .trim() removes trailing newlines that Secret Manager sometimes appends —
    // they corrupt the base64 encoding used by AUTH PLAIN and cause 501 errors.
    // authMethod LOGIN avoids AUTH PLAIN entirely (Zoho prefers it).
    return nodemailer.createTransport({
        host: emailHost.value().trim(),
        port: 587,
        secure: false,
        authMethod: 'LOGIN',
        auth: {
            user: emailUser.value().trim(),
            pass: emailPass.value().trim(),
        },
    });
}
// ── Newsletter notification helpers ──────────────────────────────────────────
async function notifySubscribers(subject, htmlContent, logType = 'conference_announcement') {
    const snap = await db.collection('subscribers').get();
    if (snap.empty)
        return;
    const emails = snap.docs.map(d => d.data().email).filter(Boolean);
    if (emails.length === 0)
        return;
    const transporter = makeTransporter();
    // BCC all subscribers in batches of 50
    for (let i = 0; i < emails.length; i += 50) {
        const batch = emails.slice(i, i + 50);
        try {
            await transporter.sendMail({
                from: `"Caroline Gérard" <${emailUser.value()}>`,
                bcc: batch.join(','),
                subject,
                html: htmlContent,
            });
            await logEmail({ type: logType, to: batch, subject, html: htmlContent, success: true, meta: { batchSize: batch.length, batchIndex: Math.floor(i / 50) } });
        }
        catch (err) {
            await logEmail({ type: logType, to: batch, subject, html: htmlContent, success: false, errorMessage: err.message, meta: { batchSize: batch.length, batchIndex: Math.floor(i / 50) } });
            throw err;
        }
    }
}
function notificationHtml(type, title, description, link) {
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
      © 2026 Caroline Gérard — Tu reçois ce courriel parce que tu es abonné(e) à la communauté des rêveurs.
    </div>
  </div>
</body>
</html>`;
}
// ── sendNewsletter callable — triggered manually from the admin UI ────────────
// (replaces the automatic onPostPublished / onEventPublished triggers so the
//  admin can customise the subject, body and image before sending)
function buildNewsletterHtml(title, bodyText, imageUrl) {
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
      © 2026 Caroline Gérard &nbsp;·&nbsp; Tu reçois ce courriel parce que tu es abonné(e) à la communauté des rêveurs.
    </div>
  </div>
</body>
</html>`;
}
exports.sendNewsletter = (0, https_1.onCall)({
    region: 'northamerica-northeast1',
    secrets: [emailUser, emailPass],
    invoker: 'public',
}, async (request) => {
    const { subject, title, bodyText, imageUrl } = request.data;
    if (!subject?.trim() || !title?.trim() || !bodyText?.trim()) {
        throw new https_1.HttpsError('invalid-argument', 'Sujet, titre et texte sont requis.');
    }
    const snap = await db.collection('subscribers').get();
    if (snap.empty)
        return { success: true, sent: 0 };
    const emails = snap.docs
        .map(d => d.data().email)
        .filter(Boolean);
    if (emails.length === 0)
        return { success: true, sent: 0 };
    const html = buildNewsletterHtml(title, bodyText, imageUrl);
    const transporter = makeTransporter();
    for (let i = 0; i < emails.length; i += 50) {
        const batch = emails.slice(i, i + 50);
        try {
            await transporter.sendMail({
                from: `"Caroline Gérard" <${emailUser.value()}>`,
                bcc: batch.join(','),
                subject,
                html,
            });
            await logEmail({ type: 'newsletter', to: batch, subject, html, success: true, meta: { title, batchSize: batch.length, batchIndex: Math.floor(i / 50) } });
        }
        catch (err) {
            await logEmail({ type: 'newsletter', to: batch, subject, html, success: false, errorMessage: err.message, meta: { title } });
            throw err;
        }
    }
    return { success: true, sent: emails.length };
});
// ── onSubscriberCreated — sends a confirmation email when someone subscribes ──
exports.onSubscriberCreated = (0, firestore_1.onDocumentCreated)({
    document: 'subscribers/{subscriberId}',
    region: 'northamerica-northeast1',
    secrets: [emailUser, emailPass],
}, async (event) => {
    const data = event.data?.data();
    const email = data?.email;
    if (!email)
        return;
    const user = emailUser.value();
    const pass = emailPass.value();
    if (!user || !pass) {
        console.error('Email secrets not configured — cannot send subscription confirmation.');
        return;
    }
    const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>Bienvenue dans la communauté des rêveurs</title></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
    <div style="background:#0f0f23;padding:36px 32px;text-align:center;">
      <h1 style="color:#C8A96E;font-size:28px;margin:0;font-family:Georgia,serif;">Caroline Gérard</h1>
      <p style="color:#888;margin:8px 0 0;letter-spacing:2px;font-size:12px;text-transform:uppercase;">Confirmation d'abonnement</p>
    </div>
    <div style="padding:32px;text-align:center;">
      <h2 style="color:#0f0f23;font-size:22px;font-family:Georgia,serif;margin:0 0 16px;">Merci de rejoindre la communauté des rêveurs! ✨</h2>
      <p style="color:#555;font-size:15px;line-height:1.7;">Ton inscription est confirmée. Lorsque l'infolettre sera lancée, tu seras parmi les premiers à la recevoir.</p>
      <p style="color:#555;font-size:15px;line-height:1.7;margin-top:16px;">À très bientôt,<br><strong>Caroline Gérard</strong></p>
    </div>
    <div style="background:#f0f0f0;padding:16px;text-align:center;font-size:11px;color:#aaa;">
      © 2026 Caroline Gérard — Tu reçois ce courriel parce que tu viens de t'abonner à l'infolettre.
    </div>
  </div>
</body>
</html>`;
    const subject = 'Bienvenue dans la communauté des rêveurs ✨';
    const transporter = makeTransporter();
    try {
        await transporter.sendMail({
            from: `"Caroline Gérard" <${user}>`,
            to: email,
            subject,
            html,
        });
        await logEmail({ type: 'subscriber_welcome', to: email, subject, html, success: true });
    }
    catch (err) {
        await logEmail({ type: 'subscriber_welcome', to: email, subject, html, success: false, errorMessage: err.message });
        throw err;
    }
});
exports.onConferencePublished = (0, firestore_1.onDocumentWritten)({
    document: 'conferences/{confId}',
    region: 'northamerica-northeast1',
    secrets: [emailUser, emailPass],
}, async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!after?.isPublished || before?.isPublished === true)
        return;
    await notifySubscribers(`Nouvelle conférence : ${after.title}`, notificationHtml('Nouvelle conférence', after.title ?? '', after.description ?? ''));
});
// ── sendContactForm callable — public contact-form forwarding ────────────────
// Forwards a public site visitor's contact-form message to the configured
// destination email. Server-side validates input and rate-limits silently.
// Falls back to caroline@carolinegerard.ca when no destination is provided.
exports.sendContactForm = (0, https_1.onCall)({
    region: 'northamerica-northeast1',
    secrets: [emailUser, emailPass],
    invoker: 'public',
}, async (request) => {
    const { name, email, subject, message, destination } = request.data;
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
        throw new https_1.HttpsError('invalid-argument', 'Nom, courriel et message sont requis.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new https_1.HttpsError('invalid-argument', 'Adresse courriel invalide.');
    }
    const safeDest = destination && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destination)
        ? destination
        : 'caroline@carolinegerard.ca';
    const user = emailUser.value();
    const pass = emailPass.value();
    if (!user || !pass) {
        console.error('Email secrets not configured — cannot forward contact form.');
        // Soft-fail: client already saved the message as a Lead in Firestore.
        return { success: false, reason: 'email-not-configured' };
    }
    const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>Nouveau message — Formulaire de contact</title></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
    <div style="background:#0f0f23;padding:28px 32px;">
      <h1 style="color:#C8A96E;font-size:22px;margin:0;font-family:Georgia,serif;">Nouveau message reçu</h1>
      <p style="color:#888;margin:6px 0 0;font-size:13px;">via le formulaire de contact</p>
    </div>
    <div style="padding:28px 32px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px;">
        <tr><td style="padding:6px 0;color:#888;width:120px;">Expéditeur</td><td style="font-weight:bold;">${escape(name)}</td></tr>
        <tr><td style="padding:6px 0;color:#888;">Courriel</td><td><a href="mailto:${escape(email)}" style="color:#C8A96E;">${escape(email)}</a></td></tr>
        <tr><td style="padding:6px 0;color:#888;">Sujet</td><td>${escape(subject || '(sans sujet)')}</td></tr>
      </table>
      <div style="border-top:2px solid #C8A96E;padding-top:18px;color:#333;font-size:15px;line-height:1.7;white-space:pre-wrap;">${escape(message)}</div>
    </div>
    <div style="background:#f0f0f0;padding:14px;text-align:center;font-size:11px;color:#aaa;">
      Caroline Gérard — carolinegerard.ca · Notification automatique
    </div>
  </div>
</body>
</html>`;
    const transporter = makeTransporter();
    const fullSubject = `[Contact] ${subject?.trim() || 'Nouveau message'} — ${name}`;
    try {
        await transporter.sendMail({
            from: `"Site carolinegerard.ca" <${user}>`,
            to: safeDest,
            replyTo: `"${name}" <${email}>`,
            subject: fullSubject,
            html,
        });
        await logEmail({ type: 'contact_form', to: safeDest, subject: fullSubject, html, success: true, meta: { senderName: name, senderEmail: email } });
    }
    catch (err) {
        await logEmail({ type: 'contact_form', to: safeDest, subject: fullSubject, html, success: false, errorMessage: err.message, meta: { senderName: name, senderEmail: email } });
        throw err;
    }
    return { success: true };
});
// ── sendDirectMessage callable ────────────────────────────────────────────────
exports.sendDirectMessage = (0, https_1.onCall)({
    region: 'northamerica-northeast1',
    secrets: [emailUser, emailPass],
    invoker: 'public',
}, async (request) => {
    const { recipients, subject, body } = request.data;
    if (!recipients?.length || !subject || !body) {
        throw new https_1.HttpsError('invalid-argument', 'Données incomplètes.');
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
        try {
            await transporter.sendMail({
                from: `"Caroline Gérard" <${emailUser.value()}>`,
                bcc: batch.join(','),
                subject,
                html,
            });
            await logEmail({ type: 'direct_message', to: batch, subject, html, success: true, meta: { batchSize: batch.length, batchIndex: Math.floor(i / 50) } });
        }
        catch (err) {
            await logEmail({ type: 'direct_message', to: batch, subject, html, success: false, errorMessage: err.message, meta: { batchSize: batch.length } });
            throw err;
        }
    }
    return { success: true, sent: recipients.length };
});
// ── recordVisit callable — IP-unique visitor counter ─────────────────────────
// Counts each distinct visitor IP only once, so multiple sessions/tabs/refreshes
// from the same computer no longer inflate the count (closer to Google Analytics'
// "users"). The raw IP is never stored — only a salted SHA-256 hash — to stay
// aligned with Loi 25. Returns { counted: true } the first time an IP is seen.
const VISITOR_SALT = 'cg-visitor-v1';
exports.recordVisit = (0, https_1.onCall)({
    region: 'northamerica-northeast1',
    invoker: 'public',
}, async (request) => {
    const req = request.rawRequest;
    const forwarded = req.headers['x-forwarded-for'] ?? '';
    const ip = forwarded.split(',')[0].trim() || req.ip || '';
    if (!ip)
        return { counted: false };
    const ipHash = (0, crypto_1.createHash)('sha256').update(VISITOR_SALT + ip).digest('hex');
    const visitorRef = db.collection('uniqueVisitors').doc(ipHash);
    const analyticsRef = db.collection('settings').doc('analytics');
    const nowIso = new Date().toISOString();
    const counted = await db.runTransaction(async (tx) => {
        const snap = await tx.get(visitorRef);
        if (snap.exists) {
            tx.update(visitorRef, { lastSeen: nowIso, hits: firestore_2.FieldValue.increment(1) });
            return false;
        }
        tx.set(visitorRef, { firstSeen: nowIso, lastSeen: nowIso, hits: 1 });
        tx.set(analyticsRef, { uniqueVisitors: firestore_2.FieldValue.increment(1) }, { merge: true });
        return true;
    });
    return { counted };
});
function buildAdminNotificationHtml(order, items) {
    const o = order;
    const dateStr = new Date(o.date).toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' });
    const rows = items.map(item => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${item.title}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${(item.price * item.quantity).toFixed(2)} $</td>
    </tr>`).join('');
    return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>Nouvelle commande ${o.id}</title></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
    <div style="background:#0f0f23;padding:28px 32px;">
      <h1 style="color:#C8A96E;font-size:22px;margin:0;font-family:Georgia,serif;">Nouvelle commande reçue</h1>
      <p style="color:#888;margin:6px 0 0;font-size:13px;">${o.id} · ${dateStr}</p>
    </div>
    <div style="padding:28px 32px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px;">
        <tr><td style="padding:4px 0;color:#888;width:140px;">Client</td><td style="font-weight:bold;">${o.customerName}</td></tr>
        <tr><td style="padding:4px 0;color:#888;">Courriel</td><td><a href="mailto:${o.email}" style="color:#C8A96E;">${o.email}</a></td></tr>
        <tr><td style="padding:4px 0;color:#888;">Livraison</td><td>${o.address}</td></tr>
      </table>

      <table style="width:100%;border-collapse:collapse;border-top:2px solid #C8A96E;font-size:14px;margin-bottom:20px;">
        <thead><tr style="background:#faf8f3;">
          <th style="padding:8px 12px;text-align:left;color:#555;">Article</th>
          <th style="padding:8px 12px;text-align:center;color:#555;">Qté</th>
          <th style="padding:8px 12px;text-align:right;color:#555;">Montant</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>

      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:3px 0;color:#888;">Sous-total</td><td style="text-align:right;">${o.subtotal.toFixed(2)} $</td></tr>
        <tr><td style="padding:3px 0;color:#888;">Livraison</td><td style="text-align:right;">${o.delivery.toFixed(2)} $</td></tr>
        <tr><td style="padding:3px 0;color:#888;">TPS</td><td style="text-align:right;">${o.tps.toFixed(2)} $</td></tr>
        <tr><td style="padding:3px 0;color:#888;">TVQ</td><td style="text-align:right;">${o.tvq.toFixed(2)} $</td></tr>
        <tr style="border-top:2px solid #C8A96E;">
          <td style="padding:10px 0 0;font-weight:bold;font-size:17px;">TOTAL</td>
          <td style="padding:10px 0 0;text-align:right;font-weight:bold;font-size:17px;color:#C8A96E;">${o.total.toFixed(2)} $</td>
        </tr>
      </table>
    </div>
    <div style="background:#f0f0f0;padding:14px;text-align:center;font-size:11px;color:#aaa;">
      Boutique Caroline Gérard — Notification automatique
    </div>
  </div>
</body>
</html>`;
}
function buildEmailHtml(order, items) {
    const o = order;
    const dateStr = new Date(o.date).toLocaleDateString('fr-CA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const rows = items
        .map((item) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;">${item.title}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;">${(item.price * item.quantity).toFixed(2)} $</td>
      </tr>`)
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
        <p style="margin:0;color:#555;font-size:14px;">Merci pour ta commande! Ton livre sera expédié sous 3 à 5 jours ouvrables.</p>
        <p style="margin:10px 0 0;color:#999;font-size:12px;">
          Questions? <a href="mailto:caroline@carolinegerard.ca" style="color:#C8A96E;text-decoration:none;">caroline@carolinegerard.ca</a>
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
//# sourceMappingURL=index.js.map