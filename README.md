# 🍷 La Cave — API centrale

## Installation locale

```bash
npm install
cp .env.example .env
# Remplir les valeurs dans .env
npm run dev
```

## Déploiement sur Railway

1. Pousser ce dossier sur GitHub
2. Créer un nouveau projet sur railway.app
3. "Deploy from GitHub repo" → sélectionner ce dépôt
4. Dans "Variables", ajouter toutes les variables du .env.example
5. Railway génère automatiquement une URL publique

## Variables obligatoires

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Clé secrète aléatoire longue |
| `RESEND_API_KEY` | Clé API Resend (re_...) |
| `EMAIL_FROM` | Email expéditeur |
| `APP_URL` | URL publique du serveur Railway |

## Tester

```bash
# Inscription
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"shopName":"Cave Test","email":"test@test.fr","password":"123456"}'

# Santé
curl http://localhost:4000/api/health
```
