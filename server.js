const express = require('express');
const crypto = require('crypto');
const app = express();

app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));

// Vercel Environment Variables
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const APP_SECRET = process.env.APP_SECRET;

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// 15-minute inactivity timeout
const SESSION_TTL_SECONDS = 15 * 60;

// Keep paused sessions until START is received
const PAUSED_TTL_SECONDS = 365 * 24 * 60 * 60;

// Duplicate message protection
const MESSAGE_ID_TTL_SECONDS = 24 * 60 * 60;

// Prevent duplicate START messages sent within 3 seconds
const START_DEBOUNCE_MS = 3000;

// --------------------------------------------------
// REDIS
// --------------------------------------------------

async function redisCommand(...args) {
    if (!REDIS_URL || !REDIS_TOKEN) {
        throw new Error('Redis environment variables are missing');
    }

    const response = await fetch(REDIS_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${REDIS_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(args)
    });

    const data = await response.json();

    if (!response.ok || data.error) {
        throw new Error(data.error || 'Redis request failed');
    }

    return data.result;
}

function sessionKey(phone) {
    return `kcc:session:${phone}`;
}

async function getSession(phone) {
    const result = await redisCommand('GET', sessionKey(phone));

    if (!result) return null;

    try {
        return JSON.parse(result);
    } catch {
        await redisCommand('DEL', sessionKey(phone));
        return null;
    }
}

async function saveSession(phone, session) {
    session.lastActive = Date.now();

    const ttl = session.paused
        ? PAUSED_TTL_SECONDS
        : SESSION_TTL_SECONDS;

    await redisCommand(
        'SET',
        sessionKey(phone),
        JSON.stringify(session),
        'EX',
        ttl
    );
}

async function deleteSession(phone) {
    await redisCommand('DEL', sessionKey(phone));
}

async function wasAlreadyHandled(messageId) {
    if (!messageId) return false;

    const result = await redisCommand(
        'SET',
        `kcc:seen:${messageId}`,
        '1',
        'NX',
        'EX',
        MESSAGE_ID_TTL_SECONDS
    );

    return result !== 'OK';
}

// --------------------------------------------------
// MENU HELPERS
// --------------------------------------------------

function leaf(title, prompt) {
    return {
        title,
        prompt,
        children: {}
    };
}

function node(title, prompt, children) {
    return {
        title,
        prompt,
        children
    };
}

const NAV_EN =
    '\n\n━━━━━━━━━━━━━━\n' +
    '🔙 Reply *0* to go back.\n' +
    '🏠 Reply *00* to return to the main menu.\n' +
    '👋 Reply *STOP* to exit.';

const NAV_GU =
    '\n\n━━━━━━━━━━━━━━\n' +
    '🔙 પાછા જવા *0* મોકલો.\n' +
    '🏠 મુખ્ય મેનૂ માટે *00* મોકલો.\n' +
    '👋 બંધ કરવા *STOP* મોકલો.';

// --------------------------------------------------
// ENGLISH COURSES
// --------------------------------------------------

