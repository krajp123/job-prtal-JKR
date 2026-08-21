const crypto = require('crypto');
const AdminSession = require('../models/AdminSession');
const { getPlatformSettings } = require('./platformSettings.service');

function getRequestIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || '';
}

function getDevice(userAgent = '') {
  if (/iphone|ipad|ios/i.test(userAgent)) return 'Safari · iPhone';
  if (/android/i.test(userAgent)) return 'Chrome · Android';
  if (/edg/i.test(userAgent)) return 'Edge · Windows';
  if (/firefox/i.test(userAgent)) return 'Firefox · Windows';
  if (/chrome/i.test(userAgent)) return 'Chrome · Windows';
  return 'Unknown device';
}

async function createAdminSession(req, adminId) {
  const tokenId = crypto.randomBytes(24).toString('hex');
  const userAgent = req.get('user-agent') || '';
  const settings = await getPlatformSettings();
  const sessionTimeoutMinutes = Number(settings.sessionTimeout) || 30;
  const expiresAt = new Date(Date.now() + sessionTimeoutMinutes * 60 * 1000);
  const session = await AdminSession.create({
    admin: adminId,
    tokenId,
    device: getDevice(userAgent),
    userAgent,
    ip: getRequestIp(req),
    expiresAt,
  });
  return session;
}

async function touchAdminSession(session) {
  if (session) {
    session.lastActiveAt = new Date();
    await session.save();
  }
}

module.exports = { createAdminSession, touchAdminSession, getRequestIp };
