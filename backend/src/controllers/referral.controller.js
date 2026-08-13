const Candidate = require('../models/Candidate');

// GET /api/referral/:uniqueId (recruiter only) - identity check by unique ID
// Lets a recruiter look up a referred candidate directly, without a full search.
exports.lookupByUniqueId = async (req, res) => {
  try {
    const candidate = await Candidate.findOne({ uniqueId: req.params.uniqueId }).select(
      '-passwordHash -phone'
    );

    if (!candidate) {
      return res.status(404).json({ error: 'No candidate found with this unique ID' });
    }

    res.json(candidate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
