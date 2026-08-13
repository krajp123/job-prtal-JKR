const OfferLetter = require('../../models/OfferLetter');
const Candidate = require('../../models/Candidate');
const { logAdminAction } = require('../../services/audit.service');

// GET /admin-api/badges/pending - offer letters awaiting manual admin review
exports.listPending = async (req, res) => {
  try {
    const pending = await OfferLetter.find({
      signedAcceptanceUrl: { $exists: true },
      confirmedByAdmin: false,
    }).populate({
      path: 'application',
      populate: [{ path: 'candidate', select: '-passwordHash' }, { path: 'job' }],
    });

    res.json(pending);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /admin-api/badges/:offerLetterId/approve - manual override / final confirmation
exports.approve = async (req, res) => {
  try {
    const offerLetter = await OfferLetter.findById(req.params.offerLetterId).populate('application');
    if (!offerLetter) return res.status(404).json({ error: 'Offer letter not found' });

    offerLetter.confirmedByAdmin = true;
    await offerLetter.save();

    const candidate = await Candidate.findByIdAndUpdate(
      offerLetter.application.candidate,
      {
        hiredBadge: {
          isHired: true,
          applicationId: offerLetter.application._id,
          confirmedAt: new Date(),
        },
      },
      { new: true }
    );

    await logAdminAction({
      adminId: req.admin.id,
      action: 'APPROVE_HIRED_BADGE',
      targetType: 'Candidate',
      targetId: candidate._id,
      details: { offerLetterId: offerLetter._id },
      ip: req.ip,
    });

    res.json({ message: 'Badge approved', candidate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /admin-api/badges/:offerLetterId/reject
exports.reject = async (req, res) => {
  try {
    const { reason } = req.body;
    const offerLetter = await OfferLetter.findById(req.params.offerLetterId);
    if (!offerLetter) return res.status(404).json({ error: 'Offer letter not found' });

    await logAdminAction({
      adminId: req.admin.id,
      action: 'REJECT_HIRED_BADGE',
      targetType: 'OfferLetter',
      targetId: offerLetter._id,
      details: { reason },
      ip: req.ip,
    });

    res.json({ message: 'Badge rejected and logged for review' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