const englishCourses = {
    '1': leaf('CCC', `💻 *CCC – COURSE ON COMPUTER CONCEPTS*
🏫 *KAUSHALYA COMPUTER CENTRE*

💰 *Course Fees:* ₹3,150
⏳ *Duration:* 2 Months

📚 *COURSE CONTENT*

✅ Computer Fundamentals
✅ MS Paint
✅ MS PowerPoint
✅ MS Word
✅ Gujarati Typing
✅ MS Excel
✅ MS Windows
✅ Internet Basics
✅ ChatGPT & Google Gemini 🤖
✅ Practical Project

🎯 *Learn Computer Skills with Practical Training!*
💡 Build your digital skills and gain confidence in using computers.

✨ *KAUSHALYA COMPUTER CENTRE*
*Your Learning, Our Priority!*${NAV_EN}`),

    '2': leaf('Tally Prime with GST', `💻 *TALLY PRIME WITH GST*
🏫 *KAUSHALYA COMPUTER CENTRE*

💰 *Course Fees:* ₹4,500
⏳ *Duration:* 2 Months

📚 *COURSE CONTENT*

✅ Computer Fundamentals
✅ MS Paint
✅ Tally Prime & Company Creation
✅ Groups & Ledger Creation
✅ Voucher Entries
✅ Balance Sheet & Profit and Loss (P&L)
✅ Billing & Stock Management
✅ GST, TDS, Services & Tax
✅ Backup & Restore
✅ Data Updation & Cancellation
✅ Company Features & Configuration
✅ Manufacturing Entries
✅ Buy One Get One (BOGO) Entries
✅ Reconciliation & Amendments

🎯 *Learn Practical Accounting & GST Skills!*
📊 Gain hands-on knowledge of accounting, inventory, taxation and business transactions.

✨ *KAUSHALYA COMPUTER CENTRE*
*Learn Today, Succeed Tomorrow!*${NAV_EN}`),

    '3': leaf('DTP', `🎨 *DTP – DESKTOP PUBLISHING*
🏫 *KAUSHALYA COMPUTER CENTRE*

💰 *Course Fees:* ₹4,500
⏳ *Duration:* 3 Months

📚 *COURSE CONTENT*

✅ Computer Fundamentals
✅ MS Paint
✅ Instant Artist
✅ PageMaker
✅ CorelDRAW
✅ Adobe Photoshop
✅ Gujarati Typing
✅ MS Windows
✅ Practical Project

🎯 *Learn Design. Create. Innovate!* 🎨
💡 Develop your skills in graphic design, page layout, image editing and Gujarati typing through practical training.

✨ *KAUSHALYA COMPUTER CENTRE*
*Turning Your Creativity into Skills!*${NAV_EN}`),

    '4': leaf('AutoCAD', `🏗️ *AUTOCAD COURSE*
🏫 *KAUSHALYA COMPUTER CENTRE*

💰 *Course Fees:* ₹4,500
⏳ *Duration:* 2 Months

📐 *COURSE CONTENT*

✅ Concepts of CAD
✅ 2D & 3D Commands
✅ Isometric Drawing
✅ Dimensions & Drawing Tools
✅ 20+ Plans & Practical Projects
✅ 3D Plans & Projects
✅ Civil Engineering Projects
✅ Mechanical Engineering Projects
✅ Electrical Engineering Projects
✅ Advanced Drawing Techniques & More

🎯 *Design Your Ideas with Precision!*
💡 Learn technical drawing, 2D drafting and 3D design through practical training and project work.

✨ *KAUSHALYA COMPUTER CENTRE*
*Learn Skills. Design the Future!*${NAV_EN}`),

    '5': leaf('DCA', `🎓 *DCA – DIPLOMA IN COMPUTER APPLICATIONS*
🏫 *KAUSHALYA COMPUTER CENTRE*

💰 *Course Fees:* ₹9,500
⏳ *Duration:* 6 Months

📚 *COURSE CONTENT*

✅ Computer Fundamentals
✅ MS Paint
✅ MS Office
   📄 MS Word
   📊 MS Excel
   📽️ MS PowerPoint
✅ Internet & Web Browsing
✅ Practical Project

🎯 *Build Your Computer Skills with Confidence!*
💻 Gain practical knowledge of essential computer applications and develop skills useful for education, office work and everyday digital tasks.

✨ *KAUSHALYA COMPUTER CENTRE*
*Learn Today, Grow Tomorrow!*${NAV_EN}`),

    '6': leaf('Diploma in Web Designing', `🌐 *DIPLOMA IN WEB DESIGNING*
🏫 *KAUSHALYA COMPUTER CENTRE*

💰 *Course Fees:* ₹11,500
⏳ *Duration:* 4 Months

📚 *COURSE CONTENT*

✅ Website Fundamentals
✅ HTML – HyperText Markup Language
✅ CSS – Cascading Style Sheets
✅ Adobe Dreamweaver
✅ WordPress Website Design
✅ Website Uploading & Hosting
✅ Website Development
✅ Blogging
✅ Adobe Photoshop

🎯 *Design. Develop. Launch Your Website!*
💻 Learn the fundamentals of website design and development through practical training and projects. Build your skills to create and publish websites.

✨ *KAUSHALYA COMPUTER CENTRE*
*Turn Your Ideas into Websites!*${NAV_EN}`)
};

