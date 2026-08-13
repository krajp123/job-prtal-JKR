const Candidate = require('../models/Candidate');

const ID_LENGTH = 9;
const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'; // digits + uppercase letters, mixed

function generateRandomId(length = ID_LENGTH) {
  let id = '';
  for (let i = 0; i < length; i++) {
    id += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return id;
}
async function generateUniqueId() {
  let id;
  let exists = true;
  while (exists) {
    id = generateRandomId();
    exists = await Candidate.exists({ uniqueId: id });
  }
  return id;
}

module.exports = { generateUniqueId };