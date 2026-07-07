import User from '../models/User.js';
import logger from './logger.js';

export const ensureDefaultAdmin = async () => {
  try {
    const rawEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@hospital.local';
    const email = String(rawEmail).trim().toLowerCase();
    const password = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
    const username = process.env.DEFAULT_ADMIN_USERNAME || 'admin';

    if (!email || !email.includes('@') || !email.includes('.')) {
      logger.warn('⚠️ Email administrateur invalide, création du compte admin ignorée.');
      return null;
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return existing;
    }

    const admin = new User({
      username,
      email,
      password,
      role: 'admin',
    });

    await admin.save();
    logger.info(`✅ Utilisateur administrateur créé: ${email}`);
    return admin;
  } catch (error) {
    logger.warn(`⚠️ Impossible de créer l'administrateur par défaut: ${error.message}`);
    return null;
  }
};
