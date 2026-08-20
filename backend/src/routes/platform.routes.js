const express = require('express');
const { getPlatformSettings } = require('../services/platformSettings.service');

const router = express.Router();

router.get('/settings', async (req, res) => {
  try {
    const settings = await getPlatformSettings();
    res.json({ siteName: settings.siteName, logo: settings.logo });
  } catch (error) {
    res.status(500).json({ error: 'Could not load platform branding' });
  }
});

module.exports = router;
