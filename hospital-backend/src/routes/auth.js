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

export default router;
