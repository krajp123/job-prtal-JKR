const Dispute = require('../../models/Dispute');
const { logAdminAction } = require('../../services/audit.service');

// GET /admin-api/disputes
exports.list = async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    const disputes = await Dispute.find(query).sort({ createdAt: -1 });
    res.json(disputes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /admin-api/disputes/:id
exports.getById = async (req, res) => {
  try {
    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) return res.status(404).json({ error: 'Dispute not found' });
    res.json(dispute);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /admin-api/disputes/:id/resolve  body: { status, resolutionNotes }
exports.resolve = async (req, res) => {
  try {
    const { status, resolutionNotes } = req.body;

    const dispute = await Dispute.findByIdAndUpdate(
      req.params.id,
      { status, resolutionNotes, resolvedByAdmin: req.admin.id },
      { new: true }
    );

    if (!dispute) return res.status(404).json({ error: 'Dispute not found' });

    await logAdminAction({
      adminId: req.admin.id,
      action: 'RESOLVE_DISPUTE',
      targetType: 'Dispute',
      targetId: dispute._id,
      details: { status, resolutionNotes },
      ip: req.ip,
    });

    res.json(dispute);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
