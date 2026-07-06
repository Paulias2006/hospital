import mongoose from 'mongoose';

const insuranceSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    insuranceType: {
      type: String,
      enum: ['AMU', 'INAM', 'ASCOMA', 'GRAS SAVOYE', 'SALAM', 'OLEA', 'GTA', 'TRANSVIE', 'SUNU CLASSIQUE', 'SUNU BUDGET'],
      required: true,
    },
    pecs: [
      {
        dateDebut: {
          type: Date,
          required: true,
        },
        dateFin: {
          type: Date,
          required: true,
        },
        prixReel: {
          type: Number,
          required: true,
          min: 0,
        },
        montantPEC: {
          type: Number,
          required: true,
          min: 0,
        },
        statut: {
          type: String,
          enum: ['En attente', 'Accordée', 'Refusée'],
          default: 'En attente',
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    notes: String,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Index pour recherche rapide
insuranceSchema.index({ patient: 1 });
insuranceSchema.index({ insuranceType: 1 });

export default mongoose.model('Insurance', insuranceSchema);
