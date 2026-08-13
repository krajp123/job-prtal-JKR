function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  // Basic check for a 10-15 digit phone number, optional leading +
  return /^\+?[0-9]{10,15}$/.test(phone);
}

function isStrongEnoughPassword(password) {
  if (typeof password !== 'string' || password.length < 8) return false;
  const checks = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/];
  const met = checks.filter((re) => re.test(password)).length;
  return met >= 3; // length + at least 3 of: lowercase, uppercase, number, symbol
}

module.exports = { isValidEmail, isValidPhone, isStrongEnoughPassword };