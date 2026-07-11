import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import History from '../models/History.js';
import { validateRegister, validateLogin } from '../utils/validators.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authMiddleware } from '../middleware/auth.js';
import logger from '../config/logger.js';
import process from 'process';

const router = express.Router();

/**
 * POST /api/auth/register
 * Créer un nouveau compte utilisateur
 */
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { error, value } = validateRegister(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
        code: 'VALIDATION_ERROR',
      });
    }

    const existingUser = await User.findOne({ email: value.email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email déjà utilisé',
        code: 'EMAIL_EXISTS',
      });
    }

    const user = new User({
      username: value.username,
      email: value.email,
      password: value.password,
      role: 'staff',
    });

    await user.save();

    // Créer un token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    // Enregistrer dans l'historique
    await History.create({
      type: 'Login',
      user: user._id,
      description: `Nouvel utilisateur enregistré: ${user.email}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    logger.info(`Nouvel utilisateur: ${user.email}`);

    res.status(201).json({
      success: true,
      data: {
        token,
        user: user.toJSON(),
      },
      message: 'Utilisateur créé avec succès',
    });
  })
);

/**
 * POST /api/auth/login
 * Se connecter
 */
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { error, value } = validateLogin(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
        code: 'VALIDATION_ERROR',
      });
    }

    const user = await User.findOne({ email: value.email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Identifiants invalides',
        code: 'INVALID_CREDENTIALS',
      });
    }

    const isPasswordValid = await user.comparePassword(value.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Identifiants invalides',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Mettre à jour le dernier login
    user.lastLogin = new Date();
    await user.save();

    // Créer un token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    // Enregistrer dans l'historique
    await History.create({
      type: 'Login',
      user: user._id,
      description: `Connexion: ${user.email}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    logger.info(`Connexion: ${user.email}`);

    res.status(200).json({
      success: true,
      data: {
        token,
        user: user.toJSON(),
      },
      message: 'Connexion réussie',
    });
  })
);

/**
 * GET /api/auth/me
 * Obtenir les infos de l'utilisateur actuel
 */
router.get(
  '/me',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé',
        code: 'USER_NOT_FOUND',
      });
    }

    res.status(200).json({
      success: true,
      data: user.toJSON(),
    });
  })
);

/**
 * POST /api/auth/change-password
 * Changer le mot de passe (auth required)
 */
router.post(
  '/change-password',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Tous les champs sont requis',
        code: 'MISSING_FIELDS',
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Les mots de passe ne correspondent pas',
        code: 'PASSWORD_MISMATCH',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Le mot de passe doit contenir au moins 6 caractères',
        code: 'PASSWORD_TOO_SHORT',
      });
    }

    const user = await User.findById(req.user.userId).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé',
        code: 'USER_NOT_FOUND',
      });
    }

    const isPasswordValid = await user.comparePassword(oldPassword);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'L\'ancien mot de passe est incorrect',
        code: 'INVALID_PASSWORD',
      });
    }

    user.password = newPassword;
    await user.save();

    await History.create({
      type: 'Security',
      user: user._id,
      description: 'Mot de passe modifié',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    logger.info(`Mot de passe modifié pour: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Mot de passe modifié avec succès',
    });
  })
);

/**
 * POST /api/auth/change-email
 * Changer l'email (auth required)
 */
router.post(
  '/change-email',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { oldEmail, newEmail, confirmEmail, password } = req.body;

    if (!oldEmail || !newEmail || !confirmEmail || !password) {
      return res.status(400).json({
        success: false,
        error: 'Tous les champs sont requis',
        code: 'MISSING_FIELDS',
      });
    }

    if (newEmail !== confirmEmail) {
      return res.status(400).json({
        success: false,
        error: 'Les emails ne correspondent pas',
        code: 'EMAIL_MISMATCH',
      });
    }

    if (!/^.+@.+\..+$/.test(newEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Format d\'email invalide',
        code: 'INVALID_EMAIL',
      });
    }

    const user = await User.findById(req.user.userId).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé',
        code: 'USER_NOT_FOUND',
      });
    }

    if (user.email !== oldEmail) {
      return res.status(400).json({
        success: false,
        error: 'L\'ancien email ne correspond pas',
        code: 'EMAIL_MISMATCH',
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Le mot de passe est incorrect',
        code: 'INVALID_PASSWORD',
      });
    }

    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Cet email est déjà utilisé',
        code: 'EMAIL_EXISTS',
      });
    }

    const oldEmailBackup = user.email;
    user.email = newEmail;
    await user.save();

    await History.create({
      type: 'Security',
      user: user._id,
      description: `Email modifié de ${oldEmailBackup} à ${newEmail}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    logger.info(`Email modifié pour: ${oldEmailBackup} → ${newEmail}`);

    res.status(200).json({
      success: true,
      message: 'Email modifié avec succès',
      data: user.toJSON(),
    });
  })
);

export default router;
