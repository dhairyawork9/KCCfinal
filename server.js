const express = require('express');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.json());

let userSessions = {};

// 1. Meta Webhook Verification
app.get('/webhook', (req, res) => {
    const VERIFY_TOKEN = "smartbiz_secure_token";
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
    return res.sendStatus(400);
});

// 2. WhatsApp Message Handler
app.post('/webhook', (req, res) => {
    try {
        let body = req.body;
        if (body.object) {
            let messaging = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
            if (messaging) {
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
                        reply = "English selected! Type '1' for Courses, '2' for Products.";
                    } else if (text === '2' || text.includes('guj')) {
                        userSessions[from] = 'guj';
                        reply = "ગુજરાતી ભાષા પસંદ થઈ છે! કોર્સ માટે '1', પ્રોડક્ટ માટે '2' લખો.";
                    } else {
                        reply = "Please select language:\n1. English\n2. ગુજરાતી";
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
                        reply = "અમાન્ય વિકલ્પ. ફરી શરૂ કરવા 'start' લખો.";
                    }
                }

                console.log(`Reply sent: ${reply}`);
            }
            return res.status(200).send('EVENT_RECEIVED');
        }
        return res.sendStatus(404);
    } catch (err) {
        console.error("Error:", err);
        return res.status(500).send('Server Error Handled');
    }
});

module.exports = app;
