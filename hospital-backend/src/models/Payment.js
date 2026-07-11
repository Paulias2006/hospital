import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    
    // Calculs
    montantCalcule: {
      type: Number,
      required: true,
      min: 0,
    },
    montantReel: {
      type: Number,
      default: null,
    },
    
    // Statut
    paye: {
      type: Boolean,
      default: false,
    },
    datePayment: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvalDate: {
      type: Date,
    },
    
    // PEC actif ce jour-là
    pecActive: {
      prixReel: Number,
      montantPEC: Number,
      insuranceType: String,
    },
    
    // Audit
    modifie: {
      type: Boolean,
      default: false,
    },
    modifiePar: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    dateModification: Date,
    
    // Métadonnées
    notes: String,
  },
  { timestamps: true }
);

// Index pour recherches rapides
paymentSchema.index({ patient: 1, date: 1 });
paymentSchema.index({ date: 1 });
paymentSchema.index({ paye: 1 });

export default mongoose.model('Payment', paymentSchema);