// Courses listed without supplied details
const otherEnglishCourses = {
    '7': 'ADCA – Advanced Diploma in Computer Applications',
    '8': 'Diploma in Graphic Designing',
    '9': 'PGDCA – Post Graduate Diploma in Computer Applications',
    '10': 'C Programming',
    '11': 'C++ Programming',
    '12': 'Video Editing'
};

for (const [key, name] of Object.entries(otherEnglishCourses)) {
    englishCourses[key] = leaf(
        name,
        `📚 *${name}*\n\nFor course fees, duration and detailed syllabus, please contact Kaushalya Computer Centre.\n\n📞 +91 98985 25295${NAV_EN}`
    );
}

// --------------------------------------------------
// GUJARATI COURSES
// --------------------------------------------------

const gujaratiCourses = {
    '1': leaf('CCC', `💻 *CCC – કમ્પ્યુટર કોન્સેપ્ટ કોર્સ*
🏫 *કૌશલ્યા કોમ્પ્યુટર સેન્ટર*

💰 *કોર્સ ફી:* ₹3,150
⏳ *સમયગાળો:* 2 મહિના

📚 *અભ્યાસક્રમ*

✅ કમ્પ્યુટરના મૂળભૂત જ્ઞાન
✅ MS Paint
✅ MS PowerPoint
✅ MS Word
✅ ગુજરાતી ટાઇપિંગ
✅ MS Excel
✅ MS Windows
✅ ઇન્ટરનેટનું મૂળભૂત જ્ઞાન
✅ ChatGPT અને Google Gemini 🤖
✅ પ્રેક્ટિકલ પ્રોજેક્ટ

🎯 પ્રેક્ટિકલ તાલીમ સાથે કમ્પ્યુટર શીખો!

*તમારું શિક્ષણ, અમારી પ્રાથમિકતા!*${NAV_GU}`),

    '2': leaf('Tally Prime with GST', `💻 *TALLY PRIME WITH GST*
🏫 *કૌશલ્યા કોમ્પ્યુટર સેન્ટર*

💰 *કોર્સ ફી:* ₹4,500
⏳ *સમયગાળો:* 2 મહિના

📚 *અભ્યાસક્રમ*

✅ કમ્પ્યુટરના મૂળભૂત જ્ઞાન
✅ MS Paint
✅ Tally Prime અને Company Creation
✅ Groups અને Ledger Creation
✅ Voucher Entries
✅ Balance Sheet અને Profit & Loss
✅ Billing અને Stock Management
✅ GST, TDS અને Tax
✅ Backup અને Restore
✅ Data Updation અને Cancellation
✅ Company Features અને Configuration
✅ Manufacturing Entries
✅ BOGO Entries
✅ Reconciliation અને Amendments

🎯 એકાઉન્ટિંગ અને GST ની પ્રેક્ટિકલ તાલીમ મેળવો!${NAV_GU}`),

    '3': leaf('DTP', `🎨 *DTP – ડેસ્કટોપ પબ્લિશિંગ*
🏫 *કૌશલ્યા કોમ્પ્યુટર સેન્ટર*

💰 *કોર્સ ફી:* ₹4,500
⏳ *સમયગાળો:* 3 મહિના

📚 *અભ્યાસક્રમ*

✅ કમ્પ્યુટરના મૂળભૂત જ્ઞાન
✅ MS Paint
✅ Instant Artist
✅ PageMaker
✅ CorelDRAW
✅ Adobe Photoshop
✅ ગુજરાતી ટાઇપિંગ
✅ MS Windows
✅ પ્રેક્ટિકલ પ્રોજેક્ટ

🎯 ડિઝાઇન શીખો અને તમારી સર્જનાત્મકતા વિકસાવો!${NAV_GU}`),

    '4': leaf('AutoCAD', `🏗️ *AUTOCAD કોર્સ*
🏫 *કૌશલ્યા કોમ્પ્યુટર સેન્ટર*

💰 *કોર્સ ફી:* ₹4,500
⏳ *સમયગાળો:* 2 મહિના

📐 *અભ્યાસક્રમ*

✅ CAD ના મૂળભૂત સિદ્ધાંતો
✅ 2D અને 3D Commands
✅ Isometric Drawing
✅ Dimensions અને Drawing Tools
✅ 20 થી વધુ Plans અને Projects
✅ 3D Plans અને Projects
✅ Civil Engineering Projects
✅ Mechanical Engineering Projects
✅ Electrical Engineering Projects
✅ Advanced Drawing Techniques

🎯 ચોકસાઈ સાથે ડિઝાઇન કરવાનું શીખો!${NAV_GU}`),

    '5': leaf('DCA', `🎓 *DCA – કમ્પ્યુટર એપ્લિકેશન ડિપ્લોમા*
🏫 *કૌશલ્યા કોમ્પ્યુટર સેન્ટર*

💰 *કોર્સ ફી:* ₹9,500
⏳ *સમયગાળો:* 6 મહિના

📚 *અભ્યાસક્રમ*

✅ કમ્પ્યુટરના મૂળભૂત જ્ઞાન
✅ MS Paint
✅ MS Office
   📄 MS Word
   📊 MS Excel
   📽️ MS PowerPoint
✅ ઇન્ટરનેટ અને વેબ બ્રાઉઝિંગ
✅ પ્રેક્ટિકલ પ્રોજેક્ટ

🎯 કમ્પ્યુટર એપ્લિકેશનનું પ્રેક્ટિકલ જ્ઞાન મેળવો!${NAV_GU}`),

    '6': leaf('Diploma in Web Designing', `🌐 *વેબ ડિઝાઇનિંગ ડિપ્લોમા*
🏫 *કૌશલ્યા કોમ્પ્યુટર સેન્ટર*

💰 *કોર્સ ફી:* ₹11,500
⏳ *સમયગાળો:* 4 મહિના

📚 *અભ્યાસક્રમ*

✅ Website Fundamentals
✅ HTML
✅ CSS
✅ Adobe Dreamweaver
✅ WordPress Website Design
✅ Website Uploading અને Hosting
✅ Website Development
✅ Blogging
✅ Adobe Photoshop

🎯 તમારી પોતાની વેબસાઇટ બનાવતા શીખો!${NAV_GU}`)
};

