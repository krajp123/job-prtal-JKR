const nodemailer = require('nodemailer');

const { EMAIL_USER, EMAIL_APP_PASSWORD } = process.env;

let transporter = null;
if (EMAIL_USER && EMAIL_APP_PASSWORD) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_APP_PASSWORD, // Gmail App Password, NOT your normal Gmail password
    },
  });
  console.log('✅ Email service initialized successfully with:', EMAIL_USER);
} else {
  console.warn('⚠️ Email is not configured (EMAIL_USER / EMAIL_APP_PASSWORD missing). Emails are logged, not sent.');
  console.warn('   EMAIL_USER:', EMAIL_USER);
  console.warn('   EMAIL_APP_PASSWORD:', EMAIL_APP_PASSWORD ? '***set***' : '***NOT SET***');
}

// Formal business letter style for professional corporate correspondence
function baseStyles() {
  return `
    body {
      margin: 0;
      padding: 0;
      font-family: 'Calibri', 'Arial', sans-serif;
      color: #000000;
      line-height: 1.5;
    }
    .wrapper {
      max-width: 680px;
      margin: 0 auto;
      padding: 40px 30px;
      background: #ffffff;
    }
    .letterhead {
      border-bottom: 2px solid #1b1b1b;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    .company-name {
      font-size: 20px;
      font-weight: bold;
      color: #000000;
      margin: 0 0 4px 0;
    }
    .company-info {
      font-size: 12px;
      color: #333333;
      margin: 2px 0;
    }
    .date {
      font-size: 13px;
      color: #000000;
      margin: 20px 0 24px 0;
    }
    .recipient {
      font-size: 13px;
      color: #000000;
      margin: 0 0 24px 0;
    }
    .recipient p {
      margin: 2px 0;
    }
    .subject {
      font-weight: bold;
      font-size: 13px;
      margin: 20px 0 16px 0;
      color: #000000;
    }
    .salutation {
      font-size: 13px;
      color: #000000;
      margin: 0 0 16px 0;
    }
    .body-text {
      font-size: 13px;
      color: #000000;
      margin: 0 0 12px 0;
      text-align: justify;
    }
    .cta-box {
      background: #f5f5f5;
      border-left: 3px solid #1b1b1b;
      padding: 14px 16px;
      margin: 18px 0;
      font-size: 13px;
      color: #000000;
    }
    .button {
      display: inline-block;
      background: #1b1b1b;
      color: #ffffff !important;
      text-decoration: none;
      font-size: 13px;
      font-weight: bold;
      padding: 10px 20px;
      border-radius: 3px;
      margin: 12px 0;
    }
    .closing {
      font-size: 13px;
      color: #000000;
      margin: 28px 0 8px 0;
    }
    .signature {
      font-size: 13px;
      color: #000000;
      margin: 0;
      font-weight: bold;
    }
    .disclaimer {
      font-size: 11px;
      color: #666666;
      margin-top: 20px;
      border-top: 1px solid #cccccc;
      padding-top: 12px;
    }
    a {
      color: #0066cc;
      text-decoration: underline;
    }
  `;
}

async function sendEmail({ to, subject, body, html }) {
  if (!transporter) {
    console.log(`[email.service] Would send email to ${to} | Subject: ${subject}`);
    return { sent: false, to, subject };
  }

  const mailOptions = {
    from: `"Career Route Portal" <${EMAIL_USER}>`,
    to,
    subject,
  };

  // Support both HTML and plain text
  if (html) {
    mailOptions.html = html;
    mailOptions.text = body; // Fallback plain text
  } else {
    mailOptions.text = body;
  }

  await transporter.sendMail(mailOptions);

  return { sent: true, to, subject };
}

/**
 * Send OTP verification email to candidate
 */
