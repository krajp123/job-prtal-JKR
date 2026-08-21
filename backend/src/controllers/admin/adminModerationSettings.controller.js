const PlatformSettings = require('../../models/PlatformSettings');
const { getPlatformSettings } = require('../../services/platformSettings.service');

function normalizeKeywords(value) {
  if (!Array.isArray(value)) throw Object.assign(new Error('flaggedKeywords must be an array'), { status: 400 });
  const keywords = [...new Set(value
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean))];
  if (keywords.length > 100) throw Object.assign(new Error('You can configure up to 100 keywords'), { status: 400 });
  return keywords;
}

exports.get = async (req, res) => {
  try {
    const settings = await getPlatformSettings();
    res.json({ moderation: settings.moderation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const updates = {};
    if (req.body.flaggedKeywords !== undefined) updates['moderation.flaggedKeywords'] = normalizeKeywords(req.body.flaggedKeywords);
    if (req.body.autoSuspendThreshold !== undefined) {
      const threshold = Number(req.body.autoSuspendThreshold);
      if (!Number.isInteger(threshold) || threshold < 1 || threshold > 1000) {
        return res.status(400).json({ error: 'Auto-suspend threshold must be a whole number from 1 to 1000' });
      }
      updates['moderation.autoSuspendThreshold'] = threshold;
    }
    if (!Object.keys(updates).length) return res.status(400).json({ error: 'No moderation settings provided' });
    const saved = await PlatformSettings.findOneAndUpdate(
      { key: 'default' },
      { $set: updates, $setOnInsert: { key: 'default' } },
      { new: true, upsert: true, runValidators: true }
    ).lean();
    res.json({ moderation: saved.moderation });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};
