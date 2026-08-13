const express = require('express');

const jobController = require('../controllers/job.controller');

const router = express.Router();

// Companies are derived from recruiters that currently have open jobs.
router.get('/top', jobController.topCompanies);

module.exports = router;