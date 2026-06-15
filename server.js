/**
 * cave-api/server.js
 * API centrale La Cave — Auth + Emails + Webhooks
 *
 * Routes :
 *   POST /auth/register          Inscription caviste
 *   GET  /auth/verify/:token     Validation email caviste
 *   POST /auth/login             Connexion caviste
 *   POST /auth/forgot-password   Demande reset mot de passe
 *   POST /auth/reset-password    Nouveau mot de passe
 *   GET  /auth/me                Profil caviste connecté
 *
 *   POST /clients                Créer un client + envoyer invitation
 *   GET  /clients                Lister les clients du caviste
 *   PUT  /clients/:id            Modifier un client
 *
 *   GET  /api/health             Santé du serveur
 */

import express      from "express";
import cors         from "cors";
import bcrypt       from "bcryptjs";
import jwt          from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import dotenv       from "dotenv";
import { DB }       from "./db.js";
import {
  sendVerificationEmail,
  sendClientInvitationEmail,
  sendPasswordResetEmail,
} from "./emails.js";

dotenv.config();

const app        = express();
const PORT       = process.env.PORT       || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "changez-ce-secret-en-production";
const APP_URL    = process.env.APP_URL    || `http://localhost:${PORT}`;
const MOBILE_URL = process.env.MOBILE_DOWNLOAD_URL || "https://lacave.app/download";

app.use(cors({ origin: "*" }));
app.use(express.json());

/* ── Middleware auth JWT ── */
function requireAuth(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim();
  if (!token) return res.status(401).json({ error: "Non authentifié" });
  try {
    req.shop = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Token invalide ou expiré" });
  }
}

/* ══════════════════════════════════════════════
   AUTH — INSCRIPTION CAVISTE
══════════════════════════════════════════════ */
app.post("/auth/register", async (req, res) => {
  const { shopName, email, password, phone, address } = req.body;

  if (!shopName?.trim()) return res.status(400).json({ error: "Nom de la cave requis" });
  if (!email?.trim() || !email.includes("@")) return res.status(400).json({ error: "Email invalide" });
  if (!password || password.length < 6) return res.status(400).json({ error: "Mot de passe : 6 caractères minimum" });

  // Vérifier si l'email existe déjà
  if (DB.getShop(email)) return res.status(409).json({ error: "Un compte existe déjà avec cet email" });

  // Hasher le mot de passe
  const hash = await bcrypt.hash(password, 12);

  // Créer le compte (non vérifié)
  const shop = {
    id:        uuid(),
    shopName:  shopName.trim(),
    email:     email.trim().toLowerCase(),
    password:  hash,
    phone:     phone || "",
    address:   address || "",
    verified:  false,
    createdAt: new Date().toISOString(),
  };
  DB.addShop(shop);

  // Créer le token de vérification (expire dans 24h)
  const verifyToken = uuid();
  DB.addToken({
    value:     verifyToken,
    type:      "email-verification",
    shopId:    shop.id,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  });

  // Envoyer l'email de confirmation
  try {
    await sendVerificationEmail({
      to:       shop.email,
      shopName: shop.shopName,
      token:    verifyToken,
    });
    console.log(`[Auth] Compte créé : ${shop.email} — email de vérification envoyé`);
  } catch (err) {
    console.error("[Auth] Erreur envoi email:", err.message);
    // On continue même si l'email échoue
  }

  res.status(201).json({
    ok:      true,
    message: "Compte créé ! Vérifiez votre boîte email pour activer votre compte.",
  });
});

/* ══════════════════════════════════════════════
   AUTH — VÉRIFICATION EMAIL
══════════════════════════════════════════════ */
app.get("/auth/verify/:token", async (req, res) => {
  const { token } = req.params;

  const record = DB.getToken(token);
  if (!record || record.type !== "email-verification") {
    return res.status(400).send(`
      <html><body style="font-family:sans-serif;text-align:center;padding:60px;background:#F5F2FF">
        <div style="font-size:48px">❌</div>
        <h2 style="color:#904040">Lien invalide ou expiré</h2>
        <p style="color:#6B6880">Ce lien de confirmation n'est plus valide.<br>
        Relancez La Cave et demandez un nouvel email de confirmation.</p>
      </body></html>
    `);
  }

  // Activer le compte
  DB.updateShop({ id: record.shopId, verified: true });
  DB.deleteToken(token);

  console.log(`[Auth] Compte vérifié : shopId ${record.shopId}`);

  res.send(`
    <html><body style="font-family:sans-serif;text-align:center;padding:60px;background:#F5F2FF">
      <div style="font-size:48px">🍷</div>
      <h2 style="color:#1E1A2E;font-family:Georgia,serif;font-weight:400">Compte activé !</h2>
      <p style="color:#6B6880;font-size:14px">Votre compte La Cave est maintenant actif.<br>
      Retournez sur l'application pour vous connecter.</p>
      <div style="margin-top:20px;padding:14px 24px;background:linear-gradient(135deg,#4A7C59,#7B5EA7);
        color:white;border-radius:9px;display:inline-block;font-weight:600">
        ✓ Vous pouvez fermer cette page
      </div>
    </body></html>
  `);
});