async function sendOtpEmail(candidateEmail, otp, type = 'email') {
  try {
    if (!candidateEmail) {
      console.error('❌ OTP email - Missing candidateEmail');
      return { sent: false, error: 'Missing candidate email' };
    }

    if (!transporter) {
      console.warn(`⚠️ Transporter not initialized. Would send OTP email to ${candidateEmail} with code: ${otp}`);
      return { sent: false, error: 'Email service not configured' };
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>${baseStyles()}</style>
      </head>
      <body>
        <div class="wrapper">
          <div class="letterhead">
            <p class="company-name">Career Route Portal</p>
            <p class="company-info">Professional Recruitment Solutions</p>
          </div>

          <p class="date">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <p class="subject">Subject: ${type} Verification Code</p>

          <p class="salutation">Hello,</p>

          <p class="body-text">Thank you for registering with Career Route Portal. To complete your ${type} verification, please use the verification code provided below:</p>

          <div class="cta-box" style="text-align: center; font-size: 14px;">
            <p style="margin: 0 0 8px 0; color: #666666;">Your Verification Code:</p>
            <p style="margin: 0; font-size: 28px; font-weight: bold; color: #000000; letter-spacing: 3px; font-family: 'Courier New', monospace;">${otp}</p>
          </div>

          <p class="body-text">This code is valid for 5 minutes. Please do not share this code with anyone.</p>

          <p class="body-text">If you did not request this verification, please ignore this email.</p>

          <p class="closing">Yours sincerely,</p>

          <p class="signature">Career Route Portal<br>Registration Team</p>

          <p class="disclaimer">This is a system-generated email for your account verification. Please do not reply to this message.</p>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"Career Route Portal" <${EMAIL_USER}>`,
      to: candidateEmail,
      subject: `${type} Verification Code - Career Route Portal`,
      html: htmlContent,
      text: `Career Route Portal - ${type} Verification Code\n\nHello,\n\nThank you for registering with Career Route Portal. Your verification code is: ${otp}\n\nThis code is valid for 5 minutes. Do not share this code with anyone. If you did not request this verification, please ignore this email.\n\nYours sincerely,\nCareer Route Portal Registration Team`,
    });

    console.log(`✅ OTP email sent to ${candidateEmail}`);
    return { sent: true };
  } catch (error) {
    console.error(`❌ Failed to send OTP email to ${candidateEmail}:`, error.message);
    return { sent: false, error: error.message };
  }
}

async function sendPasswordResetLinkEmail(candidateEmail, resetToken, candidateName = 'Candidate') {
  try {
    if (!candidateEmail) {
      console.error('❌ Password reset email - Missing candidateEmail');
      return { sent: false, error: 'Missing candidate email' };
    }

    if (!resetToken) {
      console.error('❌ Password reset email - Missing reset token');
      return { sent: false, error: 'Missing reset token' };
    }

    const frontendBaseUrl = process.env.FRONTEND_URL || process.env.PUBLIC_FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendBaseUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(candidateEmail)}`;

    if (!transporter) {
      console.warn(`⚠️ Transporter not initialized. Would send password reset link to ${candidateEmail}: ${resetUrl}`);
      return { sent: false, error: 'Email service not configured' };
    }

    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>${baseStyles()}</style>
      </head>
      <body>
        <div class="wrapper">
          <div class="letterhead">
            <p class="company-name">Career Route Portal</p>
            <p class="company-info">Professional Recruitment Solutions</p>
          </div>

          <p class="date">${dateStr}</p>

          <div class="recipient">
            <p>[${candidateName}]</p>
          </div>

          <p class="subject">Subject: Password Reset Request</p>

          <p class="salutation">Dear ${candidateName},</p>

          <p class="body-text">We have received a request to reset the password for your Career Route Portal account. To proceed with resetting your password, please click the button below. This link is valid for 15 minutes from the time this email was sent.</p>

          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset My Password</a>
          </div>

          <p class="body-text" style="font-size: 12px; color: #555555;">If the button above does not work, copy and paste the following link into your browser:<br><a href="${resetUrl}">${resetUrl}</a></p>

          <p class="body-text">If you did not request a password reset, please disregard this email. Your account will remain secure, and no changes will be made without your authorization.</p>

          <p class="closing">Yours sincerely,</p>

          <p class="signature">Career Route Portal<br>Recruitment Team</p>

          <p class="disclaimer">This is a system-generated email. Please do not reply to this message. For support, please visit our website or contact our support team.</p>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"Career Route Portal" <${EMAIL_USER}>`,
      to: candidateEmail,
      subject: 'Password Reset Request - Career Route Portal',
      html: htmlContent,
      text: `Career Route Portal - Password Reset Request\n\nDear ${candidateName},\n\nWe have received a request to reset the password for your Career Route Portal account. Please use this link to reset your password: ${resetUrl}\n\nThis link is valid for 15 minutes. If you did not request this reset, please ignore this email.\n\nYours sincerely,\nCareer Route Portal Recruitment Team`,
    });

    console.log(`✅ Password reset email sent to ${candidateEmail}`);
    return { sent: true };
  } catch (error) {
    console.error(`❌ Failed to send password reset email to ${candidateEmail}:`, error.message);
    return { sent: false, error: error.message };
  }
}

async function sendCandidateAccountStatusEmail(candidateEmail, candidateName, status, reason = '') {
  try {
    if (!candidateEmail) {
      console.error('❌ Account status email - Missing candidateEmail');
      return { sent: false, error: 'Missing candidate email' };
    }

    if (!transporter) {
      console.warn(`⚠️ Transporter not initialized. Would send account status email to ${candidateEmail}`);
      return { sent: false, error: 'Email service not configured' };
    }

    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    let htmlContent, emailSubject, textContent;

    if (status === 'active') {
      // Activation email - positive message
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>${baseStyles()}</style>
        </head>
        <body>
          <div class="wrapper">
            <div class="letterhead">
              <p class="company-name">Career Route Portal</p>
              <p class="company-info">Professional Recruitment Solutions</p>
            </div>

            <p class="date">${dateStr}</p>

            <div class="recipient">
              <p>[${candidateName || 'Valued Candidate'}]</p>
            </div>

            <p class="subject">Subject: Account Reactivation Notice</p>

            <p class="salutation">Dear ${candidateName || 'Candidate'},</p>

            <p class="body-text">We are pleased to inform you that your Career Route Portal account has been <strong>reactivated</strong> and is now fully accessible. You can now log in and resume your job search activities.</p>

            <p class="body-text">If you have any questions or need any assistance, please feel free to contact our support team. We are here to help you succeed in your career journey.</p>

            <p class="closing">Yours sincerely,</p>

            <p class="signature">Career Route Portal<br>Support Team</p>

            <p class="disclaimer">This is a system-generated notification regarding your account status. Please do not reply to this message. For support inquiries, contact us through the Career Route Portal website.</p>
          </div>
        </body>
        </html>
      `;
      emailSubject = 'Account Reactivation Notice - Career Route Portal';
      textContent = `Career Route Portal - Account Reactivation Notice\n\nDear ${candidateName || 'Candidate'},\n\nWe are pleased to inform you that your Career Route Portal account has been reactivated and is now fully accessible.\n\nYou can now log in and resume your job search activities.\n\nYours sincerely,\nCareer Route Portal Support Team`;
    } else {
      // Suspension/Ban email - neutral message without reason
      const cleanStatus = status === 'banned' ? 'Banned' : 'Suspended';
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>${baseStyles()}</style>
        </head>
        <body>
          <div class="wrapper">
            <div class="letterhead">
              <p class="company-name">Career Route Portal</p>
              <p class="company-info">Professional Recruitment Solutions</p>
            </div>

            <p class="date">${dateStr}</p>

            <div class="recipient">
              <p>[${candidateName || 'Valued Candidate'}]</p>
            </div>

            <p class="subject">Subject: Account ${cleanStatus} Notice</p>

            <p class="salutation">Dear ${candidateName || 'Candidate'},</p>

            <p class="body-text">We are writing to inform you that your Career Route Portal account has been <strong>${cleanStatus.toLowerCase()}</strong> effective immediately. This action has been taken in accordance with our Terms of Service and Community Guidelines.</p>

            <p class="body-text">To restore your account or address this matter, please review our Terms of Service and contact our support team for further assistance. We will be happy to review your case and discuss options for reactivation once the concern has been resolved.</p>

            <p class="body-text">If you believe this action has been taken in error, please reach out to our support team immediately for a prompt review.</p>

            <p class="closing">Yours sincerely,</p>

            <p class="signature">Career Route Portal<br>Compliance & Support Team</p>

            <p class="disclaimer">This is a system-generated notification regarding your account status. Please do not reply to this message. For support inquiries, contact us through the Career Route Portal website.</p>
          </div>
        </body>
        </html>
      `;
      emailSubject = `Account ${cleanStatus} Notice - Career Route Portal`;
      textContent = `Career Route Portal - Account ${cleanStatus} Notice\n\nDear ${candidateName || 'Candidate'},\n\nWe are writing to inform you that your Career Route Portal account has been ${cleanStatus.toLowerCase()}.\n\nTo restore your account or address this matter, please contact our support team.\n\nYours sincerely,\nCareer Route Portal Compliance & Support Team`;
    }

    await transporter.sendMail({
      from: `"Career Route Portal" <${EMAIL_USER}>`,
      to: candidateEmail,
      subject: emailSubject,
      html: htmlContent,
      text: textContent,
    });

    console.log(`✅ Account status email sent to ${candidateEmail} (${status})`);
    return { sent: true };
  } catch (error) {
    console.error(`❌ Failed to send account status email to ${candidateEmail}:`, error.message);
    return { sent: false, error: error.message };
  }
}

async function sendShortlistEmail(candidateEmail, candidateName, jobTitle, recruiterName, companyName) {
  try {
    // Validate required parameters
    if (!candidateEmail) {
      console.error('❌ Shortlist email - Missing candidateEmail');
      return { sent: false, error: 'Missing candidate email' };
    }
    if (!jobTitle) {
      console.error('❌ Shortlist email - Missing jobTitle');
      return { sent: false, error: 'Missing job title' };
    }

    if (!transporter) {
      console.warn(`⚠️ Transporter not initialized. Would send shortlist email to ${candidateEmail}`);
      return { sent: false, error: 'Email service not configured' };
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>${baseStyles()}</style>
      </head>
      <body>
        <div class="wrapper">
          <div class="letterhead">
            <p class="company-name">${companyName}</p>
            <p class="company-info">Human Resources Department</p>
          </div>

          <p class="date">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <div class="recipient">
            <p>[${candidateName}]</p>
          </div>

          <p class="subject">Subject: Shortlist Notification - ${jobTitle}</p>

          <p class="salutation">Dear ${candidateName},</p>

          <p class="body-text">Greetings from ${companyName}. Thank you for applying for the position of <strong>${jobTitle}</strong> with us. We are pleased to inform you that your profile has been selected for the next stage of our recruitment process.</p>

          <div class="cta-box">
            <strong>Application Details:</strong><br><br>
            Position: ${jobTitle}<br>
            Company: ${companyName}<br>
            Recruiter: ${recruiterName}
          </div>

          <p class="body-text">Our recruitment team will contact you shortly with further details regarding the next steps. We request you to keep checking your email and phone for updates.</p>

          <p class="body-text">Should you have any queries or require any further information, please feel free to reach out to us.</p>

          <p class="closing">Yours sincerely,</p>

          <p class="signature">${recruiterName}<br>Human Resources<br>${companyName}</p>

          <p class="disclaimer">This is a system-generated email regarding your job application. Please do not reply to this message.</p>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"${companyName} Recruitment" <${EMAIL_USER}>`,
      to: candidateEmail,
      subject: `Shortlist Notification - ${jobTitle} at ${companyName}`,
      html: htmlContent,
      text: `Dear ${candidateName},\n\nGreetings from ${companyName}.\n\nThank you for applying for the position of ${jobTitle} with us. We are pleased to inform you that your profile has been selected for the next stage of our recruitment process.\n\nPosition: ${jobTitle}\nCompany: ${companyName}\nRecruiter: ${recruiterName}\n\nOur recruitment team will contact you shortly with further details regarding the next steps.\n\nYours sincerely,\n${recruiterName}\nHuman Resources\n${companyName}`,
    });

    console.log(`✅ Shortlist email sent to ${candidateEmail}`);
    return { sent: true };
  } catch (error) {
    console.error(`❌ Failed to send shortlist email to ${candidateEmail}:`, error.message);
    return { sent: false, error: error.message };
  }
}

