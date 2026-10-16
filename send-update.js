// send-update.js - One-time simultaneous broadcast script
const fs = require('fs');
const path = require('path');

// Configure your announcement message here:
const UPDATE_TITLE = "🔥 KAUSHALYA COMPUTER CENTRE - SPECIAL UPDATE";
const UPDATE_BODY = "Hello! We have a new announcement or batch schedule available at Kaushalya Computer Centre.\n\nReply 'start' to explore our latest courses and products!";

async function sendOneTimeBroadcast() {
    // 1. Check for Meta API credentials
    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.PHONE_NUMBER_ID;

    if (!token || !phoneNumberId) {
        console.error("❌ Error: WHATSAPP_TOKEN or PHONE_NUMBER_ID environment variables are missing.");
        console.error("Make sure to set them before running this script.");
        process.exit(1);
    }

    // 2. Locate customer database file (matches the /tmp path used by your server)
    const customersFile = path.join('/tmp', 'customers.json');
    if (!fs.existsSync(customersFile)) {
        console.log("⚠️ No customer records found yet in /tmp/customers.json. Nobody has interacted with the bot yet.");
        return;
    }

    let customers = [];
    try {
        customers = JSON.parse(fs.readFileSync(customersFile, 'utf8'));
    } catch (err) {
        console.error("❌ Error reading customer list:", err.message);
        return;
    }

    if (customers.length === 0) {
        console.log("⚠️ Customer list is empty.");
        return;
    }

    const messageText = `*${UPDATE_TITLE}*\n\n${UPDATE_BODY}`;
    console.log(`🚀 Starting simultaneous broadcast to ${customers.length} customer(s)...`);

    // 3. Dispatch messages simultaneously using Promise.all
    const promises = customers.map(async (phone) => {
        try {
            const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: phone,
                    type: 'text',
                    text: { body: messageText }
                })
            });

            const data = await response.json();
            if (response.ok) {
                console.log(`✅ Sent to ${phone}`);
            } else {
                console.error(`❌ Failed for ${phone}:`, JSON.stringify(data));
            }
        } catch (error) {
            console.error(`❌ Network error for ${phone}:`, error.message);
        }
    });

    await Promise.all(promises);
    console.log("🎉 One-time simultaneous broadcast completed!");
}

sendOneTimeBroadcast();
