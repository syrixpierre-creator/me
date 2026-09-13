# SYRIX FLIX — Composants Web

Composants front-end à brancher sur votre site existant (celui qui consomme
l'API catalogue), indépendants de la stack utilisée : pur HTML/CSS/JS, aucune
dépendance externe.

## Contenu

| Fichier | Rôle |
|---|---|
| `assets/css/site.css` | Styles partagés (branding SYRIX FLIX) pour tous les composants ci-dessous |
| `assets/js/apk-banner.js` | Bannière "Télécharger l'APK", avec option "Continuer sur le site" (dismiss mémorisé) |
| `assets/js/cookie-consent.js` | Bandeau cookies RGPD (Accepter/Refuser, choix mémorisé) |
| `assets/js/video-player.js` | Lecteur plein écran avec menu réglages (vitesse + rotation d'écran) |
| `player-demo.html` | Page de démo montrant les 3 composants ensemble |
| `confidentialite.html` | Politique de confidentialité (modèle à personnaliser) |
| `conditions-utilisation.html` | CGU (modèle à personnaliser) |
| `faq.html` | FAQ en accordéon |

## 1. Bannière APK

```html
<script src="assets/js/apk-banner.js"></script>
<script>
  SyrixApkBanner.init({
    apkUrl: "/downloads/syrix-flix.apk",
    onlyAndroid: true,      // recommandé : un APK n'a de sens que sur Android
    remindAfterDays: 7,     // redemande après ce délai si l'utilisateur a ignoré
  });
</script>
```
L'utilisateur peut cliquer "Continuer sur le site" pour fermer la bannière sans
télécharger — son choix est mémorisé (`localStorage`) pendant `remindAfterDays` jours.

## 2. Cookies

```html
<script src="assets/js/cookie-consent.js"></script>
<script>
  SyrixCookieConsent.init({ privacyUrl: "confidentialite.html", termsUrl: "conditions-utilisation.html" });

  document.addEventListener('sf:cookie-consent', (e) => {
    if (e.detail.choice === 'accepted') {
      // activer ici vos scripts de mesure d'audience, etc.
    }
  });
</script>
```

## 3. Lecteur plein écran + rotation

```html
<div id="player-container" class="sf-player">
  <video id="player-video" src="..." playsinline></video>
</div>
<script src="assets/js/video-player.js"></script>
<script>
  SyrixPlayer.init({
    containerId: "player-container",
    videoId: "player-video",
    autoLockLandscapeOnFullscreen: true, // verrouille en paysage à l'entrée en plein écran
  });
</script>
```
Le menu Réglages (icône ⚙) propose la vitesse de lecture et 3 modes de
rotation : automatique, verrouillé portrait, verrouillé paysage. Le
verrouillage d'orientation dépend du support navigateur (fonctionne sur Chrome
Android en plein écran ; non supporté sur Safari iOS — l'échec est silencieux).

## Notes juridiques

`confidentialite.html` et `conditions-utilisation.html` sont des **modèles
génériques** : à personnaliser (raison sociale, contact, hébergeur) et à faire
valider par un professionnel du droit avant mise en ligne, notamment au regard
du RGPD et du statut du contenu diffusé sur le catalogue.