const otherGujaratiCourses = {
    '7': 'ADCA – એડવાન્સ્ડ ડિપ્લોમા',
    '8': 'ગ્રાફિક ડિઝાઇનિંગ ડિપ્લોમા',
    '9': 'PGDCA – પોસ્ટ ગ્રેજ્યુએટ ડિપ્લોમા',
    '10': 'C Programming',
    '11': 'C++ Programming',
    '12': 'Video Editing'
};

for (const [key, name] of Object.entries(otherGujaratiCourses)) {
    gujaratiCourses[key] = leaf(
        name,
        `📚 *${name}*\n\nકોર્સની ફી, સમયગાળો અને અભ્યાસક્રમની માહિતી માટે કૌશલ્યા કોમ્પ્યુટર સેન્ટરનો સંપર્ક કરો.\n\n📞 +91 98985 25295${NAV_GU}`
    );
}

// --------------------------------------------------
// MAIN MENUS
// --------------------------------------------------

const englishTree = {
    '1': node('Courses',
        `📚 *KAUSHALYA COMPUTER CENTRE*
🎓 *COURSES MENU*

1️⃣ CCC – Course on Computer Concepts
2️⃣ Tally Prime with GST
3️⃣ DTP – Desktop Publishing
4️⃣ AutoCAD
5️⃣ DCA – Diploma in Computer Applications
6️⃣ Diploma in Web Designing
7️⃣ ADCA – Advanced Diploma
8️⃣ Diploma in Graphic Designing
9️⃣ PGDCA
🔟 C Programming
1️⃣1️⃣ C++ Programming
1️⃣2️⃣ Video Editing${NAV_EN}`,
        englishCourses
    ),

    '2': leaf('Computer Accessories', `🖥️ *COMPUTER ACCESSORIES*
*KAUSHALYA COMPUTER SHOP*

🛒 *Available Accessories:*

▪️ Keyboard & Mouse
▪️ Headphones & Speakers
▪️ USB Drives & Memory Cards
▪️ Data Cables & Connectors
▪️ Chargers & Adapters
▪️ Computer Cables
▪️ Wi-Fi Adapters & Networking Accessories
▪️ Printer Accessories & Ink
▪️ Mouse Pads
▪️ Monitors & Computer Parts
▪️ Laptop Accessories
▪️ HDMI & VGA Cables
▪️ USB Hubs
▪️ Webcams
▪️ Power Supplies
▪️ Other Computer Accessories

📞 For product availability and prices, please contact us.

🏫 *KAUSHALYA COMPUTER SHOP*
*Your Trusted Computer Partner!*${NAV_EN}`),

    '3': leaf('Services', `🛠️ *KAUSHALYA COMPUTER CENTRE – SERVICES*

📚 Computer Courses
🖥️ Computer Sales & Accessories
🛠️ Computer Repairing & Maintenance
🖨️ Printer Services & Refilling
📄 Online Forms & Computer Job Work${NAV_EN}`),

    '4': leaf('Contact Details', `🏫 *KAUSHALYA COMPUTER CENTRE*
📞 *CONTACT DETAILS*

📍 Address: 
📱 Mobile / WhatsApp: +91 98985 25295
☎️ Alternate Number: +91 99985 25295
📧 Email: customerkcc@gmail.com
📸 Instagram: https://www.instagram.com/kaushalyacomputer_kapadwanj?dlrf=ZDcwMHVuZmxtbWNq
🕒 Business Hours: 8 AM TO 8 PM
📅 Weekly Holiday: MON TO SAT${NAV_EN}`)
};

