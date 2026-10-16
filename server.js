const express = require('express');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "smartbiz_secure_token";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;

let userSessions = {};

// DATA-DRIVEN SHOP CONFIGURATION (Lightweight JSON Tree)
/* BOT_CONFIG_START */
const BOT_CONFIG = {
  "welcomeText": "WELCOME TO KAUSHALYA COMPUTER CENTRE! / કૌશલ્યા કોમ્પ્યુટર સેન્ટરમાં સ્વાગત છે!\nPlease select your language / ભાષા પસંદ કરો:\n1. English (ENG)\n2. ગુજરાતી (GUJ)",
  "tree": {
    "1": {
      "title": "English",
      "prompt": "WELCOME TO KAUSHALYA COMPUTER SHOP:\n1. Courses Menu\n2. Laptops & Computers\n\n(Reply with number, '0' for back, '00' for main menu, 'stop' to exit)",
      "children": {
        "1": {
          "title": "Courses",
          "prompt": "Select Courses:\n1. AI & Python Programming\n2. Basic Office & Typing\n\n(Reply '0' for back, '00' for main menu)",
          "children": {}
        }
      }
    },
    "2": {
      "title": "ગુજરાતી",
      "prompt": "કૌશલ્યા કોમ્પ્યુટરમાં આપનું સ્વાગત છે:\n1. કોમ્પ્યુટર કોર્સ\n2. લેપટોપ અને ડેસ્કટોપ\n\n(નંબર મોકલો, પાછા જવા '0', મુખ્ય મેનૂ '00')",
      "children": {}
    }
  }
};
/* BOT_CONFIG_END */

async function sendWhatsAppMessage(to, textBody, phoneNumberId) {
    if (!WHATSAPP_TOKEN) return;
    try {
        await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
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
    } catch (error) {}
}

function resolvePath(tree, path) {
    let currentMap = tree;
    let lastNode = null;
    for (const step of path) {
        if (!currentMap || !currentMap[step]) return null;
        lastNode = currentMap[step];
        currentMap = lastNode.children;
    }
    return { node: lastNode, children: currentMap || {} };
}

app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token && mode === 'subscribe' && token === VERIFY_TOKEN) {
        return res.status(200).send(challenge);
    }
    return res.status(200).send('KCC WhatsApp Shop Engine Active');
});

app.get('/', (req, res) => {
    res.status(200).send('KCC WhatsApp Bot Engine is Active');
});

app.post('/webhook', async (req, res) => {
    try {
        let body = req.body;
        if (body && body.object) {
            let entry = body.entry?.[0]?.changes?.[0]?.value;
            let messaging = entry?.messages?.[0];
            let phoneNumberId = entry?.metadata?.phone_number_id;

            if (messaging && phoneNumberId && messaging.type === 'text') {
                let from = messaging.from;
                let text = (messaging.text?.body || "").toLowerCase().trim().replace(/\.$/, '');
                let reply = "";

                if (text === 'start') {
                    userSessions[from] = { path: [] };
                    reply = BOT_CONFIG.welcomeText;
                } else if (text === 'stop' || text === 'exit') {
                    delete userSessions[from];
                    return res.status(200).send('EVENT_RECEIVED');
                } else if (!userSessions[from]) {
                    return res.status(200).send('EVENT_RECEIVED');
                } else {
                    let currentPath = userSessions[from].path;
                    if (text === '00' || text === 'menu') {
                        if (currentPath.length > 0) {
                            userSessions[from].path = [currentPath[0]];
                            reply = resolvePath(BOT_CONFIG.tree, userSessions[from].path).node?.prompt || BOT_CONFIG.welcomeText;
                        } else { reply = BOT_CONFIG.welcomeText; }
                    } else if (text === '0' || text === 'back') {
                        if (currentPath.length > 1) {
                            currentPath.pop();
                            reply = resolvePath(BOT_CONFIG.tree, currentPath).node?.prompt || BOT_CONFIG.welcomeText;
                        } else {
                            userSessions[from].path = [];
                            reply = BOT_CONFIG.welcomeText;
                        }
                    } else {
                        let targetMap = currentPath.length === 0 ? BOT_CONFIG.tree : (resolvePath(BOT_CONFIG.tree, currentPath)?.children || {});
                        let chosenKey = (currentPath.length === 0 && text.includes('eng')) ? '1' : ((currentPath.length === 0 && text.includes('guj')) ? '2' : text);

                        if (targetMap[chosenKey]) {
                            currentPath.push(chosenKey);
                            reply = resolvePath(BOT_CONFIG.tree, currentPath).node?.prompt || "Selected.";
                        } else {
                            if (isNaN(text) || text.length > 2) {
                                delete userSessions[from];
                                return res.status(200).send('EVENT_RECEIVED');
                            }
                            reply = "Invalid option. Reply with a number, '0' for back, or '00' for main menu.";
                        }
                    }
                }
                if (reply) await sendWhatsAppMessage(from, reply, phoneNumberId);
            }
            return res.status(200).send('EVENT_RECEIVED');
        }
        return res.sendStatus(404);
    } catch (err) {
        return res.status(500).send('Server Error');
    }
});

module.exports = app;
