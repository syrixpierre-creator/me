require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const connectDB = require("./config/db");
const authRoutes = require("./routes/auth.routes");
const profileRoutes = require("./routes/profile.routes");
const catalogRoutes = require("./routes/catalog.routes");

const app = express();

// Railway (comme tout hébergeur derrière un reverse proxy) transmet le vrai
// IP client via l'en-tête X-Forwarded-For. Sans "trust proxy", Express refuse
// de s'y fier — ce qui faisait planter express-rate-limit à chaque requête
// (ValidationError: ERR_ERL_UNEXPECTED_X_FORWARDED_FOR, visible dans les logs
// de déploiement). "1" = on fait confiance au premier proxy en amont (celui
// de Railway), pas à un en-tête falsifiable par n'importe qui d'autre.
app.set("trust proxy", 1);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors()); // ouvert : la restriction réelle se fait par clé API + domaine, pas par CORS
app.use(express.json({ limit: "2mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Page de documentation d'intégration API (statique)
app.use("/docs", express.static(path.join(__dirname, "..", "public")));

// Site web (pages légales, FAQ, démo du lecteur, bannière APK, cookies) :
// c'est LUI que le backend sert comme "frontend web". L'app mobile (Flutter/APK),
// elle, n'est pas servie ici — c'est un binaire installé sur le téléphone qui
// consomme cette API à distance ; seul le fichier .apk est mis à disposition
// en téléchargement ci-dessous.
app.use("/site", express.static(path.join(__dirname, "..", "web")));

// App SYRIX FLIX compilée en Flutter Web (générée par le workflow GitHub
// Actions .github/workflows/flutter-web.yml, qui committe le build dans
// web/flutter-app/ à chaque changement de mobile/lib/**). C'est elle qui gère
// tout le flux Login → Signup → Accueil → Profil → Catalogue, en Dart/Flutter
// compilé — pas en HTML statique.
app.use("/app", express.static(path.join(__dirname, "..", "web", "flutter-app")));

// Téléchargement de l'APK (déposez syrix-flix.apk dans /downloads à la racine
// du projet ; c'est vers ce chemin que pointe assets/js/apk-banner.js).
app.use("/downloads", express.static(path.join(__dirname, "..", "downloads")));

// La racine du site redirige vers le site web statique (web/intro.html →
// login/accueil selon la session), servi sur /site. C'est CE frontend qui
// fonctionne immédiatement avec un simple déploiement (zip ou repo) : il ne
// nécessite aucune étape de build.
//
// /app/ (app Flutter Web compilée) reste disponible séparément, mais n'est
// PAS la racine par défaut : ce dossier n'existe que si le workflow GitHub
// Actions .github/workflows/flutter-web.yml a tourné (push sur un repo
// GitHub connecté à Railway) et a committé web/flutter-app/. Avec un simple
// zip déployé directement, ce dossier n'existe jamais → /app/ (et donc /,
// avant ce correctif) renvoyait une erreur 404 "Route inexistante".
app.get("/", (req, res) => {
  res.redirect("/site/intro.html");
});

app.get("/api", (req, res) => {
  res.json({
    success: true,
    data: {
      name: "SYRIX FLIX API",
      docs: "/docs",
      site: "/site/intro.html",
      app: "/app/ (app Flutter Web — nécessite le pipeline GitHub Actions)",
      version: "1.0.0",
    },
  });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1", catalogRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: "not_found", message: "Route inexistante." },
  });
});

// Handler d'erreurs générique
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    error: { code: "internal_error", message: "Erreur interne du serveur." },
  });
});

const PORT = process.env.PORT || 4000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[SYRIX FLIX API] En écoute sur le port ${PORT}`);
      console.log(`[SYRIX FLIX API] Docs disponibles sur /docs`);
    });
  })
  .catch((err) => {
    console.error("Échec de connexion MongoDB:", err.message);
    process.exit(1);
  });