const gujaratiTree = {
    '1': node('કમ્પ્યુટર કોર્સ',
        `📚 *કૌશલ્યા કોમ્પ્યુટર સેન્ટર*
🎓 *કોર્સ મેનૂ*

1️⃣ CCC
2️⃣ Tally Prime with GST
3️⃣ DTP
4️⃣ AutoCAD
5️⃣ DCA
6️⃣ Diploma in Web Designing
7️⃣ ADCA
8️⃣ Graphic Designing
9️⃣ PGDCA
🔟 C Programming
1️⃣1️⃣ C++ Programming
1️⃣2️⃣ Video Editing${NAV_GU}`,
        gujaratiCourses
    ),

    '2': leaf('કમ્પ્યુટર એસેસરીઝ', `🖥️ *કમ્પ્યુટર એસેસરીઝ*
*કૌશલ્યા કોમ્પ્યુટર શોપ*

🛒 *ઉપલબ્ધ વસ્તુઓ:*

▪️ કીબોર્ડ અને માઉસ
▪️ હેડફોન અને સ્પીકર્સ
▪️ USB ડ્રાઇવ અને મેમરી કાર્ડ
▪️ ડેટા કેબલ અને કનેક્ટર્સ
▪️ ચાર્જર અને એડેપ્ટર
▪️ કમ્પ્યુટર કેબલ
▪️ Wi-Fi એડેપ્ટર અને નેટવર્કિંગ એસેસરીઝ
▪️ પ્રિન્ટર એસેસરીઝ અને ઇંક
▪️ માઉસ પેડ
▪️ મોનિટર અને કમ્પ્યુટર પાર્ટ્સ
▪️ લેપટોપ એસેસરીઝ
▪️ HDMI અને VGA કેબલ
▪️ USB હબ
▪️ વેબકેમ
▪️ પાવર સપ્લાય
▪️ અન્ય કમ્પ્યુટર એસેસરીઝ

📞 વસ્તુઓની ઉપલબ્ધતા અને કિંમત માટે અમારો સંપર્ક કરો.${NAV_GU}`),

    '3': leaf('સેવાઓ', `🛠️ *કૌશલ્યા કોમ્પ્યુટર સેન્ટર – સેવાઓ*

📚 કમ્પ્યુટર કોર્સ
🖥️ કમ્પ્યુટર વેચાણ અને એસેસરીઝ
🛠️ કમ્પ્યુટર રિપેરિંગ અને મેઇન્ટેનન્સ
🖨️ પ્રિન્ટર સર્વિસ અને રિફિલિંગ
📄 ઓનલાઇન ફોર્મ અને કમ્પ્યુટર જોબ વર્ક${NAV_GU}`),

    '4': leaf('સંપર્ક વિગતો', `🏫 *કૌશલ્યા કોમ્પ્યુટર સેન્ટર*
📞 *સંપર્ક વિગતો*

📍 સરનામું:
📱 મોબાઇલ / WhatsApp: +91 98985 25295
☎️ વૈકલ્પિક નંબર: +91 99985 25295
📧 Email: customerkcc@gmail.com
📸 Instagram: https://www.instagram.com/kaushalyacomputer_kapadwanj?dlrf=ZDcwMHVuZmxtbWNq
🕒 સમય: સવારે 8 થી રાત્રે 8
📅 સાપ્તાહિક રજા: MON TO SAT${NAV_GU}`)
};

