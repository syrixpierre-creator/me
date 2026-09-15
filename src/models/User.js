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
    bio: {
      type: String,
      default: "",
      maxlength: 200,
    },
    streamingQuality: {
      type: String,
      enum: ["4k", "1080p", "720p"],
      default: "4k",
    },
    autoplayNext: {
      type: Boolean,
      default: true,
    },
    preferredLanguage: {
      type: String,
      default: "vostfr",
    },
    parentalPin: {
      type: String,
      default: "",
    },
    matureFilter: {
      type: Boolean,
      default: false,
    },
    watchHistory: {
      type: Array,
      default: [],
    },

    // --- Clé API développeur ---
    // null par défaut : générée uniquement à la demande explicite depuis l'écran Profil.
    apiKey: {
      type: String,
      unique: true,
      sparse: true,
      select: false,
    },
    apiKeyDomain: {
      type: String,
      default: null,
    },
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
  if (this.apiKey === null) {
    this.apiKey = undefined;
  }
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
    bio: this.bio || "",
    streamingQuality: this.streamingQuality || "4k",
    autoplayNext: this.autoplayNext !== undefined ? this.autoplayNext : true,
    preferredLanguage: this.preferredLanguage || "vostfr",
    parentalPin: this.parentalPin || "",
    matureFilter: !!this.matureFilter,
    hasApiKey: !!this.apiKey,
    apiKeyDomain: this.apiKeyDomain,
    apiKeyName: this.apiKeyName,
    favoritesCount: this.favorites?.length || 0,
    downloadsCount: this.downloads?.length || 0,
    historyCount: this.watchHistory?.length || 0,
    createdAt: this.createdAt,
  };
};

const MongooseUser = mongoose.models.User || mongoose.model("User", userSchema);

// --- In-Memory Fallback when MongoDB is offline ---
const inMemoryUsers = new Map();

class InMemoryUser {
  constructor(data) {
    this._id = data._id || ("user_" + Math.random().toString(36).substring(2, 10));
    this.username = data.username;
    this.email = (data.email || "").toLowerCase().trim();
    this.password = data.password;
    this.profileImage = data.profileImage || "";
    this.theme = data.theme || "dark";
    this.bio = data.bio || "";
    this.streamingQuality = data.streamingQuality || "4k";
    this.autoplayNext = data.autoplayNext !== undefined ? data.autoplayNext : true;
    this.preferredLanguage = data.preferredLanguage || "vostfr";
    this.parentalPin = data.parentalPin || "";
    this.matureFilter = !!data.matureFilter;
    this.watchHistory = data.watchHistory || [];
    this.apiKey = data.apiKey || null;
    this.apiKeyDomain = data.apiKeyDomain || null;
    this.apiKeyName = data.apiKeyName || null;
    this.apiKeyCreatedAt = data.apiKeyCreatedAt || null;
    this.favorites = data.favorites || [];
    this.downloads = data.downloads || [];
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  async comparePassword(candidate) {
    if (!this.password) return false;
    return bcrypt.compare(candidate, this.password);
  }

  toSafeJSON() {
    return {
      id: this._id,
      username: this.username,
      email: this.email,
      profileImage: this.profileImage,
      theme: this.theme,
      bio: this.bio || "",
      streamingQuality: this.streamingQuality || "4k",
      autoplayNext: this.autoplayNext !== undefined ? this.autoplayNext : true,
      preferredLanguage: this.preferredLanguage || "vostfr",
      parentalPin: this.parentalPin || "",
      matureFilter: !!this.matureFilter,
      hasApiKey: !!this.apiKey,
      apiKeyDomain: this.apiKeyDomain,
      apiKeyName: this.apiKeyName,
      favoritesCount: this.favorites?.length || 0,
      downloadsCount: this.downloads?.length || 0,
      historyCount: this.watchHistory?.length || 0,
      createdAt: this.createdAt,
    };
  }

  async save() {
    this.updatedAt = new Date();
    inMemoryUsers.set(this._id.toString(), this);
    return this;
  }
}

// Pre-seed demo user synchronously
const demoUser = new InMemoryUser({
  _id: "65f0a0000000000000000001",
  username: "SyrixUser",
  email: "demo@syrix.flix",
  password: bcrypt.hashSync("password123", 10),
  theme: "dark",
});
inMemoryUsers.set(demoUser._id.toString(), demoUser);

function createMockQuery(result) {
  const promise = Promise.resolve(result);
  const query = {
    then(onFulfilled, onRejected) {
      return promise.then(onFulfilled, onRejected);
    },
    catch(onRejected) {
      return promise.catch(onRejected);
    },
    finally(onFinally) {
      return promise.finally(onFinally);
    },
    select() {
      return query;
    },
    populate() {
      return query;
    },
    lean() {
      return query;
    },
  };
  return query;
}

const UserProxy = {
  schema: userSchema,
  findOne(query) {
    if (mongoose.connection.readyState === 1) {
      return MongooseUser.findOne(query);
    }
    let user = null;
    for (const u of inMemoryUsers.values()) {
      if (query.$or) {
        const match = query.$or.some((cond) => {
          if (cond.email && u.email.toLowerCase() === cond.email.toLowerCase()) return true;
          if (cond.username && u.username.toLowerCase() === cond.username.toLowerCase()) return true;
          return false;
        });
        if (match) { user = u; break; }
      }
      if (query.email && u.email.toLowerCase() === query.email.toLowerCase()) {
        user = u;
        break;
      }
      if (query.apiKey && u.apiKey === query.apiKey) {
        user = u;
        break;
      }
    }
    return createMockQuery(user);
  },

  findById(id) {
    if (mongoose.connection.readyState === 1) {
      return MongooseUser.findById(id);
    }
    const user = inMemoryUsers.get(String(id)) || null;
    return createMockQuery(user);
  },

  async create(data) {
    if (mongoose.connection.readyState === 1) {
      return MongooseUser.create(data);
    }
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = new InMemoryUser({
      ...data,
      password: hashedPassword,
    });
    await user.save();
    return user;
  },
};

module.exports = UserProxy;
