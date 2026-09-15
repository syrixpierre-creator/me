const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "syrix-flix-super-secret-key-fallback";

function signToken(user) {
  return jwt.sign({ sub: (user._id || user.id).toString() }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d",
  });
}

// POST /api/v1/auth/signup
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: "missing_fields", message: "Champs requis manquants." },
      });
    }
    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: { code: "password_mismatch", message: "Les mots de passe ne correspondent pas." },
      });
    }

    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) {
      return res.status(409).json({
        success: false,
        error: { code: "user_exists", message: "E-mail ou nom d'utilisateur déjà utilisé." },
      });
    }

    const user = await User.create({ username, email, password });
    const token = signToken(user);

    res.status(201).json({ success: true, data: { user: user.toSafeJSON(), token } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: "signup_failed", message: err.message } });
  }
});

// POST /api/v1/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: "missing_fields", message: "E-mail et mot de passe requis." },
      });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        error: { code: "invalid_credentials", message: "E-mail ou mot de passe incorrect." },
      });
    }

    const token = signToken(user);
    res.json({ success: true, data: { user: user.toSafeJSON(), token } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: "login_failed", message: err.message } });
  }
});

module.exports = router;