/* ══════════════════════════════════════════════
   AUTH — CONNEXION
══════════════════════════════════════════════ */
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  const shop = DB.getShop(email);
  if (!shop) return res.status(401).json({ error: "Email ou mot de passe incorrect" });

  const ok = await bcrypt.compare(password, shop.password);
  if (!ok) return res.status(401).json({ error: "Email ou mot de passe incorrect" });

  if (!shop.verified) {
    return res.status(403).json({
      error:    "Compte non activé",
      message:  "Vérifiez votre boîte email et cliquez sur le lien de confirmation.",
      needsVerification: true,
    });
  }

  const token = jwt.sign(
    { id: shop.id, email: shop.email, shopName: shop.shopName },
    JWT_SECRET,
    { expiresIn: "30d" }
  );

  console.log(`[Auth] Connexion : ${shop.email}`);

  res.json({
    ok:    true,
    token,
    shop: {
      id:       shop.id,
      shopName: shop.shopName,
      email:    shop.email,
      phone:    shop.phone,
      address:  shop.address,
    },
  });
});

/* ══════════════════════════════════════════════
   AUTH — MOT DE PASSE OUBLIÉ
══════════════════════════════════════════════ */
app.post("/auth/forgot-password", async (req, res) => {
  const { email } = req.body;
  const shop = DB.getShop(email);

  // Toujours répondre OK (sécurité — ne pas révéler si l'email existe)
  if (shop) {
    const resetToken = uuid();
    DB.addToken({
      value:     resetToken,
      type:      "password-reset",
      shopId:    shop.id,
      expiresAt: Date.now() + 60 * 60 * 1000, // 1 heure
    });
    try {
      await sendPasswordResetEmail({ to: shop.email, shopName: shop.shopName, token: resetToken });
    } catch (err) {
      console.error("[Auth] Erreur email reset:", err.message);
    }
  }

  res.json({ ok: true, message: "Si cet email existe, un lien de réinitialisation a été envoyé." });
});

/* ══════════════════════════════════════════════
   AUTH — NOUVEAU MOT DE PASSE
══════════════════════════════════════════════ */
app.post("/auth/reset-password", async (req, res) => {
  const { token, password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ error: "6 caractères minimum" });

  const record = DB.getToken(token);
  if (!record || record.type !== "password-reset") {
    return res.status(400).json({ error: "Lien invalide ou expiré" });
  }

  const hash = await bcrypt.hash(password, 12);
  DB.updateShop({ id: record.shopId, password: hash });
  DB.deleteToken(token);

  res.json({ ok: true, message: "Mot de passe mis à jour. Vous pouvez vous connecter." });
});

/* ══════════════════════════════════════════════
   AUTH — PROFIL
══════════════════════════════════════════════ */
app.get("/auth/me", requireAuth, (req, res) => {
  const shop = DB.getShopById(req.shop.id);
  if (!shop) return res.status(404).json({ error: "Compte introuvable" });
  const { password: _, ...safeShop } = shop;
  res.json({ ok: true, shop: safeShop });
});

/* ══════════════════════════════════════════════
   CLIENTS — CRÉER + INVITER
══════════════════════════════════════════════ */
app.post("/clients", requireAuth, async (req, res) => {
  const { name, email, phone, notes } = req.body;
  const shop = DB.getShopById(req.shop.id);

  if (!name?.trim()) return res.status(400).json({ error: "Nom du client requis" });

  // Mot de passe provisoire
  const tempPassword = Math.random().toString(36).slice(-8).toUpperCase();

  const client = {
    id:        uuid(),
    shopId:    req.shop.id,
    name:      name.trim(),
    email:     email?.trim().toLowerCase() || null,
    phone:     phone || "",
    notes:     notes || "",
    password:  await bcrypt.hash(tempPassword, 10),
    verified:  false,
    joinDate:  new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
  };
  DB.addClient(client);

  // Envoyer l'invitation si email fourni
  if (client.email) {
    try {
      await sendClientInvitationEmail({
        to:             client.email,
        clientName:     client.name,
        shopName:       shop.shopName,
        password:       tempPassword,
        appDownloadUrl: MOBILE_URL,
      });
      console.log(`[Client] Invitation envoyée à ${client.email} (shop: ${shop.shopName})`);
    } catch (err) {
      console.error("[Client] Erreur envoi invitation:", err.message);
    }
  }

  const { password: _, ...safeClient } = client;
  res.status(201).json({ ok: true, client: safeClient });
});

