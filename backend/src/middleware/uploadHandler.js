const multer = require('multer');

// Files are held in memory briefly, then streamed to Cloudflare R2 in the controller.
// Section 10 (Assumptions) flags file size limits as an open decision - defaulting
// to 5MB here; adjust once the business confirms a final number.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPG, or PNG files are allowed'), false);
    }
  },
});

// Resume-specific upload: PDF only, 10MB max (Candidate Dashboard spec).
const uploadResume = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Resume must be a PDF file'), false);
    }
  },
});

// Profile-picture upload: images only, 5MB max.
const uploadProfilePicture = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Profile picture must be a JPG, PNG, or WEBP image'), false);
    }
  },
});

module.exports = upload;
module.exports.uploadResume = uploadResume;
module.exports.uploadProfilePicture = uploadProfilePicture;
