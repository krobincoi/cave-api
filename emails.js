/**
 * emails.js — Templates emails La Cave
 * Envoi via Gmail SMTP (nodemailer)
 */

import nodemailer from "nodemailer";

// Gmail SMTP
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,         // adresse Gmail
    pass: process.env.GMAIL_APP_PASSWORD, // mot de passe d'application (16 lettres)
  },
});

const FROM    = `La Cave <${process.env.GMAIL_USER}>`;
const APP_URL = process.env.APP_URL || "https://cave-api-production.up.railway.app";

async function sendMail({ to, subject, html }) {
  return transporter.sendMail({ from: FROM, to, subject, html });
}

/* ── Style commun ── */
const style = `
  font-family: 'DM Sans', Arial, sans-serif;
  background: #F5F2FF;
  margin: 0; padding: 0;
`;

const container = `
  max-width: 520px; margin: 40px auto;
  background: #FDFCFF;
  border-radius: 16px;
  border: 1px solid #E4DFF0;
  overflow: hidden;
`;

const header = `
  background: linear-gradient(135deg, #1A2420, #2A3A30);
  padding: 28px 32px;
  text-align: center;
`;

const body = `padding: 32px;`;
const footer = `
  padding: 20px 32px;
  background: #F5F2FF;
  border-top: 1px solid #E4DFF0;
  text-align: center;
  font-size: 11px; color: #9A90B0;
`;

const btnStyle = `
  display: inline-block;
  background: linear-gradient(135deg, #4A7C59, #7B5EA7);
  color: #ffffff !important;
  text-decoration: none;
  padding: 13px 28px;
  border-radius: 9px;
  font-weight: 600;
  font-size: 14px;
  margin: 20px 0;
`;

/* ════════════════════════════════════════════
   EMAIL 1 — Confirmation compte caviste
════════════════════════════════════════════ */
export async function sendVerificationEmail({ to, shopName, token }) {
  const link = `${APP_URL}/auth/verify/${token}`;

  const html = `
<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="${style}">
  <div style="${container}">
    <div style="${header}">
      <div style="font-size:28px;margin-bottom:8px">🍷</div>
      <div style="font-family:Georgia,serif;font-size:22px;color:#E8F0EA;font-weight:400">La Cave</div>
      <div style="font-size:10px;color:#7EC89A;letter-spacing:.1em;text-transform:uppercase;margin-top:4px">CRM Caviste Pro</div>
    </div>
    <div style="${body}">
      <h2 style="font-family:Georgia,serif;font-size:22px;font-weight:400;color:#1E1A2E;margin:0 0 8px">
        Bienvenue, ${shopName} !
      </h2>
      <p style="color:#6B6880;font-size:14px;line-height:1.6;margin:0 0 20px">
        Votre compte La Cave a bien été créé.<br>
        Cliquez sur le bouton ci-dessous pour confirmer votre adresse email et activer votre compte.
      </p>
      <div style="text-align:center">
        <a href="${link}" style="${btnStyle}">✓ Confirmer mon compte</a>
      </div>
      <p style="color:#9A90B0;font-size:12px;line-height:1.6;margin:16px 0 0">
        Ce lien expire dans <strong>24 heures</strong>.<br>
        Si vous n'avez pas créé ce compte, ignorez cet email.
      </p>
      <hr style="border:none;border-top:1px solid #E4DFF0;margin:20px 0">
      <p style="color:#9A90B0;font-size:11px">
        Ou copiez ce lien dans votre navigateur :<br>
        <span style="color:#7B5EA7;word-break:break-all">${link}</span>
      </p>
    </div>
    <div style="${footer}">© 2025 La Cave — Tous droits réservés</div>
  </div>
</body></html>`;

  return sendMail({
    to,
    subject: "🍷 La Cave — Confirmez votre compte",
    html,
  });
}

