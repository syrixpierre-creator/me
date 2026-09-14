const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 32,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "E-mail invalide"],
    },
    password: {
      type: String,
      required: true,
      select: false, // jamais renvoyé par défaut dans les requêtes
    },
    profileImage: {
      type: String,
      default: "",
    },
    theme: {
      type: String,
      enum: ["dark", "light"],
      default: "dark",
    },

    // --- Clé API développeur ---
    // null par défaut : générée uniquement à la demande explicite depuis l'écran Profil.
    apiKey: {
      type: String,
      unique: true,
      sparse: true, // permet plusieurs `null` sans violer l'unicité
      default: null,
      select: false,
    },
    // Domaine auquel la clé est verrouillée (ex: "movie.syrix.app").
    // C'est CE domaine qui autorise l'usage de la clé, jamais l'IP du VPS.
    apiKeyDomain: {
      type: String,
      default: null,
    },
    // Nom donné par l'utilisateur pour reconnaître sa clé (ex: "Site movie-syrix").
    apiKeyName: {
      type: String,
      default: null,
    },
    apiKeyCreatedAt: {
      type: Date,
      default: null,
    },

    favorites: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Media", default: [] },
    ],
    downloads: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Media", default: [] },
    ],
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

// Hash automatique du mot de passe avant sauvegarde
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeJSON = function () {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    profileImage: this.profileImage,
    theme: this.theme,
    hasApiKey: !!this.apiKey,
    apiKeyDomain: this.apiKeyDomain,
    apiKeyName: this.apiKeyName,
    favoritesCount: this.favorites?.length || 0,
    downloadsCount: this.downloads?.length || 0,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("User", userSchema);