const BOT_CONFIG = {
    welcomeText: `🙏 *WELCOME TO KAUSHALYA COMPUTER CENTRE!* 💻
*કૌશલ્યા કોમ્પ્યુટર સેન્ટરમાં આપનું હાર્દિક સ્વાગત છે!*

🌐 *Please select your preferred language:*
કૃપા કરીને તમારી પસંદગીની ભાષા પસંદ કરો:

1️⃣ English (ENG)
2️⃣ ગુજરાતી (GUJ)

✨ *We're here to help you. Let's get started!*
✨ *અમે તમારી મદદ માટે અહીં છીએ. ચાલો, શરૂઆત કરીએ!*`,

    tree: {
        '1': node('English',
            `💻 *WELCOME TO KAUSHALYA COMPUTER CENTRE!*

✨ *What would you like to explore today?*

1️⃣ Courses 📚
2️⃣ Computer Accessories 🖱️
3️⃣ Services 🛠️
4️⃣ Contact Details 📞${NAV_EN}`,
            englishTree
        ),

        '2': node('ગુજરાતી',
            `🙏 *કૌશલ્યા કોમ્પ્યુટર સેન્ટરમાં આપનું સ્વાગત છે!*

✨ *આજે તમે શું જાણવા માંગો છો?*

1️⃣ કમ્પ્યુટર કોર્સ 📚
2️⃣ કમ્પ્યુટર એસેસરીઝ 🖱️
3️⃣ સેવાઓ 🛠️
4️⃣ સંપર્ક વિગતો 📞${NAV_GU}`,
            gujaratiTree
        )
    }
};

// --------------------------------------------------
// WHATSAPP MESSAGE SENDING
// --------------------------------------------------