/**
 * Send interview scheduling email to candidate
 */
async function sendInterviewScheduleEmail(candidateEmail, candidateName, jobTitle, recruiterName, companyName, interviewDate, interviewTime) {
  try {
    // Validate required parameters
    if (!candidateEmail) {
      console.error('❌ Interview email - Missing candidateEmail');
      return { sent: false, error: 'Missing candidate email' };
    }
    if (!jobTitle) {
      console.error('❌ Interview email - Missing jobTitle');
      return { sent: false, error: 'Missing job title' };
    }

    if (!transporter) {
      console.warn(`⚠️ Transporter not initialized. Would send interview email to ${candidateEmail}`);
      return { sent: false, error: 'Email service not configured' };
    }

    const formatDate = (date) => {
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(date).toLocaleDateString('en-US', options);
    };

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>${baseStyles()}</style>
      </head>
      <body>
        <div class="wrapper">
          <p>Dear ${candidateName},</p>

          <p>Greetings from ${companyName}.</p>

          <p>This is to inform you that your interview for the position of <strong>${jobTitle}</strong> has been scheduled. Please find the details below.</p>

          <table class="details">
            <tr><td class="label">Position</td><td>: ${jobTitle}</td></tr>
            <tr><td class="label">Company</td><td>: ${companyName}</td></tr>
            <tr><td class="label">Interviewer</td><td>: ${recruiterName}</td></tr>
            <tr><td class="label">Date</td><td>: ${formatDate(interviewDate)}</td></tr>
            <tr><td class="label">Time</td><td>: ${interviewTime}</td></tr>
          </table>

          <p>Kindly join the interview a few minutes in advance. In case you wish to reschedule, please inform us at least 24 hours prior to the scheduled time.</p>

          <p>We advise you to be prepared to discuss your work experience, technical skills, and interest in this role. Please keep a valid photo ID and a copy of your resume handy.</p>

          <p>For any queries, please feel free to contact us.</p>

          <hr class="rule">

          <div class="signature">
            <p>
              Regards,<br>
              ${recruiterName}<br>
              Human Resources<br>
              ${companyName}
            </p>
          </div>

          <p class="disclaimer">This is a system-generated email regarding your job application with ${companyName}. Please do not reply to this email.</p>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"${companyName} Recruitment" <${EMAIL_USER}>`,
      to: candidateEmail,
      subject: `Interview Scheduled - ${jobTitle} - ${companyName}`,
      html: htmlContent,
      text: `Dear ${candidateName},\n\nGreetings from ${companyName}.\n\nThis is to inform you that your interview for the position of ${jobTitle} has been scheduled.\n\nPosition: ${jobTitle}\nCompany: ${companyName}\nInterviewer: ${recruiterName}\nDate: ${formatDate(interviewDate)}\nTime: ${interviewTime}\n\nKindly join a few minutes in advance. If you wish to reschedule, please inform us at least 24 hours prior.\n\nRegards,\n${recruiterName}\nHuman Resources\n${companyName}`,
    });

    console.log(`✅ Interview schedule email sent to ${candidateEmail}`);
    return { sent: true };
  } catch (error) {
    console.error(`❌ Failed to send interview schedule email to ${candidateEmail}:`, error.message);
    return { sent: false, error: error.message };
  }
}

/**
 * Send offer email to candidate with attached offer letter
 */
async function sendOfferEmail(candidateEmail, candidateName, jobTitle, recruiterName, companyName, file) {
  try {
    if (!file) {
      throw new Error('No offer letter file provided');
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>${baseStyles()}</style>
      </head>
      <body>
        <div class="wrapper">
          <p>Dear ${candidateName},</p>

          <p>Greetings from ${companyName}.</p>

          <p>Congratulations. Further to your interview(s) with us, we are pleased to extend an offer of employment for the position of <strong>${jobTitle}</strong> at ${companyName}.</p>

          <table class="details">
            <tr><td class="label">Position</td><td>: ${jobTitle}</td></tr>
            <tr><td class="label">Company</td><td>: ${companyName}</td></tr>
            <tr><td class="label">Recruiter</td><td>: ${recruiterName}</td></tr>
            <tr><td class="label">Attachment</td><td>: ${file.originalname}</td></tr>
          </table>

          <p>Your formal offer letter, containing the detailed terms and conditions of employment, is attached to this email. We request you to go through it carefully and revert with your acceptance or any queries at the earliest.</p>

          <p>We look forward to welcoming you to ${companyName}.</p>

          <hr class="rule">

          <div class="signature">
            <p>
              Regards,<br>
              ${recruiterName}<br>
              Human Resources<br>
              ${companyName}
            </p>
          </div>

          <p class="disclaimer">This is a system-generated email regarding your job application with ${companyName}. Please do not reply to this email.</p>
        </div>
      </body>
      </html>
    `;

    if (!transporter) {
      console.warn(`⚠️ Transporter not initialized. Would send offer letter email to ${candidateEmail} with attachment ${file.originalname}`);
      return { sent: false, error: 'Email service not configured' };
    }

    await transporter.sendMail({
      from: `"${companyName} Recruitment" <${EMAIL_USER}>`,
      to: candidateEmail,
      subject: `Offer of Employment - ${jobTitle} - ${companyName}`,
      html: htmlContent,
      text: `Dear ${candidateName},\n\nGreetings from ${companyName}.\n\nCongratulations. Further to your interview(s) with us, we are pleased to extend an offer of employment for the position of ${jobTitle} at ${companyName}. Your formal offer letter is attached to this email.\n\nRegards,\n${recruiterName}\nHuman Resources\n${companyName}`,
      attachments: [
        {
          filename: file.originalname,
          content: file.buffer,
          contentType: file.mimetype,
        },
      ],
    });

    console.log(`✅ Offer email sent to ${candidateEmail}`);
    return { sent: true };
  } catch (error) {
    console.error(`❌ Failed to send offer email to ${candidateEmail}:`, error.message);
    return { sent: false, error: error.message };
  }
}

