const mongoose = require("mongoose");

const mediaSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["movie", "series", "anime", "drama"],
      required: true,
    },
    genres: [{ type: String }],
    releaseYear: { type: Number },
    posterUrl: { type: String },
    videoUrl: { type: String },

    // Référence vers le catalogue externe (API SYRIX FLIX), pour retrouver
    // l'item source lors d'un ajout aux favoris/téléchargements depuis l'app.
    sourceSlug: { type: String, index: true },
  },
  { timestamps: true }
);

// Un même slug+type ne doit exister qu'une fois en cache local
mediaSchema.index({ sourceSlug: 1, type: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Media", mediaSchema);
