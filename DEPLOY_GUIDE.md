# Guide de déploiement GitHub Actions → Vercel

## Vue d'ensemble
Ce guide vous permet de forcer le déploiement sur Vercel quand l'auto-déploiement ne fonctionne pas.

## ÉTAPE 1 : Récupérer VERCEL_TOKEN

1. **Ouvrez** https://vercel.com/account/tokens
2. **Cliquez** sur "Create Token"
3. **Nommez** le token : `GitHub Actions Deploy`
4. **Sélectionnez** la durée : `No Expiration`
5. **Cliquez** "Create"
6. **COPIEZ** immédiatement le token (commence par `vercel_...`) - vous ne pourrez plus le voir après !

## ÉTAPE 2 : Récupérer ORG_ID

1. **Allez** sur https://vercel.com/teams/settings/general
2. **Cherchez** la section "Team ID" 
3. **COPIEZ** la valeur (ressemble à : `team_xxxxxxxxxx`)

## ÉTAPE 3 : Récupérer PROJECT_ID

1. **Allez** sur votre projet : https://vercel.com/dashboard
2. **Cliquez** sur votre projet "applako" ou "conakry-lako-taxi"
3. **Cliquez** sur "Settings" (en haut)
4. **Restez** sur l'onglet "General"
5. **Cherchez** "Project ID" et **COPIEZ** la valeur (ressemble à : `prj_xxxxxxxxxx`)

## ÉTAPE 4 : Ajouter les secrets sur GitHub

1. **Allez** sur https://github.com/labiko/applako
2. **Cliquez** sur "Settings" (en haut du repo)
3. **Cliquez** sur "Secrets and variables" → "Actions" (menu gauche)
4. **Cliquez** "New repository secret"

### Ajoutez ces 3 secrets :

**Secret 1:**
- Name: `VERCEL_TOKEN`
- Value: [Collez le token de l'étape 1]
- Cliquez "Add secret"

**Secret 2:**
- Name: `ORG_ID` 
- Value: [Collez l'ID de l'étape 2]
- Cliquez "Add secret"

**Secret 3:**
- Name: `PROJECT_ID`
- Value: [Collez l'ID de l'étape 3]  
- Cliquez "Add secret"

## ÉTAPE 5 : Déclencher le déploiement

1. **Allez** sur https://github.com/labiko/applako/actions
2. **Cliquez** sur "Deploy to Vercel" (à gauche)
3. **Cliquez** "Run workflow" (bouton bleu à droite)
4. **Laissez** "Branch: main" sélectionné
5. **Cliquez** "Run workflow" (bouton vert)

## Résultat

Le déploiement va commencer et vous verrez le progrès en temps réel !
Une fois terminé, votre site Vercel aura la dernière version avec :
- ✅ Favicon Lako
- ✅ Splash screen animé
- ✅ Corrections des erreurs Supabase

## Liens utiles

- **Votre repo GitHub** : https://github.com/labiko/applako
- **GitHub Actions** : https://github.com/labiko/applako/actions
- **Vercel Dashboard** : https://vercel.com/dashboard
- **Vercel Tokens** : https://vercel.com/account/tokens

---
*Guide généré avec Claude Code*