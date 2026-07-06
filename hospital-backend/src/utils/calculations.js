export const TARIFS_NON_ASSURE = {
  Standard: parseInt(process.env.TARIF_STANDARD) || 10000,
  Individuelle: parseInt(process.env.TARIF_INDIVIDUELLE) || 23000,
  Commune: parseInt(process.env.TARIF_COMMUNE) || 8000,
  VIP: parseInt(process.env.TARIF_VIP) || 35000,
  Réanimation: parseInt(process.env.TARIF_REANIMATION) || 100000,
  Pédiatrie: parseInt(process.env.TARIF_PEDIATRIE) || 12000,
  Urgence: parseInt(process.env.TARIF_URGENCE) || 15000,
};

/**
 * Compte le nombre de NUITÉES (sans compter le jour d'admission)
 * Ex: admission 01/07, fin 06/07 => 5 nuitées
 */
export const countNights = (dateAdmission, dateEnd = new Date()) => {
  const admission = new Date(dateAdmission);
  admission.setHours(0, 0, 0, 0);
  
  const end = new Date(dateEnd);
  end.setHours(0, 0, 0, 0);
  
  // Pas de facture le jour d'admission
  admission.setDate(admission.getDate() + 1);
  
  const diffMs = end - admission;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  return diffDays < 0 ? 0 : diffDays;
};

/**
 * Obtient la PEC (Prise en Charge) active pour une date donnée
 */
export const getPecForDate = (insurances, checkDate) => {
  if (!insurances || insurances.pecs.length === 0) return null;

  const date = new Date(checkDate);
  date.setHours(0, 0, 0, 0);

  const activePec = insurances.pecs.find((pec) => {
    if (pec.statut !== 'Accordée') return false;

    const debut = new Date(pec.dateDebut);
    debut.setHours(0, 0, 0, 0);

    const fin = new Date(pec.dateFin);
    fin.setHours(0, 0, 0, 0);

    return date >= debut && date <= fin;
  });

  return activePec || null;
};

/**
 * Calcule le montant d'une nuitée pour un patient à une date donnée
 */
export const calculatePaymentForDay = (patient, insuranceData, checkDate, roomType) => {
  const type = roomType || patient.typeChambre;

  // Réanimation = JAMAIS assurée (tarif fixe 100k)
  if (type === 'Réanimation') {
    return TARIFS_NON_ASSURE.Réanimation;
  }

  // Non assuré
  if (patient.statut === 'Non Assuré' || !insuranceData) {
    return TARIFS_NON_ASSURE[type] || TARIFS_NON_ASSURE.Standard;
  }

  // Assuré: vérifier PEC active
  const pec = getPecForDate(insuranceData, checkDate);

  if (!pec) {
    // Pas de PEC active = basculer auto en non assuré
    return TARIFS_NON_ASSURE[type] || TARIFS_NON_ASSURE.Standard;
  }

  // PEC active = patient paie la différence
  const montantPatient = pec.prixReel - pec.montantPEC;
  return montantPatient < 0 ? 0 : montantPatient;
};

/**
 * Format une date en YYYY-MM-DD
 */
export const formatDateISO = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Génère les paiements pour un patient
 */
export const generatePaymentsForPatient = (patient, insuranceData, endDate = new Date()) => {
  const payments = [];
  const admission = new Date(patient.dateAdmission);

  // Première nuitée = lendemain de l'admission
  let current = new Date(admission);
  current.setDate(current.getDate() + 1);
  current.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    const dateStr = formatDateISO(current);
    const montant = calculatePaymentForDay(patient, insuranceData, current, patient.typeChambre);
    const pec = getPecForDate(insuranceData, current);

    payments.push({
      patient: patient._id,
      date: new Date(dateStr),
      montantCalcule: montant,
      pecActive: pec
        ? {
            prixReel: pec.prixReel,
            montantPEC: pec.montantPEC,
            insuranceType: insuranceData.insuranceType,
          }
        : null,
      paye: false,
    });

    current.setDate(current.getDate() + 1);
  }

  return payments;
};

/**
 * Calcule les statistiques de paiement pour un patient
 */
export const getPaymentStats = (payments) => {
  let totalDays = 0;
  let paidDays = 0;
  let unpaidDays = 0;
  let totalAmount = 0;
  let paidAmount = 0;
  let unpaidAmount = 0;

  payments.forEach((payment) => {
    totalDays++;
    const amount = payment.montantReel || payment.montantCalcule;
    totalAmount += amount;

    if (payment.paye) {
      paidDays++;
      paidAmount += amount;
    } else {
      unpaidDays++;
      unpaidAmount += amount;
    }
  });

  return {
    totalDays,
    paidDays,
    unpaidDays,
    totalAmount,
    paidAmount,
    unpaidAmount,
  };
};