/* ── Lister les clients ── */
app.get("/clients", requireAuth, (req, res) => {
  const clients = DB.getClients(req.shop.id).map(({ password: _, ...c }) => c);
  res.json({ ok: true, clients });
});

/* ── Modifier un client ── */
app.put("/clients/:id", requireAuth, (req, res) => {
  const client = DB.getClient(req.params.id);
  if (!client || client.shopId !== req.shop.id) {
    return res.status(404).json({ error: "Client introuvable" });
  }
  DB.updateClient({ ...client, ...req.body, id: client.id, shopId: client.shopId });
  res.json({ ok: true });
});


/* ══════════════════════════════════════════════
   AUTH CLIENT MOBILE — connexion
   Le client se connecte avec l'email + mot de passe
   reçus dans l'email d'invitation
══════════════════════════════════════════════ */
app.post("/client/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email et mot de passe requis" });

  // Un client peut exister chez plusieurs cavistes — on cherche tous ses comptes
  const allClients = DB.getAllClients().filter(
    c => c.email && c.email.toLowerCase() === email.toLowerCase()
  );
  if (allClients.length === 0) return res.status(401).json({ error: "Email ou mot de passe incorrect" });

  // Vérifier le mot de passe sur le premier compte (mot de passe partagé entre cavistes)
  let validClient = null;
  for (const c of allClients) {
    if (await bcrypt.compare(password, c.password)) { validClient = c; break; }
  }
  if (!validClient) return res.status(401).json({ error: "Email ou mot de passe incorrect" });

  // Lister les cavistes du client
  const shops = allClients.map(c => {
    const shop = DB.getShopById(c.shopId);
    return shop ? { shopId: shop.id, shopName: shop.shopName, clientId: c.id } : null;
  }).filter(Boolean);

  const token = jwt.sign(
    { type: "client", email: validClient.email, name: validClient.name, clientIds: allClients.map(c => c.id) },
    JWT_SECRET,
    { expiresIn: "90d" }
  );

  console.log(`[Client] Connexion mobile : ${validClient.email} (${shops.length} caviste(s))`);

  res.json({
    ok: true,
    token,
    client: {
      name:           validClient.name,
      email:          validClient.email,
      mustChangePassword: !validClient.passwordChanged,
      shops,
    },
  });
});

/* ── Middleware client ── */
function requireClientAuth(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim();
  if (!token) return res.status(401).json({ error: "Non authentifié" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== "client") return res.status(403).json({ error: "Token client requis" });
    req.client = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Token invalide ou expiré" });
  }
}

/* ── Changer le mot de passe client ── */
app.post("/client/change-password", requireClientAuth, async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: "6 caractères minimum" });

  const hash = await bcrypt.hash(newPassword, 10);
  // Mettre à jour le mot de passe sur TOUS les comptes du client (tous cavistes)
  req.client.clientIds.forEach(id => {
    const c = DB.getClient(id);
    if (c) DB.updateClient({ ...c, password: hash, passwordChanged: true });
  });

  console.log(`[Client] Mot de passe changé : ${req.client.email}`);
  res.json({ ok: true, message: "Mot de passe mis à jour" });
});

/* ── Profil client + cavistes ── */
app.get("/client/me", requireClientAuth, (req, res) => {
  const clients = req.client.clientIds.map(id => DB.getClient(id)).filter(Boolean);
  if (clients.length === 0) return res.status(404).json({ error: "Compte introuvable" });

  const shops = clients.map(c => {
    const shop = DB.getShopById(c.shopId);
    return shop ? { shopId: shop.id, shopName: shop.shopName, clientId: c.id, address: shop.address, phone: shop.phone } : null;
  }).filter(Boolean);

  res.json({
    ok: true,
    client: {
      name:  clients[0].name,
      email: clients[0].email,
      mustChangePassword: !clients[0].passwordChanged,
      shops,
    },
  });
});

/* ══════════════════════════════════════════════
   SANTÉ
══════════════════════════════════════════════ */
app.get("/api/health", (req, res) => {
  res.json({ ok: true, version: "1.0.0", uptime: Math.floor(process.uptime()) + "s" });
});

/* ══════════════════════════════════════════════
   DÉMARRAGE
══════════════════════════════════════════════ */
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║   🍷  La Cave — API centrale             ║
╠══════════════════════════════════════════╣
║  Port      : ${String(PORT).padEnd(27)}║
║  Auth      : JWT                         ║
║  Emails    : Resend                      ║
╠══════════════════════════════════════════╣
║  POST /auth/register                     ║
║  GET  /auth/verify/:token                ║
║  POST /auth/login                        ║
║  POST /auth/forgot-password              ║
║  POST /clients  (+ envoi invitation)     ║
╚══════════════════════════════════════════╝
  `);
});
