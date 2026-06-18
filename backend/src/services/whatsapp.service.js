const axios = require('axios');
const logger = require('../utils/logger');

const WHATSAPP_API_BASE = `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || 'v19.0'}`;

/**
 * Send a WhatsApp text message via Meta Cloud API
 */
const sendWhatsAppMessage = async (toNumber, messageText) => {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken ||
      accessToken === 'your_whatsapp_access_token' ||
      phoneNumberId === 'your_phone_number_id') {
    logger.warn('WhatsApp credentials not configured. Logging message instead:');
    logger.info(`[WhatsApp → ${toNumber}]: ${messageText}`);
    return { simulated: true };
  }

  const url = `${WHATSAPP_API_BASE}/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    to: String(toNumber),
    type: 'text',
    text: { body: messageText },
  };

  const response = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    timeout: 10000,
  });

  logger.info(`WhatsApp message sent to ${toNumber}`, { messageId: response.data?.messages?.[0]?.id });
  return response.data;
};

/**
 * Notify ADMIN about a new order.
 * Admin should then share the game file to the customer's WhatsApp.
 */
const notifyAdminNewOrder = async ({
  orderId, customerName, customerEmail, customerWhatsApp, gameName, amountPaid, paymentTime,
}) => {
  const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;
  if (!adminNumber) {
    logger.warn('ADMIN_WHATSAPP_NUMBER not set in .env');
    return;
  }

  const shortId = String(orderId).slice(0, 8).toUpperCase();
  const timeStr = new Date(paymentTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const waLink = `https://wa.me/${customerWhatsApp}`;

  const message =
`🎮 *New Game Order — GameBazaar*

🔖 *Order ID:* #${shortId}
👤 *Customer:* ${customerName}
📧 *Email:* ${customerEmail}
📱 *WhatsApp:* +${customerWhatsApp}
🎯 *Game:* ${gameName}
💰 *Paid:* ₹${parseFloat(amountPaid).toFixed(0)}
🕐 *Time:* ${timeStr}

👇 *Action Required:*
Send the game file to the customer on WhatsApp:
${waLink}

Reply *DELIVERED* after sending the file to close this order.`;

  return await sendWhatsAppMessage(adminNumber, message);
};

/**
 * Notify CUSTOMER after successful payment.
 * Lets them know their order is confirmed and the file is coming soon.
 */
const notifyCustomerOrderConfirmed = async ({
  customerWhatsApp, customerName, gameName, orderId, amountPaid,
}) => {
  const shortId = String(orderId).slice(0, 8).toUpperCase();

  const message =
`✅ *Payment Confirmed — GameBazaar*

Hi ${customerName}! 🎮

Your order has been confirmed. We're preparing your game now.

📦 *Order ID:* #${shortId}
🎯 *Game:* ${gameName}
💰 *Amount Paid:* ₹${parseFloat(amountPaid).toFixed(0)}

⏳ You'll receive the game file on this WhatsApp number shortly.

Thank you for shopping with *GameBazaar*! 🙏`;

  return await sendWhatsAppMessage(customerWhatsApp, message);
};

/**
 * Notify CUSTOMER when admin marks order as DELIVERED.
 */
const notifyCustomerDelivered = async ({
  customerWhatsApp, customerName, gameName, orderId, deliveryNotes,
}) => {
  const shortId = String(orderId).slice(0, 8).toUpperCase();

  const message =
`🎉 *Game Delivered — GameBazaar*

Hi ${customerName}!

Your game is on its way / has been sent!

📦 *Order ID:* #${shortId}
🎮 *Game:* ${gameName}
${deliveryNotes ? `📝 *Note from us:* ${deliveryNotes}` : ''}

Enjoy your game! If you have any issues, reply here. 🕹️

— *Team GameBazaar*`;

  return await sendWhatsAppMessage(customerWhatsApp, message);
};

/**
 * Notify CUSTOMER when order is CANCELLED.
 */
const notifyCustomerCancelled = async ({
  customerWhatsApp, customerName, gameName, orderId, deliveryNotes,
}) => {
  const shortId = String(orderId).slice(0, 8).toUpperCase();

  const message =
`❌ *Order Cancelled — GameBazaar*

Hi ${customerName},

Your order #${shortId} for *${gameName}* has been cancelled.
${deliveryNotes ? `📝 Reason: ${deliveryNotes}` : ''}

If you believe this is a mistake, please contact us.

— *Team GameBazaar*`;

  return await sendWhatsAppMessage(customerWhatsApp, message);
};

/**
 * Legacy wrapper kept for backward compatibility
 */
const notifyAdminWhatsApp = notifyAdminNewOrder;
const notifyUserOrderUpdate = async ({ userWhatsApp, orderId, gameName, status, deliveryNotes, userName }) => {
  if (status === 'DELIVERED') {
    return notifyCustomerDelivered({ customerWhatsApp: userWhatsApp, customerName: userName || 'Customer', gameName, orderId, deliveryNotes });
  }
  if (status === 'CANCELLED') {
    return notifyCustomerCancelled({ customerWhatsApp: userWhatsApp, customerName: userName || 'Customer', gameName, orderId, deliveryNotes });
  }
};

module.exports = {
  sendWhatsAppMessage,
  notifyAdminNewOrder,
  notifyAdminWhatsApp,
  notifyCustomerOrderConfirmed,
  notifyCustomerDelivered,
  notifyCustomerCancelled,
  notifyUserOrderUpdate,
};
