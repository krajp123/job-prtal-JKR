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

// Plain, minimal styling only — no cards, no gradients, no colour blocks.
// This mirrors how HR/ATS systems at large companies (TCS, Infosys, Wipro,
// Capgemini, Accenture, etc.) actually format their mail: black text on
// white, a simple font, and a thin rule to separate the signature block.
function baseStyles() {
  return `
    body { font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #1a1a1a; line-height: 1.6; margin: 0; padding: 0; }
    .wrapper { max-width: 620px; margin: 0 auto; padding: 24px; }
    p { margin: 0 0 14px; }
    table.details { border-collapse: collapse; margin: 14px 0 18px; }
    table.details td { padding: 3px 10px 3px 0; vertical-align: top; font-size: 14px; }
    table.details td.label { color: #444444; width: 130px; }
    .rule { border: none; border-top: 1px solid #cccccc; margin: 20px 0; }
    .signature { margin-top: 4px; }
    .disclaimer { font-size: 11.5px; color: #777777; margin-top: 22px; }
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
          <p>Hello,</p>

          <p>Thank you for registering with Career Route Portal. To complete your ${type} verification, please use the verification code below:</p>

          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 16px; color: #666;">Your verification code:</p>
            <p style="margin: 10px 0 0 0; font-size: 32px; font-weight: bold; color: #1a1a1a; letter-spacing: 4px;">${otp}</p>
          </div>

          <p>This code expires in 5 minutes. Do not share this code with anyone.</p>

          <p>If you did not request this verification, please ignore this email.</p>

          <hr class="rule">

          <div class="signature">
            <p>
              Regards,<br>
              Career Route Portal Team
            </p>
          </div>

          <p class="disclaimer">This is a system-generated email for your account verification. Please do not reply to this email.</p>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"Career Route Portal" <${EMAIL_USER}>`,
      to: candidateEmail,
      subject: `Your Career Route Portal ${type} Verification Code`,
      html: htmlContent,
      text: `Your verification code is ${otp}. It expires in 5 minutes. Do not share this code with anyone.`,
    });

    console.log(`✅ OTP email sent to ${candidateEmail}`);
    return { sent: true };
  } catch (error) {
    console.error(`❌ Failed to send OTP email to ${candidateEmail}:`, error.message);
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
          <p>Dear ${candidateName},</p>

          <p>Greetings from ${companyName}.</p>

          <p>Thank you for applying for the position of <strong>${jobTitle}</strong> with us. We are pleased to inform you that your profile has been shortlisted for the next stage of our selection process.</p>

          <table class="details">
            <tr><td class="label">Position</td><td>: ${jobTitle}</td></tr>
            <tr><td class="label">Company</td><td>: ${companyName}</td></tr>
            <tr><td class="label">Recruiter</td><td>: ${recruiterName}</td></tr>
          </table>

          <p>Our recruitment team will contact you shortly with further details regarding the next steps. We request you to keep checking your email and phone for updates.</p>

          <p>Should you have any queries, please feel free to write back to us.</p>

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
      subject: `Shortlisted for ${jobTitle} - ${companyName}`,
      html: htmlContent,
      text: `Dear ${candidateName},\n\nGreetings from ${companyName}.\n\nThank you for applying for the position of ${jobTitle} with us. We are pleased to inform you that your profile has been shortlisted for the next stage of our selection process.\n\nPosition: ${jobTitle}\nCompany: ${companyName}\nRecruiter: ${recruiterName}\n\nOur recruitment team will contact you shortly with further details regarding the next steps.\n\nRegards,\n${recruiterName}\nHuman Resources\n${companyName}`,
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

module.exports = { sendEmail, sendOtpEmail, sendShortlistEmail, sendInterviewScheduleEmail, sendOfferEmail, sendRejectionEmail };