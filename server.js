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
  "welcomeText": "🙏 *WELCOME TO KAUSHALYA COMPUTER CENTRE!* 💻\n*કૌશલ્યા કોમ્પ્યુટર સેન્ટરમાં આપનું હાર્દિક સ્વાગત છે!*\n\n🌐 *Please select your preferred language:*\nકૃપા કરીને તમારી પસંદગીની ભાષા પસંદ કરો:\n\n1️⃣ English (ENG)\n2️⃣ ગુજરાતી (GUJ)\n\n✨ *We're here to help you. Let's get started!*\n✨ *અમે તમારી મદદ માટે અહીં છીએ. ચાલો, શરૂઆત કરીએ!*",
  "tree": {
    "1": {
      "title": "English",
      "prompt": "💻 *WELCOME TO KAUSHALYA COMPUTER SHOP!*\nકૌશલ્યા કોમ્પ્યુટર શોપમાં આપનું સ્વાગત છે! 🙏\n\n✨ *What would you like to explore today?*\nકૃપા કરીને નીચેના વિકલ્પોમાંથી પસંદ કરો:\n\n1️⃣ Courses 📚\n2️⃣ Computer Accessories 🖱️\n3️⃣ Services 🛠️\n4️⃣ Contact Details 📞\n\n━━━━━━━━━━━━━━\n🔹 Reply with the option number to continue.\n🔙 Reply *0* to go back.\n🏠 Reply *00* to return to the Main Menu.\n👋 Reply *STOP* to exit.\n\nતમારી જરૂરિયાત મુજબનો વિકલ્પ પસંદ કરો અને અમારી સાથે જોડાઓ! 😊",
      "children": {
        "1": {
          "title": "Courses",
          "prompt": "📚 *KAUSHALYA COMPUTER CENTRE*\n🎓 *COURSES MENU | કોર્સ પસંદ કરો*\n\nExplore our computer courses and choose the course you are interested in! 💻\n\nકૃપા કરીને તમારી પસંદગીનો કોર્સ પસંદ કરવા માટે તેનો નંબર મોકલો.\n\n1️⃣ *CCC* – Course on Computer Concepts\n2️⃣ *Tally Prime with GST*\n3️⃣ *DTP* – Desktop Publishing\n4️⃣ *AutoCAD*\n5️⃣ *DCA* – Diploma in Computer Applications\n6️⃣ *Diploma in Web Designing*\n7️⃣ *ADCA* – Advanced Diploma in Computer Applications\n8️⃣ *Diploma in Graphic Designing*\n9️⃣ *PGDCA* – Post Graduate Diploma in Computer Applications\n🔟 *C Programming*\n1️⃣1️⃣ *C++ Programming*\n1️⃣2️⃣ *Video Editing* 🎬\n\n━━━━━━━━━━━━━━\n🔙 Reply *0* to go back.\n🏠 Reply *00* to return to the Main Menu.\n\n✨ *Choose your course and take the next step towards your digital future!*\n✨ *તમારો કોર્સ પસંદ કરો અને તમારા ડિજિટલ ભવિષ્ય તરફ આગળ વધો!*",
          "children": {
            "1": {
              "title": " *CCC* – Course on Computer Concepts",
              "prompt": "💻 *CCC – COURSE ON COMPUTER CONCEPTS*\n🏫 *KAUSHALYA COMPUTER CENTRE*\n\n💰 *Course Fees:* ₹3,150\n⏳ *Duration:* 2 Months\n\n📚 *COURSE CONTENT | અભ્યાસક્રમ*\n\n✅ Computer Fundamentals\n✅ MS Paint\n✅ MS PowerPoint\n✅ MS Word\n✅ Gujarati Typing\n✅ MS Excel\n✅ MS Windows\n✅ Internet Basics\n✅ ChatGPT & Google Gemini 🤖\n✅ Practical Project\n\n🎯 *Learn Computer Skills with Practical Training!*\n💡 Build your digital skills and gain confidence in using computers.\n\n━━━━━━━━━━━━━━\n🔙 Reply *0* to go back.\n🏠 Reply *00* to return to the Main Menu.\n\n📞 *KAUSHALYA COMPUTER CENTRE*\n*Your Learning, Our Priority!*",
              "children": {}
            },
            "2": {
              "title": "Tally Prime with GST",
              "prompt": "💻 *TALLY PRIME WITH GST*\n🏫 *KAUSHALYA COMPUTER CENTRE*\n\n💰 *Course Fees:* ₹4,500\n⏳ *Duration:* 2 Months\n\n📚 *COURSE CONTENT | અભ્યાસક્રમ*\n\n✅ Computer Fundamentals\n✅ MS Paint\n✅ Tally Prime & Company Creation\n✅ Groups & Ledger Creation\n✅ Voucher Entries\n✅ Balance Sheet & Profit and Loss (P&L)\n✅ Billing & Stock Management\n✅ GST, TDS, Services & Tax\n✅ Backup & Restore\n✅ Data Updation & Cancellation\n✅ Company Features & Configuration\n✅ Manufacturing Entries\n✅ Buy One Get One (BOGO) Entries\n✅ Reconciliation & Amendments\n\n🎯 *Learn Practical Accounting & GST Skills!*\n📊 Gain hands-on knowledge of accounting, inventory, taxation and business transactions.\n\n━━━━━━━━━━━━━━\n🔙 Reply *0* to go back.\n🏠 Reply *00* to return to the Main Menu.\n\n✨ *KAUSHALYA COMPUTER CENTRE*\n*Learn Today, Succeed Tomorrow!*",
              "children": {}
            },
            "3": {
              "title": "DTP – Desktop Publishing",
              "prompt": "🎨 *DTP – DESKTOP PUBLISHING*\n🏫 *KAUSHALYA COMPUTER CENTRE*\n\n💰 *Course Fees:* ₹4,500\n⏳ *Duration:* 3 Months\n\n📚 *COURSE CONTENT | અભ્યાસક્રમ*\n\n✅ Computer Fundamentals\n✅ MS Paint\n✅ Instant Artist\n✅ PageMaker\n✅ CorelDRAW\n✅ Adobe Photoshop\n✅ Gujarati Typing\n✅ MS Windows\n✅ Practical Project\n\n🎯 *Learn Design. Create. Innovate!* 🎨\n\n💡 Develop your skills in graphic design, page layout, image editing and Gujarati typing through practical training.\n\n━━━━━━━━━━━━━━\n🔙 Reply *0* to go back.\n🏠 Reply *00* to return to the Main Menu.\n\n✨ *KAUSHALYA COMPUTER CENTRE*\n*Turning Your Creativity into Skills!*",
              "children": {}
            },
            "4": {
              "title": "AutoCAD",
              "prompt": "🏗️ *AUTOCAD COURSE*\n🏫 *KAUSHALYA COMPUTER CENTRE*\n\n💰 *Course Fees:* ₹4,500\n⏳ *Duration:* 2 Months\n\n📐 *COURSE CONTENT | અભ્યાસક્રમ*\n\n✅ Concepts of CAD\n✅ 2D & 3D Commands\n✅ Isometric Drawing\n✅ Dimensions & Drawing Tools\n✅ 20+ Plans & Practical Projects\n✅ 3D Plans & Projects\n✅ Civil Engineering Projects\n✅ Mechanical Engineering Projects\n✅ Electrical Engineering Projects\n✅ Advanced Drawing Techniques & More\n\n🎯 *Design Your Ideas with Precision!*\n\n💡 Learn technical drawing, 2D drafting and 3D design through practical training and project work.\n\n━━━━━━━━━━━━━━\n🔙 Reply *0* to go back.\n🏠 Reply *00* to return to the Main Menu.\n\n✨ *KAUSHALYA COMPUTER CENTRE*\n*Learn Skills. Design the Future!*",
              "children": {}
            },
            "5": {
              "title": "DCA – Diploma in Computer Applications",
              "prompt": "🎓 *DCA – DIPLOMA IN COMPUTER APPLICATIONS*\n🏫 *KAUSHALYA COMPUTER CENTRE*\n\n💰 *Course Fees:* ₹9,500\n⏳ *Duration:* 6 Months\n\n📚 *COURSE CONTENT | અભ્યાસક્રમ*\n\n✅ Computer Fundamentals\n✅ MS Paint\n✅ MS Office\n   📄 MS Word\n   📊 MS Excel\n   📽️ MS PowerPoint\n✅ Internet & Web Browsing\n✅ Practical Project\n\n🎯 *Build Your Computer Skills with Confidence!*\n\n💻 Gain practical knowledge of essential computer applications and develop skills useful for education, office work and everyday digital tasks.\n\n━━━━━━━━━━━━━━\n🔙 Reply *0* to go back.\n🏠 Reply *00* to return to the Main Menu.\n\n✨ *KAUSHALYA COMPUTER CENTRE*\n*Learn Today, Grow Tomorrow!*",
              "children": {}
            },
            "6": {
              "title": "Diploma in Web Designing",
              "prompt": "🌐 *DIPLOMA IN WEB DESIGNING*\n🏫 *KAUSHALYA COMPUTER CENTRE*\n\n💰 *Course Fees:* ₹11,500\n⏳ *Duration:* 4 Months\n\n📚 *COURSE CONTENT | અભ્યાસક્રમ*\n\n✅ Website Fundamentals\n✅ HTML – HyperText Markup Language\n✅ CSS – Cascading Style Sheets\n✅ Adobe Dreamweaver\n✅ WordPress Website Design\n✅ Website Uploading & Hosting\n✅ Website Development\n✅ Blogging\n✅ Adobe Photoshop\n\n🎯 *Design. Develop. Launch Your Website!*\n\n💻 Learn the fundamentals of website design and development through practical training and projects. Build your skills to create and publish websites.\n\n━━━━━━━━━━━━━━\n🔙 Reply *0* to go back.\n🏠 Reply *00* to return to the Main Menu.\n\n✨ *KAUSHALYA COMPUTER CENTRE*\n*Turn Your Ideas into Websites!*",
              "children": {}
            }
          }
        },
        "2": {
          "title": "Computer Accessories",
          "prompt": "🖥️ *COMPUTER ACCESSORIES*\n*KAUSHALYA COMPUTER SHOP*\n\n🛒 *Available Accessories:*\n\n▪️ Keyboard & Mouse\n▪️ Headphones & Speakers\n▪️ USB Drives & Memory Cards\n▪️ Data Cables & Connectors\n▪️ Chargers & Adapters\n▪️ Computer Cables\n▪️ Wi-Fi Adapters & Networking Accessories\n▪️ Printer Accessories & Ink\n▪️ Mouse Pads\n▪️ Monitors & Computer Parts\n▪️ Laptop Accessories\n▪️ HDMI & VGA Cables\n▪️ USB Hubs\n▪️ Webcams\n▪️ Power Supplies\n▪️ Other Computer Accessories\n\n📞 *For product availability and prices, please contact us.*\n\n🏫 *KAUSHALYA COMPUTER SHOP*\n*Your Trusted Computer Partner!*",
          "children": {}
        },
        "3": {
          "title": "Services ",
          "prompt": "📚 Computer Courses\n🖥️ Computer Sales & Accessories\n🛠️ Computer Repairing & Maintenance\n🖨️ Printer Services & Refilling\n📄 Online Forms & Computer Job Work",
          "children": {}
        },
        "4": {
          "title": "Contact Details",
          "prompt": "🏫 KAUSHALYA COMPUTER CENTRE\n📞 CONTACT DETAILS | સંપર્ક વિગતો\n\n📍 Address: \n📱 Mobile / WhatsApp: +91 98985 25295\n☎️ Alternate Number: +91 99985 25295\n📧 Email: customerkcc@gmail.com\n📸 Instagram: https://www.instagram.com/kaushalyacomputer_kapadwanj?dlrf=ZDcwMHVuZmxtbWNq\n🕒 Business Hours: 8 AM TO 8 PM\n📅 Weekly Holiday: MON TO SAT",
          "children": {}
        }
      }
    },
    "2": {
      "title": "ગુજરાતી",
      "prompt": "કૌશલ્યા કોમ્પ્યુટરમાં આપનું સ્વાગત છે:\r\n1. કોમ્પ્યુટર કોર્સ\r\n2. લેપટોપ અને ડેસ્કટોપ\r\n\r\n(નંબર મોકલો, પાછા જવા '0', મુખ્ય મેનૂ '00')",
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
