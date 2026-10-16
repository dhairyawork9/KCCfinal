const express = require('express');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "smartbiz_secure_token";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;

// In-memory path session tracker
let userSessions = {};

// DATA-DRIVEN RECURSIVE SHOP CONFIGURATION
/* BOT_CONFIG_START */
const BOT_CONFIG = {
  "welcomeText": "WELCOME TO KAUSHALYA COMPUTER CENTRE! / કૌશલ્યા કોમ્પ્યુટર સેન્ટરમાં સ્વાગત છે!\nPlease select your language / ભાષા પસંદ કરો:\n1. English (ENG)\n2. ગુજરાતી (GUJ)",
  "tree": {
    "1": {
      "title": "English",
      "prompt": "WELCOME TO KAUSHALYA COMPUTER SHOP:\n1. Courses Menu\n2. Laptops & Computers\n3. Computer Repairs & Services\n\n(Reply with number, '0' for back, '00' for main menu, 'stop' to exit)",
      "children": {
        "1": {
          "title": "Courses",
          "prompt": "Select Courses:\n1. AI & Python Programming\n2. Basic Office & Typing\n\n(Reply '0' for back, '00' for main menu)",
          "children": {
            "1": {
              "title": "AI & Python",
              "prompt": "AI & Python Masterclass:\n- Duration: 3 Months\n- Projects: Automation & Bot Building\nFee: ₹4,500\n\nReply '0' for back, '00' for main menu, 'stop' to exit.",
              "children": {}
            },
            "2": {
              "title": "Basic Office",
              "prompt": "Basic Computer Course:\n- Word, Excel, PowerPoint, Gujarati Typing\n- Duration: 2 Months\nFee: ₹2,500\n\nReply '0' for back, '00' for main menu, 'stop' to exit.",
              "children": {}
            }
          }
        },
        "2": {
          "title": "Laptops & PCs",
          "prompt": "Choose Hardware Category:\n1. Refurbished Laptops\n2. Custom Built Desktops\n\n(Reply '0' for back, '00' for main menu)",
          "children": {
            "1": {
              "title": "Refurbished Laptops",
              "prompt": "Laptops In Stock:\n- Dell Latitude i5 (8GB/256GB SSD) - ₹15,500\n- HP EliteBook i5 (16GB/512GB SSD) - ₹21,000\nWarranty: 6 Months.\n\nReply '0' for back, '00' for main menu, 'stop' to exit.",
              "children": {}
            },
            "2": {
              "title": "Custom Desktops",
              "prompt": "Custom PC Builds:\n- Office PCs: Starting at ₹12,500\n- Gaming / Editing PCs: Starting at ₹32,000\n\nReply '0' for back, '00' for main menu, 'stop' to exit.",
              "children": {}
            }
          }
        },
        "3": {
          "title": "Repairs & Service",
          "prompt": "Service & Support:\n- Windows OS Installation\n- Printer Cartridge Refill\n- Motherboard Repair\nVisit Shop or Call us directly!\n\nReply '0' for back, '00' for main menu, 'stop' to exit.",
          "children": {}
        }
      }
    },
    "2": {
      "title": "ગુજરાતી",
      "prompt": "કૌશલ્યા કોમ્પ્યુટરમાં આપનું સ્વાગત છે:\n1. કોમ્પ્યુટર કોર્સ\n2. લેપટોપ અને ડેસ્કટોપ\n3. રીપેરિંગ અને સર્વિસ\n\n(નંબર મોકલો, પાછા જવા '0', મુખ્ય મેનૂ '00', બંધ કરવા 'stop')",
      "children": {
        "1": {
          "title": "કોર્સ",
          "prompt": "કોર્સ પસંદ કરો:\n1. પાયથોન અને AI\n2. બેઝિક કોમ્પ્યુટર અને ઓફિસ\n\n(પાછા જવા '0', મુખ્ય મેનૂ '00')",
          "children": {
            "1": {
              "title": "પાયથોન & AI",
              "prompt": "પાયથોન & AI કોર્સ:\n- સમયગાળો: 3 મહિના\n- પ્રોજેક્ટ: વોટ્સએપ બોટ & ઓટોમેશન\nફી: ₹4,500\n\nપાછા જવા '0', મુખ્ય મેનૂ '00', અથવા 'stop' લખો.",
              "children": {}
            },
            "2": {
              "title": "બેઝિક ઓફિસ",
              "prompt": "બેઝિક કોર્સ:\n- MS Office અને ગુજરાતી ટાઈપિંગ\n- સમયગાળો: 2 મહિના\nફી: ₹2,500\n\nપાછા જવા '0', મુખ્ય મેનૂ '00', અથવા 'stop' લખો.",
              "children": {}
            }
          }
        },
        "2": {
          "title": "લેપટોપ & પીસી",
          "prompt": "હાર્ડવેર માહિતી:\n- રીફર્બિશ્ડ લેપટોપ (₹15,500 થી શરૂ)\n- ડેસ્કટોપ પીસી બિલ્ડ (₹12,500 થી શરૂ)\nવોરંટી: 6 મહિના\n\nપાછા જવા '0', મુખ્ય મેનૂ '00', અથવા 'stop' લખો.",
          "children": {}
        },
        "3": {
          "title": "રીપેરિંગ સર્વિસ",
          "prompt": "સર્વિસ:\n- વિન્ડોઝ ઇન્સ્ટોલેશન\n- પ્રિન્ટર રીફિલિંગ\n- હાર્ડવેર રીપેરિંગ\n\nપાછા જવા '0', મુખ્ય મેનૂ '00', અથવા 'stop' લખો.",
          "children": {}
        }
      }
    }
  }
};
/* BOT_CONFIG_END */

