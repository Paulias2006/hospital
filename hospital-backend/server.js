import dotenv from 'dotenv';
import process from 'process';
import app from './src/app.js';
import connectDB from './src/config/database.js';
import logger from './src/config/logger.js';
import { ensureDefaultAdmin } from './src/config/bootstrap.js';

// Charger les variables d'env
dotenv.config();

const PORT = process.env.PORT || 5000;

// ============================================================================
// CONNEXION À LA BASE DE DONNÉES
// ============================================================================

const startServer = async () => {
  try {
    await connectDB();
    await ensureDefaultAdmin();

    if (process.env.VERCEL) {
      return app;
    }

    app.listen(PORT, () => {
      logger.info(`
╔════════════════════════════════════════════════════════════╗
║     🏥 HÔPITAL EL-ELYON - Système de Gestion         ║
║     Serveur lancé avec succès!                            ║
╠════════════════════════════════════════════════════════════╣
║ URL: http://localhost:${PORT}                          ║
║ Santé: http://localhost:${PORT}/health                 ║
║ API Docs: http://localhost:${PORT}/api                 ║
╠════════════════════════════════════════════════════════════╣
║ Environnement: ${process.env.NODE_ENV || 'development'}
║ Base de données: ${process.env.DB_NAME || 'hospital-elyon'}
║ Authentification: JWT
╚════════════════════════════════════════════════════════════╝
      `);
    });

    return app;
  } catch (error) {
    logger.error(`❌ Erreur au démarrage: ${error.message}`);
    process.exit(1);
  }
};

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`❌ Unhandled Rejection: ${reason}`);
});

process.on('uncaughtException', (error) => {
  logger.error(`❌ Uncaught Exception: ${error.message}`);
  process.exit(1);
});

startServer();

export { startServer };
export default app;
