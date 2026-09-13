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

// La racine du site redirige directement vers l'app Flutter Web compilée
// (Login → Signup → Accueil → ... y sont gérés côté Flutter). Le JSON
// d'info API reste disponible sur /api pour les intégrateurs / la doc.
app.get("/", (req, res) => {
  res.redirect("/app/");
});

app.get("/api", (req, res) => {
  res.json({
    success: true,
    data: {
      name: "SYRIX FLIX API",
      docs: "/docs",
      site: "/app/",
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