// Outbound message dispatcher using native Node.js fetch (Zero external dependencies)
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

// 1. Webhook Verification & Health Check
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            return res.status(200).send(challenge);
        } else {
            return res.sendStatus(403);
        }
    }
    return res.status(200).send('KCC WhatsApp Shop Engine Active');
});

// Root ping
app.get('/', (req, res) => {
    res.status(200).send('KCC WhatsApp Bot Engine is Active');
});

// 2. Incoming Webhook Handler
app.post('/webhook', async (req, res) => {
    try {
        const body = req.body;
        if (body && body.object) {
            const entry = body.entry?.[0]?.changes?.[0]?.value;
            const messaging = entry?.messages?.[0];
            const phoneNumberId = entry?.metadata?.phone_number_id;

            if (messaging && phoneNumberId && messaging.type === 'text') {
                const from = messaging.from;
                const text = (messaging.text?.body || "").toLowerCase().trim();
                let reply = "";

                // RULE 1: Global start/reset
                if (text === 'start') {
                    userSessions[from] = { path: [] };
                    reply = BOT_CONFIG.welcomeText;
                }
                // RULE 2: Session exit
                else if (text === 'stop' || text === 'exit' || text === 'bye') {
                    if (userSessions[from]) {
                        delete userSessions[from];
                        reply = "Thank you for visiting Kaushalya Computer Centre! Session ended.\nધન્યવાદ! સત્ર સમાપ્ત થયું છે.\n\nSend 'start' anytime to reopen.";
                    } else {
                        return res.status(200).send('EVENT_RECEIVED');
                    }
                }
                // RULE 3: Completely silent to random messages if idle
                else if (!userSessions[from]) {
                    return res.status(200).send('EVENT_RECEIVED');
                }
                // RULE 4: Main Menu Jump ('00' or 'menu')
                else if (text === '00' || text === 'menu' || text === 'main') {
                    if (userSessions[from].path.length > 0) {
                        userSessions[from].path = [userSessions[from].path[0]];
                        const resolved = resolvePath(BOT_CONFIG.tree, userSessions[from].path);
                        reply = resolved?.node?.prompt || BOT_CONFIG.welcomeText;
                    } else {
                        reply = BOT_CONFIG.welcomeText;
                    }
                }
                // RULE 5: Back One Step ('0' or 'back')
                else if (text === '0' || text === 'back') {
                    if (userSessions[from].path.length > 1) {
                        userSessions[from].path.pop();
                        const resolved = resolvePath(BOT_CONFIG.tree, userSessions[from].path);
                        reply = resolved?.node?.prompt || BOT_CONFIG.welcomeText;
                    } else {
                        userSessions[from].path = [];
                        reply = BOT_CONFIG.welcomeText;
                    }
                }
                // RULE 6: Forward Numerical Traversal
                else {
                    const currentPath = userSessions[from].path;
                    let targetMap = (currentPath.length === 0) 
                        ? BOT_CONFIG.tree 
                        : (resolvePath(BOT_CONFIG.tree, currentPath)?.children || {});

                    let chosenKey = text;
                    if (currentPath.length === 0) {
                        if (text.includes('eng')) chosenKey = '1';
                        if (text.includes('guj')) chosenKey = '2';
                    }

                    if (targetMap[chosenKey]) {
                        currentPath.push(chosenKey);
                        const resolved = resolvePath(BOT_CONFIG.tree, currentPath);
                        reply = resolved?.node?.prompt || "Selected.";
                    } else {
                        reply = (currentPath.length > 0 && currentPath[0] === '2')
                            ? "અમાન્ય વિકલ્પ. કૃપા કરીને માન્ય નંબર મોકલો, પાછા જવા '0', મુખ્ય મેનૂ '00', અથવા 'stop' લખો."
                            : "Invalid option. Please reply with a valid number, '0' to go back, '00' for main menu, or 'stop' to exit.";
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
