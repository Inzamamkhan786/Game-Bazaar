const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const normalizeAppPassword = (value) => String(value || '').replace(/\s+/g, '');

/**
 * Creates a Gmail transporter using App Password.
 * No OAuth, no business account — just Gmail + App Password.
 */
const getTransporter = () => {
  const user = process.env.GMAIL_USER;
  const pass = normalizeAppPassword(process.env.GMAIL_APP_PASSWORD);

  if (!user || !pass || user === 'your_gmail@gmail.com') {
    return null; // not configured yet
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
};

const getEmailConfigStatus = () => {
  const user = process.env.GMAIL_USER;
  const pass = normalizeAppPassword(process.env.GMAIL_APP_PASSWORD);

  if (!user || user === 'your_gmail@gmail.com') {
    return { ok: false, message: 'GMAIL_USER is not configured' };
  }

  if (!pass) {
    return { ok: false, message: 'GMAIL_APP_PASSWORD is not configured' };
  }

  return { ok: true, message: 'Gmail credentials are present' };
};

/**
 * Send admin email when a new order is placed.
 * Contains customer WhatsApp number + direct wa.me link to send the game.
 */
const sendNewOrderEmail = async ({
  orderId, customerName, customerEmail, customerWhatsApp,
  gameName, amountPaid, paymentTime,
}) => {
  const transporter = getTransporter();
  if (!transporter) {
    logger.warn('[Email] Gmail not configured — skipping email. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env');
    return;
  }

  const shortId = String(orderId).slice(0, 8).toUpperCase();
  const timeStr = new Date(paymentTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const waLink = `https://wa.me/${customerWhatsApp}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f1f5f9; margin: 0; padding: 20px; }
    .card { background: white; border-radius: 16px; max-width: 520px; margin: 0 auto; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 28px 32px; }
    .header h1 { color: white; margin: 0; font-size: 20px; font-weight: 700; }
    .header p { color: #94a3b8; margin: 4px 0 0; font-size: 13px; }
    .badge { display: inline-block; background: #3b82f6; color: white; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; margin-top: 10px; letter-spacing: 0.5px; }
    .body { padding: 28px 32px; }
    .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
    .row:last-of-type { border-bottom: none; }
    .label { color: #64748b; font-size: 13px; }
    .value { color: #0f172a; font-size: 13px; font-weight: 600; text-align: right; }
    .price { color: #16a34a; font-size: 20px; font-weight: 800; }
    .cta { margin: 24px 0 8px; }
    .wa-btn { display: block; background: #25D366; color: white; text-decoration: none; text-align: center; padding: 14px 24px; border-radius: 12px; font-weight: 700; font-size: 15px; }
    .wa-btn:hover { background: #128C7E; }
    .footer { padding: 16px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px; }
    .step { background: #eff6ff; border-left: 3px solid #3b82f6; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 16px 0; font-size: 13px; color: #1e40af; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>🎮 New Game Order!</h1>
      <p>GameBazaar · ${timeStr}</p>
      <span class="badge">ORDER #${shortId}</span>
    </div>

    <div class="body">
      <div class="row"><span class="label">Customer</span><span class="value">${customerName}</span></div>
      <div class="row"><span class="label">Email</span><span class="value">${customerEmail}</span></div>
      <div class="row"><span class="label">WhatsApp</span><span class="value">+${customerWhatsApp}</span></div>
      <div class="row"><span class="label">Game Ordered</span><span class="value">${gameName}</span></div>
      <div class="row"><span class="label">Amount Paid</span><span class="value price">₹${parseFloat(amountPaid).toFixed(0)}</span></div>

      <div class="step">
        <strong>⚡ Action Required:</strong> Send the game file to the customer on WhatsApp. Tap the button below to open their chat instantly.
      </div>

      <div class="cta">
        <a href="${waLink}" class="wa-btn">
          💬 Open WhatsApp Chat with Customer
        </a>
      </div>
      <p style="font-size:12px; color:#94a3b8; text-align:center; margin:8px 0 0;">
        ${waLink}
      </p>
    </div>

    <div class="footer">
      GameBazaar Admin · After sending the file, mark the order as <strong>Delivered</strong> in your admin panel.
    </div>
  </div>
</body>
</html>
  `;

  const text = `
NEW ORDER — GameBazaar

Order ID: #${shortId}
Customer: ${customerName}
Email: ${customerEmail}
WhatsApp: +${customerWhatsApp}
Game: ${gameName}
Amount Paid: ₹${parseFloat(amountPaid).toFixed(0)}
Time: ${timeStr}

ACTION: Send the game file to this customer on WhatsApp:
${waLink}

After sending, mark the order as Delivered in admin panel.
  `;

  await transporter.sendMail({
    from: `"GameBazaar Orders" <${process.env.GMAIL_USER}>`,
    to: process.env.GMAIL_USER, // send to yourself
    subject: `🎮 New Order #${shortId} — ${gameName} (₹${parseFloat(amountPaid).toFixed(0)})`,
    html,
    text,
  });

  logger.info(`[Email] Admin order email sent for order #${shortId}`);
};

/**
 * Send order confirmation email to customer.
 */
const sendCustomerConfirmationEmail = async ({
  customerEmail, customerName, gameName, orderId, amountPaid,
}) => {
  const transporter = getTransporter();
  if (!transporter) return;

  const shortId = String(orderId).slice(0, 8).toUpperCase();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f1f5f9; margin: 0; padding: 20px; }
    .card { background: white; border-radius: 16px; max-width: 520px; margin: 0 auto; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 28px 32px; text-align: center; }
    .check { font-size: 48px; }
    .header h1 { color: white; margin: 8px 0 0; font-size: 22px; font-weight: 800; }
    .header p { color: #bbf7d0; margin: 4px 0 0; font-size: 14px; }
    .body { padding: 28px 32px; }
    .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
    .label { color: #64748b; font-size: 13px; }
    .value { color: #0f172a; font-size: 13px; font-weight: 600; }
    .info { background: #eff6ff; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 13px; color: #1e40af; line-height: 1.6; }
    .footer { padding: 16px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="check">✅</div>
      <h1>Payment Confirmed!</h1>
      <p>Thank you for your purchase, ${customerName}!</p>
    </div>
    <div class="body">
      <div class="row"><span class="label">Order ID</span><span class="value">#${shortId}</span></div>
      <div class="row"><span class="label">Game</span><span class="value">${gameName}</span></div>
      <div class="row"><span class="label">Amount Paid</span><span class="value" style="color:#16a34a;font-weight:800;">₹${parseFloat(amountPaid).toFixed(0)}</span></div>

      <div class="info">
        📱 <strong>What's next?</strong><br><br>
        Your game file will be sent to your <strong>WhatsApp number</strong> shortly by our team.<br><br>
        Please keep WhatsApp open and ready!
      </div>
    </div>
    <div class="footer">
      GameBazaar · Questions? Reply to this email.
    </div>
  </div>
</body>
</html>
  `;

  await transporter.sendMail({
    from: `"GameBazaar" <${process.env.GMAIL_USER}>`,
    to: customerEmail,
    subject: `✅ Order Confirmed — ${gameName} (#${shortId})`,
    html,
  });

  logger.info(`[Email] Customer confirmation sent to ${customerEmail}`);
};

/**
 * Test the Gmail connection
 */
const testEmailConnection = async () => {
  const transporter = getTransporter();
  if (!transporter) {
    return { ok: false, message: 'Gmail credentials not configured in .env' };
  }
  try {
    await transporter.verify();
    return { ok: true, message: 'Gmail connection successful' };
  } catch (err) {
    return { ok: false, message: err.message };
  }
};

module.exports = { sendNewOrderEmail, sendCustomerConfirmationEmail, testEmailConnection, getEmailConfigStatus };
