import mongoose from 'mongoose';

const historySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Admission', 'Sortie', 'Modification', 'Paiement', 'Login', 'PEC', 'Export'],
      required: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    description: {
      type: String,
      required: true,
    },
    details: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
    status: {
      type: String,
      enum: ['success', 'error', 'warning'],
      default: 'success',
    },
  },
  { timestamps: true }
);

// Index pour recherches rapides
historySchema.index({ patient: 1, createdAt: -1 });
historySchema.index({ user: 1, createdAt: -1 });
historySchema.index({ type: 1 });
historySchema.index({ createdAt: -1 });

export default mongoose.model('History', historySchema);