/**
 * Send rejection email to candidate
 */
async function sendRejectionEmail(candidateEmail, candidateName, jobTitle, recruiterName, companyName) {
  try {
    // Validate required parameters
    if (!candidateEmail) {
      console.error('❌ Rejection email - Missing candidateEmail');
      return { sent: false, error: 'Missing candidate email' };
    }
    if (!jobTitle) {
      console.error('❌ Rejection email - Missing jobTitle');
      return { sent: false, error: 'Missing job title' };
    }

    if (!transporter) {
      console.warn(`⚠️ Transporter not initialized. Would send rejection email to ${candidateEmail}`);
      return { sent: false, error: 'Email service not configured' };
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>${baseStyles()}</style>
      </head>
      <body>
        <div class="wrapper">
          <p>Dear ${candidateName},</p>

          <p>Greetings from ${companyName}.</p>

          <p>Thank you for applying for the position of <strong>${jobTitle}</strong> at ${companyName}, and for the time you invested in our selection process.</p>

          <table class="details">
            <tr><td class="label">Position</td><td>: ${jobTitle}</td></tr>
            <tr><td class="label">Company</td><td>: ${companyName}</td></tr>
          </table>

          <p>After careful consideration, we regret to inform you that we will not be moving forward with your application for this particular role. This decision was made after evaluating a number of qualified candidates and does not reflect on your abilities or potential.</p>

          <p>We will retain your profile in our database and encourage you to apply for other suitable openings with us in the future.</p>

          <p>We wish you the very best in your career ahead.</p>

          <hr class="rule">

          <div class="signature">
            <p>
              Regards,<br>
              ${recruiterName}<br>
              Human Resources<br>
              ${companyName}
            </p>
          </div>

          <p class="disclaimer">This is a system-generated email regarding your job application with ${companyName}. Please do not reply to this email.</p>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"${companyName} Recruitment" <${EMAIL_USER}>`,
      to: candidateEmail,
      subject: `Application Status - ${jobTitle} - ${companyName}`,
      html: htmlContent,
      text: `Dear ${candidateName},\n\nGreetings from ${companyName}.\n\nThank you for applying for the position of ${jobTitle} at ${companyName}. After careful consideration, we regret to inform you that we will not be moving forward with your application for this role. We will retain your profile and encourage you to apply for future openings.\n\nRegards,\n${recruiterName}\nHuman Resources\n${companyName}`,
    });

    console.log(`✅ Rejection email sent to ${candidateEmail}`);
    return { sent: true };
  } catch (error) {
    console.error(`❌ Failed to send rejection email to ${candidateEmail}:`, error.message);
    return { sent: false, error: error.message };
  }
}

module.exports = {
  sendEmail,
  sendOtpEmail,
  sendPasswordResetLinkEmail,
  sendCandidateAccountStatusEmail,
  sendShortlistEmail,
  sendInterviewScheduleEmail,
  sendOfferEmail,
  sendRejectionEmail,
};