async function sendWhatsAppMessage(to, textBody, phoneNumberId) {
    if (!WHATSAPP_TOKEN || !phoneNumberId || !to || !textBody) {
        console.error('WhatsApp sending configuration missing');
        return false;
    }

    try {
        const response = await fetch(
            `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${WHATSAPP_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to,
                    type: 'text',
                    text: { body: textBody }
                })
            }
        );

        if (!response.ok) {
            const errorBody = await response.text().catch(() => '');
            console.error(
                'WhatsApp send failed:',
                response.status,
                errorBody.slice(0, 500)
            );
            return false;
        }

        return true;
    } catch (error) {
        console.error('WhatsApp send error:', error.message);
        return false;
    }
}

// --------------------------------------------------
// MENU NAVIGATION
// --------------------------------------------------

function resolvePath(tree, path) {
    let currentMap = tree;
    let lastNode = null;

    for (const step of path) {
        if (!currentMap || !currentMap[step]) return null;

        lastNode = currentMap[step];
        currentMap = lastNode.children;
    }

    return {
        node: lastNode,
        children: currentMap || {}
    };
}

function normalizeText(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[.!?]+$/g, '');
}

function getCurrentTree(path) {
    if (!path.length) return BOT_CONFIG.tree;

    const resolved = resolvePath(BOT_CONFIG.tree, path);
    return resolved?.children || {};
}

function getCurrentPrompt(path) {
    if (!path.length) return BOT_CONFIG.welcomeText;

    return resolvePath(BOT_CONFIG.tree, path)?.node?.prompt
        || BOT_CONFIG.welcomeText;
}

// --------------------------------------------------
// HUMAN TAKEOVER
// --------------------------------------------------

async function pauseForHuman(customerPhone) {
    if (!customerPhone) return;

    const session = await getSession(customerPhone) || {
        path: [],
        paused: false
    };

    session.paused = true;
    session.pauseReason = 'human';

    await saveSession(customerPhone, session);
}

async function getIncomingMessages(body) {
    const messages = [];

    for (const entry of body?.entry || []) {
        for (const change of entry?.changes || []) {
            const value = change?.value;

            // WhatsApp Business App human reply echo
            if (
                change?.field === 'smb_message_echoes' ||
                value?.message_echoes
            ) {
                for (const echo of value?.message_echoes || []) {
                    if (echo?.to) {
                        await pauseForHuman(echo.to);
                    }
                }
            }

            for (const message of value?.messages || []) {
                messages.push({
                    message,
                    phoneNumberId: value?.metadata?.phone_number_id
                });
            }
        }
    }

    return messages;
}

// --------------------------------------------------
// META SIGNATURE VERIFICATION
// --------------------------------------------------

function verifyMetaSignature(req, res, next) {
    if (!APP_SECRET) {
        console.error('APP_SECRET is missing');
        return res.status(500).send('APP_SECRET is not configured');
    }

    const signature = req.headers['x-hub-signature-256'];

    if (typeof signature !== 'string' || !req.rawBody) {
        return res.status(401).send('Missing signature');
    }

    const expected = 'sha256=' + crypto
        .createHmac('sha256', APP_SECRET)
        .update(req.rawBody)
        .digest('hex');

    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    if (
        actualBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
        return res.status(401).send('Invalid signature');
    }

    next();
}

// --------------------------------------------------
// WEBHOOK VERIFICATION
// --------------------------------------------------

app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (
        mode === 'subscribe' &&
        VERIFY_TOKEN &&
        token === VERIFY_TOKEN &&
        challenge
    ) {
        return res.status(200).send(challenge);
    }

    return res.sendStatus(403);
});

app.get('/', (req, res) => {
    res.status(200).send('KCC WhatsApp Bot Engine is Active');
});

// --------------------------------------------------
// PROCESS CUSTOMER MESSAGE
// --------------------------------------------------

async function processTextMessage(message, phoneNumberId) {
    if (
        !message ||
        message.type !== 'text' ||
        !phoneNumberId ||
        !message.from
    ) {
        return;
    }

    const from = message.from;
    const messageId = message.id;
    const text = normalizeText(message.text?.body);

    // Ignore duplicate Meta webhook deliveries
    if (await wasAlreadyHandled(messageId)) {
        return;
    }

    let session = await getSession(from);

    // STOP: pause only this customer
    if (text === 'stop' || text === 'exit') {
        session = session || {
            path: [],
            paused: false
        };

        session.paused = true;
        session.pauseReason = 'stop';

        await saveSession(from, session);

        await sendWhatsAppMessage(
            from,
            'You have stopped receiving automated messages. Send *START* whenever you want to use the menu again.',
            phoneNumberId
        );

        return;
    }

    // START: restart or reactivate this customer
    if (text === 'start') {
        if (
            session &&
            !session.paused &&
            session.lastStartAt &&
            Date.now() - session.lastStartAt < START_DEBOUNCE_MS
        ) {
            return;
        }

        await saveSession(from, {
            path: [],
            paused: false,
            pauseReason: null,
            lastStartAt: Date.now()
        });

        await sendWhatsAppMessage(
            from,
            BOT_CONFIG.welcomeText,
            phoneNumberId
        );

        return;
    }

    // No session or paused session: remain silent
    if (!session || session.paused) {
        return;
    }

    // Inactivity timeout
    if (
        Date.now() - session.lastActive >
        SESSION_TTL_SECONDS * 1000
    ) {
        await deleteSession(from);
        return;
    }

    const currentPath = Array.isArray(session.path)
        ? session.path
        : [];

    let reply = '';

   // MAIN MENU: 00
if (text === '00' || text === 'menu') {
    if (session.language) {
        session.path = [session.language];
        reply = getCurrentPrompt(session.path);
    } else {
        session.path = [];
        reply = BOT_CONFIG.welcomeText;
    }
}

// BACK: 0
else if (text === '0' || text === 'back') {
    if (currentPath.length > 1) {
        session.path = currentPath.slice(0, -1);
        reply = getCurrentPrompt(session.path);
    } else {
        session.path = [];
        reply = BOT_CONFIG.welcomeText;
    }
}

    // NORMAL MENU OPTION
    else {
        const targetMap = getCurrentTree(currentPath);

        let chosenKey = text;

        if (currentPath.length === 0) {
            if (text === 'eng' || text === 'english') {
                chosenKey = '1';
            }

            if (text === 'guj' || text === 'ગુજરાતી') {
                chosenKey = '2';
            }
        }

        if (
            Object.prototype.hasOwnProperty.call(
                targetMap,
                chosenKey
            )
        ) {
            session.path = [...currentPath, chosenKey];

            reply = getCurrentPrompt(session.path);
        } else {
            // Invalid input pauses only this customer's bot.
            // No repeated menus and no automatic reply.
            session.paused = true;
            session.pauseReason = 'invalid_input';

            await saveSession(from, session);
            return;
        }
    }

    await saveSession(from, session);

    if (reply) {
        await sendWhatsAppMessage(from, reply, phoneNumberId);
    }
}

// --------------------------------------------------
// MAIN WEBHOOK
// --------------------------------------------------

app.post('/webhook', verifyMetaSignature, async (req, res) => {
    try {
        if (req.body?.object !== 'whatsapp_business_account') {
            return res.sendStatus(200);
        }

        const messages = await getIncomingMessages(req.body);

        for (const item of messages) {
            await processTextMessage(
                item.message,
                item.phoneNumberId
            );
        }

        return res.status(200).send('EVENT_RECEIVED');

    } catch (error) {
        console.error(
            'Webhook processing error:',
            error.message
        );

        return res.status(500).send('Webhook processing failed');
    }
});

module.exports = app;
