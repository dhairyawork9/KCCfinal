const express = require('express');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "smartbiz_secure_token";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;

let userSessions = {};

// Helper function using native fetch (No axios needed)
async function sendWhatsAppMessage(to, textBody, phoneNumberId) {
    if (!WHATSAPP_TOKEN) {
        console.error("Missing WHATSAPP_TOKEN in Environment Variables.");
        return;
    }
    try {
        const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: to,
                type: 'text',
                text: { body: textBody }
            })
        });

        const data = await response.json();
        if (!response.ok) {
            console.error('Meta API Error:', JSON.stringify(data));
        } else {
            console.log(`Outbound message delivered to ${to}`);
        }
    } catch (error) {
        console.error('Network error sending WhatsApp message:', error.message);
    }
}

// 1. Meta Webhook Verification & Health Check
app.get('/webhook', (req, res) => {
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            return res.status(200).send(challenge);
        } else {
            return res.sendStatus(403);
        }
    }
    return res.status(200).send('KCC Webhook Endpoint Active');
});

// Root fallback
app.get('/', (req, res) => {
    res.status(200).send('KCC WhatsApp Bot Server is Running');
});

// 2. WhatsApp Message Handler
app.post('/webhook', async (req, res) => {
    try {
        let body = req.body;
        if (body.object) {
            let entry = body.entry?.[0]?.changes?.[0]?.value;
            let messaging = entry?.messages?.[0];
            let phoneNumberId = entry?.metadata?.phone_number_id;

            if (messaging && phoneNumberId) {
                let from = messaging.from;
                let text = messaging.text?.body?.toLowerCase().trim() || "";
                let reply = "";

                if (text === 'start' || text.includes('hi') || text.includes('hello')) {
                    delete userSessions[from];
                    reply = "WELCOME TO KAUSHALYA COMPUTER CENTRE! / કૌશલ્યા કોમ્પ્યુટર સેન્ટરમાં સ્વાગત છે!\nPlease select your language / ભાષા પસંદ કરો:\n1. English (ENG)\n2. ગુજરાતી (GUJ)";
                } 
                else if (!userSessions[from]) {
                    if (text === '1' || text.includes('eng')) {
                        userSessions[from] = 'eng';
                        reply = "English selected!\n1. Courses Menu\n2. Products Menu";
                    } else if (text === '2' || text.includes('guj')) {
                        userSessions[from] = 'guj';
                        reply = "ગુજરાતી ભાષા પસંદ થઈ છે!\n1. કોર્સ મેનૂ\n2. પ્રોડક્ટ્સ મેનૂ";
                    } else {
                        reply = "Please select language / ભાષા પસંદ કરો:\n1. English\n2. ગુજરાતી";
                    }
                } 
                else if (userSessions[from] === 'eng') {
                    if (text === '1') {
                        reply = "English Courses:\n- AI & Machine Learning with Python\n- Basic Computer & Hardware";
                    } else if (text === '2') {
                        reply = "English Products:\n- Laptops & Custom Builds";
                    } else {
                        reply = "Invalid option. Type 'start' to restart.";
                    }
                } 
                else if (userSessions[from] === 'guj') {
                    if (text === '1') {
                        reply = "ગુજરાતી કોર્સ:\n- AI અને મશીન લર્નિંગ\n- બેઝિક કોમ્પ્યુટર અને હાર્ડવેર";
                    } else if (text === '2') {
                        reply = "ગુજરાતી પ્રોડક્ટ્સ:\n- લેપટોપ અને ડેસ્કટોપ";
                    } else {
                        reply = "અમાન્ય વિકલ્પ. ફરી શરૂ કરવા માટે 'start' લખો.";
                    }
                }

                if (reply) {
                    await sendWhatsAppMessage(from, reply, phoneNumberId);
                }
            }
            return res.status(200).send('EVENT_RECEIVED');
        }
        return res.sendStatus(404);
    } catch (err) {
        console.error("Webhook processing error:", err);
        return res.status(500).send('Server Error Handled');
    }
});

module.exports = app;
