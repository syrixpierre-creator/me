const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI manquant dans .env");
  }

  mongoose.set("strictQuery", true);

  await mongoose.connect(uri);
  console.log(`[MongoDB] Connecté → ${mongoose.connection.name}`);

  mongoose.connection.on("error", (err) => {
    console.error("[MongoDB] Erreur de connexion:", err.message);
  });
}

module.exports = connectDB;