/* ════════════════════════════════════════════
   EMAIL 2 — Invitation client
   Envoyé quand le caviste crée un client
════════════════════════════════════════════ */
export async function sendClientInvitationEmail({ to, clientName, shopName, password, appDownloadUrl }) {
  const html = `
<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="${style}">
  <div style="${container}">
    <div style="${header}">
      <div style="font-size:28px;margin-bottom:8px">🍷</div>
      <div style="font-family:Georgia,serif;font-size:22px;color:#E8F0EA;font-weight:400">La Cave</div>
      <div style="font-size:10px;color:#7EC89A;letter-spacing:.1em;text-transform:uppercase;margin-top:4px">Votre espace client</div>
    </div>
    <div style="${body}">
      <h2 style="font-family:Georgia,serif;font-size:22px;font-weight:400;color:#1E1A2E;margin:0 0 8px">
        Bonjour ${clientName} !
      </h2>
      <p style="color:#6B6880;font-size:14px;line-height:1.6;margin:0 0 16px">
        <strong style="color:#1E1A2E">${shopName}</strong> vous invite à rejoindre 
        <strong style="color:#7B5EA7">La Cave</strong> — votre espace personnel pour suivre 
        vos achats, découvrir des conseils de dégustation et gérer votre cave privée.
      </p>

      <!-- Identifiants -->
      <div style="background:#F5F2FF;border:1px solid #E4DFF0;border-radius:10px;padding:16px;margin:16px 0">
        <div style="font-size:11px;color:#9A90B0;text-transform:uppercase;letter-spacing:.07em;font-weight:600;margin-bottom:10px">
          Vos identifiants de connexion
        </div>
        <div style="margin-bottom:6px">
          <span style="font-size:12px;color:#6B6880">Email : </span>
          <span style="font-size:13px;font-weight:600;color:#1E1A2E">${to}</span>
        </div>
        <div>
          <span style="font-size:12px;color:#6B6880">Mot de passe provisoire : </span>
          <span style="font-size:13px;font-weight:600;color:#7B5EA7;font-family:monospace">${password}</span>
        </div>
      </div>

      <p style="color:#6B6880;font-size:13px;margin:0 0 6px">
        ⚠️ <strong>Pensez à changer votre mot de passe</strong> dès votre première connexion.
      </p>

      <div style="text-align:center">
        <a href="${appDownloadUrl}" style="${btnStyle}">📱 Télécharger l'application</a>
      </div>

      <div style="background:#EDF5F0;border:1px solid #4A7C5933;border-radius:10px;padding:14px;margin:16px 0">
        <div style="font-size:12px;font-weight:600;color:#2D5C3A;margin-bottom:8px">✓ Ce que vous pouvez faire</div>
        <div style="font-size:12px;color:#4A6A54;line-height:1.8">
          📋 Consulter votre historique d'achats<br>
          🍷 Gérer votre cave personnelle<br>
          💬 Recevoir les conseils de dégustation<br>
          🔔 Être notifié des nouveautés
        </div>
      </div>
    </div>
    <div style="${footer}">
      Invitation envoyée par ${shopName} via La Cave<br>
      © 2025 La Cave — Tous droits réservés
    </div>
  </div>
</body></html>`;

  return sendMail({
    to,
    subject: `🍷 ${shopName} vous invite sur La Cave`,
    html,
  });
}

/* ════════════════════════════════════════════
   EMAIL 3 — Réinitialisation mot de passe
════════════════════════════════════════════ */
export async function sendPasswordResetEmail({ to, shopName, token }) {
  const link = `${APP_URL}/auth/reset-password/${token}`;

  const html = `
<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="${style}">
  <div style="${container}">
    <div style="${header}">
      <div style="font-size:28px;margin-bottom:8px">🍷</div>
      <div style="font-family:Georgia,serif;font-size:22px;color:#E8F0EA">La Cave</div>
    </div>
    <div style="${body}">
      <h2 style="font-family:Georgia,serif;font-size:20px;font-weight:400;color:#1E1A2E;margin:0 0 12px">
        Réinitialisation du mot de passe
      </h2>
      <p style="color:#6B6880;font-size:14px;line-height:1.6;margin:0 0 20px">
        Vous avez demandé à réinitialiser le mot de passe de votre compte <strong>${shopName}</strong>.<br>
        Cliquez ci-dessous pour créer un nouveau mot de passe.
      </p>
      <div style="text-align:center">
        <a href="${link}" style="${btnStyle}">🔑 Créer un nouveau mot de passe</a>
      </div>
      <p style="color:#9A90B0;font-size:12px;margin:16px 0 0">
        Ce lien expire dans <strong>1 heure</strong>.<br>
        Si vous n'avez pas fait cette demande, ignorez cet email.
      </p>
    </div>
    <div style="${footer}">© 2025 La Cave</div>
  </div>
</body></html>`;

  return sendMail({
    to,
    subject: "🔑 La Cave — Réinitialisation de votre mot de passe",
    html,
  });
}
