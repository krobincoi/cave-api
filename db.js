/**
 * db.js — Base de données en mémoire (JSON file)
 * En production remplacer par PostgreSQL ou MongoDB
 * Pour démarrer simplement : fichier JSON sur Railway
 */

import { readFileSync, writeFileSync, existsSync } from "fs";

const DB_FILE = "./data.json";

// Structure initiale
const DEFAULT = {
  shops:   [],  // comptes cavistes
  clients: [],  // clients des cavistes
  tokens:  [],  // tokens de vérification email
};

function load() {
  try {
    if (existsSync(DB_FILE)) {
      return JSON.parse(readFileSync(DB_FILE, "utf-8"));
    }
  } catch {}
  return { ...DEFAULT };
}

function save(db) {
  try {
    writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("[DB] Erreur sauvegarde:", err.message);
  }
}

// Charger au démarrage
let db = load();

export const DB = {
  // ── Shops (cavistes) ──
  getShop:       (email)  => db.shops.find(s => s.email.toLowerCase() === email.toLowerCase()),
  getShopById:   (id)     => db.shops.find(s => s.id === id),
  addShop:       (shop)   => { db.shops.push(shop); save(db); },
  updateShop:    (shop)   => { const i = db.shops.findIndex(s => s.id === shop.id); if (i >= 0) { db.shops[i] = { ...db.shops[i], ...shop }; save(db); } },

  // ── Clients ──
  getClients:    (shopId) => db.clients.filter(c => c.shopId === shopId),
  getClient:     (id)     => db.clients.find(c => c.id === id),
  addClient:     (client) => { db.clients.push(client); save(db); },
  updateClient:  (client) => { const i = db.clients.findIndex(c => c.id === client.id); if (i >= 0) { db.clients[i] = { ...db.clients[i], ...client }; save(db); } },

  // ── Tokens ──
  addToken:      (token)  => { db.tokens.push(token); save(db); },
  getToken:      (value)  => db.tokens.find(t => t.value === value && t.expiresAt > Date.now()),
  deleteToken:   (value)  => { db.tokens = db.tokens.filter(t => t.value !== value); save(db); },
  cleanTokens:   ()       => { db.tokens = db.tokens.filter(t => t.expiresAt > Date.now()); save(db); },
};
