const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGO_URI;
  mongoose.set("strictQuery", true);
  mongoose.set("bufferCommands", false);

  if (!uri) {
    console.warn("[MongoDB] MONGO_URI non configuré — fonctionnement en mode mémoire/secours.");
    return;
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
    console.log(`[MongoDB] Connecté → ${mongoose.connection.name}`);

    // Initialiser l'utilisateur démo si absent
    try {
      const bcrypt = require("bcryptjs");
      const col = mongoose.connection.collection("users");
      const exists = await col.findOne({ email: "demo@syrix.flix" });
      if (!exists) {
        await col.insertOne({
          username: "SyrixUser",
          email: "demo@syrix.flix",
          password: await bcrypt.hash("password123", 12),
          profileImage: "",
          theme: "dark",
          favorites: [],
          downloads: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log("[MongoDB] Utilisateur démo initialisé (demo@syrix.flix)");
      }
    } catch (e) {
      console.warn("[MongoDB] Init démo:", e.message);
    }

    mongoose.connection.on("error", (err) => {
      console.warn("[MongoDB] Erreur de connexion:", err.message);
    });
  } catch (err) {
    console.warn("[MongoDB] Impossible de se connecter à MongoDB — fonctionnement en mode mémoire/secours:", err.message);
  }
}

module.exports = connectDB;

