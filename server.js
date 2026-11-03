const express = require('express');
const crypto = require('crypto');
const app = express();

app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));

// Set these in Vercel Environment Variables.
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const APP_SECRET = process.env.APP_SECRET;
const GRAPH_API_VERSION = 'v26.0';

// Upstash Redis: configure both variables in Vercel.
const SESSION_TTL_SECONDS = 15 * 60;
const PAUSED_TTL_SECONDS = 365 * 24 * 60 * 60;
const MESSAGE_ID_TTL_SECONDS = 24 * 60 * 60;
const START_DEBOUNCE_MS = 3000;
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redisCommand(...args) {
    if (!REDIS_URL || !REDIS_TOKEN) {
        throw new Error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN');
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
        throw new Error(data.error || `Upstash request failed (${response.status})`);
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

    await redisCommand(
        'SET',
        sessionKey(phone),
        JSON.stringify(session),
        'EX',
        session.paused ? PAUSED_TTL_SECONDS : SESSION_TTL_SECONDS
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

// DATA-DRIVEN SHOP CONFIGURATION (Lightweight JSON Tree)
/* BOT_CONFIG_START */
const BOT_CONFIG = {
  "welcomeText": "🙏 *WELCOME TO KAUSHALYA COMPUTER CENTRE!*\nકૌશલ્યા કોમ્પ્યુટર સેન્ટરમાં આપનું હાર્દિક સ્વાગત છે!\n\n🌐 Please select your preferred language:\nકૃપા કરીને તમારી પસંદગીની ભાષા પસંદ કરો:\n\n1️⃣ English (ENG)\n2️⃣ ગુજરાતી (GUJ)\n\nReply *STOP* anytime to pause automated replies.",
  "tree": {
    "1": {
      "title": "English",
      "prompt": "🙏 *WELCOME TO KAUSHALYA COMPUTER CENTRE!*\n\n✨ What would you like to explore today?\n\n1️⃣ Courses 📚\n2️⃣ Computer Accessories 🖱️\n3️⃣ Services 🛠️\n4️⃣ Contact Details 📞\n\n━━━━━━━━━━━━━━\nReply with an option number.\n🔙 *0* – Go back\n🏠 *00* – Main menu\n🛑 *STOP* – Pause automated replies\n\nFor personal assistance, call +91 98985 25295.",
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
            },
            "7": {
              "title": "ADCA – Advanced Diploma in Computer Applications",
              "prompt": "🎓 *ADCA – ADVANCED DIPLOMA IN COMPUTER APPLICATIONS*\n\nFor current fees, duration, syllabus and batch details, please contact Kaushalya Computer Centre.\n\n📞 +91 98985 25295\n\n🔙 Reply *0* to return to Courses.\n🏠 Reply *00* for the main menu.",
              "children": {}
            },
            "8": {
              "title": "Diploma in Graphic Designing",
              "prompt": "🎓 *DIPLOMA IN GRAPHIC DESIGNING*\n\nFor current fees, duration, syllabus and batch details, please contact Kaushalya Computer Centre.\n\n📞 +91 98985 25295\n\n🔙 Reply *0* to return to Courses.\n🏠 Reply *00* for the main menu.",
              "children": {}
            },
            "9": {
              "title": "PGDCA – Post Graduate Diploma in Computer Applications",
              "prompt": "🎓 *PGDCA – POST GRADUATE DIPLOMA IN COMPUTER APPLICATIONS*\n\nFor current fees, duration, syllabus and batch details, please contact Kaushalya Computer Centre.\n\n📞 +91 98985 25295\n\n🔙 Reply *0* to return to Courses.\n🏠 Reply *00* for the main menu.",
              "children": {}
            },
            "10": {
              "title": "C Programming",
              "prompt": "🎓 *C PROGRAMMING*\n\nFor current fees, duration, syllabus and batch details, please contact Kaushalya Computer Centre.\n\n📞 +91 98985 25295\n\n🔙 Reply *0* to return to Courses.\n🏠 Reply *00* for the main menu.",
              "children": {}
            },
            "11": {
              "title": "C++ Programming",
              "prompt": "🎓 *C++ PROGRAMMING*\n\nFor current fees, duration, syllabus and batch details, please contact Kaushalya Computer Centre.\n\n📞 +91 98985 25295\n\n🔙 Reply *0* to return to Courses.\n🏠 Reply *00* for the main menu.",
              "children": {}
            },
            "12": {
              "title": "Video Editing",
              "prompt": "🎓 *VIDEO EDITING*\n\nFor current fees, duration, syllabus and batch details, please contact Kaushalya Computer Centre.\n\n📞 +91 98985 25295\n\n🔙 Reply *0* to return to Courses.\n🏠 Reply *00* for the main menu.",
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
          "title": "Services",
          "prompt": "🛠️ *KAUSHALYA COMPUTER CENTRE – SERVICES*\n\nChoose a service:\n\n1️⃣ Computer & Laptop Repairing\n2️⃣ Printer Services & Refilling\n3️⃣ Online Forms & Computer Job Work\n4️⃣ Computer Sales & Accessories\n5️⃣ Computer Courses\n\n🔙 Reply *0* to go back.\n🏠 Reply *00* for the main menu.\n📞 Need help? Call +91 98985 25295.",
          "children": {
            "1": {
              "title": "Computer & Laptop Repairing",
              "prompt": "🛠️ *COMPUTER & LAPTOP REPAIRING*\n\nFor diagnosis, repair and maintenance enquiries, contact us.\n📞 +91 98985 25295\n\n🔙 Reply *0* to return to Services.\n🏠 Reply *00* for the main menu.",
              "children": {}
            },
            "2": {
              "title": "Printer Services & Refilling",
              "prompt": "🖨️ *PRINTER SERVICES & REFILLING*\n\nFor printer service, cartridge refilling and availability, contact us.\n📞 +91 98985 25295\n\n🔙 Reply *0* to return to Services.\n🏠 Reply *00* for the main menu.",
              "children": {}
            },
            "3": {
              "title": "Online Forms & Computer Job Work",
              "prompt": "📄 *ONLINE FORMS & COMPUTER JOB WORK*\n\nFor online form assistance and computer job work, please contact us with your requirements.\n📞 +91 98985 25295\n\n🔙 Reply *0* to return to Services.\n🏠 Reply *00* for the main menu.",
              "children": {}
            },
            "4": {
              "title": "Computer Sales & Accessories",
              "prompt": "🖥️ *COMPUTER SALES & ACCESSORIES*\n\nFor computer, laptop, accessories, product availability and prices, contact us.\n📞 +91 98985 25295\n\n🔙 Reply *0* to return to Services.\n🏠 Reply *00* for the main menu.",
              "children": {}
            },
            "5": {
              "title": "Computer Courses",
              "prompt": "📚 *COMPUTER COURSES*\n\nReply *00* to return to the main menu, then choose *1 – Courses* to view the course list.\n📞 +91 98985 25295\n\n🔙 Reply *0* to return to Services.",
              "children": {}
            }
          }
        },
        "4": {
          "title": "Contact Details",
          "prompt": "🏫 *KAUSHALYA COMPUTER CENTRE*\n📞 *CONTACT DETAILS*\n\n📱 Mobile / WhatsApp: +91 98985 25295\n☎️ Alternate Number: +91 99985 25295\n📧 Email: customerkcc@gmail.com\n📸 Instagram: https://www.instagram.com/kaushalyacomputer_kapadwanj\n🕒 Business Hours: 8 AM to 8 PM\n\n📍 For the exact address and weekly holiday, please call us.\n\n🔙 Reply *0* to go back.\n🏠 Reply *00* for the main menu.",
          "children": {}
        }
      }
    },
    "2": {
      "title": "ગુજરાતી",
      "prompt": "🙏 *કૌશલ્યા કોમ્પ્યુટર સેન્ટરમાં આપનું સ્વાગત છે!*\n\nકૃપા કરીને વિકલ્પ પસંદ કરો:\n\n1️⃣ કોમ્પ્યુટર કોર્સ 📚\n2️⃣ કોમ્પ્યુટર એસેસરીઝ 🖱️\n3️⃣ સેવાઓ 🛠️\n4️⃣ સંપર્ક વિગતો 📞\n\n🔙 *0* – પાછા જાઓ\n🏠 *00* – મુખ્ય મેનૂ\n🛑 *STOP* – ઓટોમેટેડ જવાબો બંધ કરો\n\nવ્યક્તિગત મદદ માટે: +91 98985 25295",
      "children": {
        "1": {
          "title": "કોમ્પ્યુટર કોર્સ",
          "prompt": "📚 *કોમ્પ્યુટર કોર્સ – કોર્સ પસંદ કરો*\n\n1️⃣  *CCC* – Course on Computer Concepts\n2️⃣ Tally Prime with GST\n3️⃣ DTP – Desktop Publishing\n4️⃣ AutoCAD\n5️⃣ DCA – Diploma in Computer Applications\n6️⃣ Diploma in Web Designing\n7️⃣ ADCA – Advanced Diploma in Computer Applications\n8️⃣ Diploma in Graphic Designing\n9️⃣ PGDCA – Post Graduate Diploma in Computer Applications\n10️⃣ C Programming\n11️⃣ C++ Programming\n12️⃣ Video Editing\n\n🔙 *0* – પાછા જાઓ\n🏠 *00* – મુખ્ય મેનૂ",
          "children": {
            "1": {
              "title": "CCC – Course on Computer Concepts",
              "prompt": "🎓 *CCC – Course on Computer Concepts*\n\n💰 કોર્સ ફી: ₹3,150\n⏳ સમયગાળો: 2 મહિના\n\n📚 *અભ્યાસક્રમ*\nકમ્પ્યુટર ફંડામેન્ટલ્સ, MS Paint, PowerPoint, Word, ગુજરાતી ટાઇપિંગ, Excel, Windows, ઇન્ટરનેટની મૂળભૂત જાણકારી, ChatGPT અને Google Gemini, પ્રેક્ટિકલ પ્રોજેક્ટ.\n\nવધુ માહિતી માટે સંપર્ક કરો: +91 98985 25295\n\n🔙 *0* – કોર્સ યાદી પર પાછા જાઓ\n🏠 *00* – મુખ્ય મેનૂ",
              "children": {}
            },
            "2": {
              "title": "Tally Prime with GST",
              "prompt": "🎓 *Tally Prime with GST*\n\n💰 કોર્સ ફી: ₹4,500\n⏳ સમયગાળો: 2 મહિના\n\n📚 *અભ્યાસક્રમ*\nTally Prime, કંપની બનાવવી, ગ્રુપ અને લેજર, વાઉચર એન્ટ્રી, બેલેન્સ શીટ, નફા-નુકસાન, બિલિંગ, સ્ટોક મેનેજમેન્ટ, GST, બેકઅપ અને રિસ્ટોર.\n\nવધુ માહિતી માટે સંપર્ક કરો: +91 98985 25295\n\n🔙 *0* – કોર્સ યાદી પર પાછા જાઓ\n🏠 *00* – મુખ્ય મેનૂ",
              "children": {}
            },
            "3": {
              "title": "DTP – Desktop Publishing",
              "prompt": "🎓 *DTP – Desktop Publishing*\n\n💰 કોર્સ ફી: ₹4,500\n⏳ સમયગાળો: 3 મહિના\n\n📚 *અભ્યાસક્રમ*\nકમ્પ્યુટર ફંડામેન્ટલ્સ, MS Paint, Instant Artist, PageMaker, CorelDRAW, Adobe Photoshop અને ગુજરાતી ટાઇપિંગ.\n\nવધુ માહિતી માટે સંપર્ક કરો: +91 98985 25295\n\n🔙 *0* – કોર્સ યાદી પર પાછા જાઓ\n🏠 *00* – મુખ્ય મેનૂ",
              "children": {}
            },
            "4": {
              "title": "AutoCAD",
              "prompt": "🎓 *AutoCAD*\n\n💰 કોર્સ ફી: ₹4,500\n⏳ સમયગાળો: 2 મહિના\n\n📚 *અભ્યાસક્રમ*\nCAD પરિચય, 2D અને 3D કમાન્ડ, Isometric Drawing, Dimensions, Drawing Tools અને પ્રેક્ટિકલ પ્રોજેક્ટ.\n\nવધુ માહિતી માટે સંપર્ક કરો: +91 98985 25295\n\n🔙 *0* – કોર્સ યાદી પર પાછા જાઓ\n🏠 *00* – મુખ્ય મેનૂ",
              "children": {}
            },
            "5": {
              "title": "DCA – Diploma in Computer Applications",
              "prompt": "🎓 *DCA – Diploma in Computer Applications*\n\n💰 કોર્સ ફી: ₹9,500\n⏳ સમયગાળો: 6 મહિના\n\n📚 *અભ્યાસક્રમ*\nકમ્પ્યુટર ફંડામેન્ટલ્સ, MS Paint, MS Word, MS Excel, MS PowerPoint, ઇન્ટરનેટ અને પ્રેક્ટિકલ પ્રોજેક્ટ.\n\nવધુ માહિતી માટે સંપર્ક કરો: +91 98985 25295\n\n🔙 *0* – કોર્સ યાદી પર પાછા જાઓ\n🏠 *00* – મુખ્ય મેનૂ",
              "children": {}
            },
            "6": {
              "title": "Diploma in Web Designing",
              "prompt": "🎓 *Diploma in Web Designing*\n\n💰 કોર્સ ફી: ₹11,500\n⏳ સમયગાળો: 4 મહિના\n\n📚 *અભ્યાસક્રમ*\nWebsite Fundamentals, HTML, CSS, Adobe Dreamweaver, WordPress, Website Uploading & Hosting, Website Development, Blogging અને Adobe Photoshop.\n\nવધુ માહિતી માટે સંપર્ક કરો: +91 98985 25295\n\n🔙 *0* – કોર્સ યાદી પર પાછા જાઓ\n🏠 *00* – મુખ્ય મેનૂ",
              "children": {}
            },
            "7": {
              "title": "ADCA – Advanced Diploma in Computer Applications",
              "prompt": "🎓 *ADCA – Advanced Diploma in Computer Applications*\n\nફી, સમયગાળો, અભ્યાસક્રમ અને બેચની માહિતી માટે કૃપા કરીને કૌશલ્યા કોમ્પ્યુટર સેન્ટરનો સંપર્ક કરો.\n📞 +91 98985 25295\n\n🔙 *0* – કોર્સ યાદી પર પાછા જાઓ\n🏠 *00* – મુખ્ય મેનૂ",
              "children": {}
            },
            "8": {
              "title": "Diploma in Graphic Designing",
              "prompt": "🎓 *Diploma in Graphic Designing*\n\nફી, સમયગાળો, અભ્યાસક્રમ અને બેચની માહિતી માટે કૃપા કરીને કૌશલ્યા કોમ્પ્યુટર સેન્ટરનો સંપર્ક કરો.\n📞 +91 98985 25295\n\n🔙 *0* – કોર્સ યાદી પર પાછા જાઓ\n🏠 *00* – મુખ્ય મેનૂ",
              "children": {}
            },
            "9": {
              "title": "PGDCA – Post Graduate Diploma in Computer Applications",
              "prompt": "🎓 *PGDCA – Post Graduate Diploma in Computer Applications*\n\nફી, સમયગાળો, અભ્યાસક્રમ અને બેચની માહિતી માટે કૃપા કરીને કૌશલ્યા કોમ્પ્યુટર સેન્ટરનો સંપર્ક કરો.\n📞 +91 98985 25295\n\n🔙 *0* – કોર્સ યાદી પર પાછા જાઓ\n🏠 *00* – મુખ્ય મેનૂ",
              "children": {}
            },
            "10": {
              "title": "C Programming",
              "prompt": "🎓 *C Programming*\n\nફી, સમયગાળો, અભ્યાસક્રમ અને બેચની માહિતી માટે કૃપા કરીને કૌશલ્યા કોમ્પ્યુટર સેન્ટરનો સંપર્ક કરો.\n📞 +91 98985 25295\n\n🔙 *0* – કોર્સ યાદી પર પાછા જાઓ\n🏠 *00* – મુખ્ય મેનૂ",
              "children": {}
            },
            "11": {
              "title": "C++ Programming",
              "prompt": "🎓 *C++ Programming*\n\nફી, સમયગાળો, અભ્યાસક્રમ અને બેચની માહિતી માટે કૃપા કરીને કૌશલ્યા કોમ્પ્યુટર સેન્ટરનો સંપર્ક કરો.\n📞 +91 98985 25295\n\n🔙 *0* – કોર્સ યાદી પર પાછા જાઓ\n🏠 *00* – મુખ્ય મેનૂ",
              "children": {}
            },
            "12": {
              "title": "Video Editing",
              "prompt": "🎓 *Video Editing*\n\nફી, સમયગાળો, અભ્યાસક્રમ અને બેચની માહિતી માટે કૃપા કરીને કૌશલ્યા કોમ્પ્યુટર સેન્ટરનો સંપર્ક કરો.\n📞 +91 98985 25295\n\n🔙 *0* – કોર્સ યાદી પર પાછા જાઓ\n🏠 *00* – મુખ્ય મેનૂ",
              "children": {}
            }
          }
        },
        "2": {
          "title": "કોમ્પ્યુટર એસેસરીઝ",
          "prompt": "🖥️ *કોમ્પ્યુટર એસેસરીઝ*\n\n▪️ કીબોર્ડ અને માઉસ\n▪️ હેડફોન અને સ્પીકર્સ\n▪️ USB ડ્રાઇવ અને મેમરી કાર્ડ\n▪️ ડેટા કેબલ અને કનેક્ટર્સ\n▪️ ચાર્જર અને એડેપ્ટર\n▪️ કોમ્પ્યુટર કેબલ\n▪️ Wi-Fi અને નેટવર્કિંગ એસેસરીઝ\n▪️ પ્રિન્ટર એસેસરીઝ અને ઇંક\n▪️ માઉસ પેડ\n▪️ મોનિટર અને કોમ્પ્યુટર પાર્ટ્સ\n▪️ લેપટોપ એસેસરીઝ\n▪️ HDMI અને VGA કેબલ\n▪️ USB હબ અને વેબકેમ\n▪️ પાવર સપ્લાય અને અન્ય એસેસરીઝ\n\nઉપલબ્ધતા અને કિંમત માટે સંપર્ક કરો: +91 98985 25295\n\n🔙 *0* – પાછા જાઓ\n🏠 *00* – મુખ્ય મેનૂ",
          "children": {}
        },
        "3": {
          "title": "સેવાઓ",
          "prompt": "🛠️ *અમારી સેવાઓ – વિકલ્પ પસંદ કરો*\n\n1️⃣ કોમ્પ્યુટર અને લેપટોપ રિપેરિંગ\n2️⃣ પ્રિન્ટર સર્વિસ અને રિફિલિંગ\n3️⃣ ઓનલાઇન ફોર્મ અને કોમ્પ્યુટર જોબ વર્ક\n4️⃣ કોમ્પ્યુટર વેચાણ અને એસેસરીઝ\n5️⃣ કોમ્પ્યુટર કોર્સ\n\n🔙 *0* – પાછા જાઓ\n🏠 *00* – મુખ્ય મેનૂ\n📞 +91 98985 25295",
          "children": {
            "1": {
              "title": "કોમ્પ્યુટર અને લેપટોપ રિપેરિંગ",
              "prompt": "🛠️ *કોમ્પ્યુટર અને લેપટોપ રિપેરિંગ*\n\nતપાસ, રિપેરિંગ અને મેન્ટેનન્સ માટે સંપર્ક કરો: +91 98985 25295\n\n🔙 *0* – સેવાઓ પર પાછા જાઓ\n🏠 *00* – મુખ્ય મેનૂ",
              "children": {}
            },
            "2": {
              "title": "પ્રિન્ટર સર્વિસ અને રિફિલિંગ",
              "prompt": "🖨️ *પ્રિન્ટર સર્વિસ અને રિફિલિંગ*\n\nપ્રિન્ટર સર્વિસ અને કાર્ટ્રિજ રિફિલિંગ માટે સંપર્ક કરો: +91 98985 25295\n\n🔙 *0* – સેવાઓ પર પાછા જાઓ\n🏠 *00* – મુખ્ય મેનૂ",
              "children": {}
            },
            "3": {
              "title": "ઓનલાઇન ફોર્મ અને કોમ્પ્યુટર જોબ વર્ક",
              "prompt": "📄 *ઓનલાઇન ફોર્મ અને કોમ્પ્યુટર જોબ વર્ક*\n\nઓનલાઇન ફોર્મ અને કોમ્પ્યુટર જોબ વર્ક માટે તમારી જરૂરિયાત સાથે સંપર્ક કરો: +91 98985 25295\n\n🔙 *0* – સેવાઓ પર પાછા જાઓ\n🏠 *00* – મુખ્ય મેનૂ",
              "children": {}
            },
            "4": {
              "title": "કોમ્પ્યુટર વેચાણ અને એસેસરીઝ",
              "prompt": "🖥️ *કોમ્પ્યુટર વેચાણ અને એસેસરીઝ*\n\nકોમ્પ્યુટર, લેપટોપ, એસેસરીઝ, ઉપલબ્ધતા અને કિંમત માટે સંપર્ક કરો: +91 98985 25295\n\n🔙 *0* – સેવાઓ પર પાછા જાઓ\n🏠 *00* – મુખ્ય મેનૂ",
              "children": {}
            },
            "5": {
              "title": "કોમ્પ્યુટર કોર્સ",
              "prompt": "📚 *કોમ્પ્યુટર કોર્સ*\n\nમુખ્ય મેનૂ પર જઈને *1 – Courses* પસંદ કરો.\nવધુ માહિતી: +91 98985 25295\n\n🔙 *0* – સેવાઓ પર પાછા જાઓ\n🏠 *00* – મુખ્ય મેનૂ",
              "children": {}
            }
          }
        },
        "4": {
          "title": "સંપર્ક વિગતો",
          "prompt": "🏫 *કૌશલ્યા કોમ્પ્યુટર સેન્ટર*\n📞 *સંપર્ક વિગતો*\n\n📱 મોબાઇલ / WhatsApp: +91 98985 25295\n☎️ વૈકલ્પિક નંબર: +91 99985 25295\n📧 Email: customerkcc@gmail.com\n📸 Instagram: https://www.instagram.com/kaushalyacomputer_kapadwanj\n🕒 સમય: સવારે 8 થી રાત્રે 8\n\nચોક્કસ સરનામું અને સાપ્તાહિક રજા જાણવા ફોન કરો.\n\n🔙 *0* – પાછા જાઓ\n🏠 *00* – મુખ્ય મેનૂ",
          "children": {}
        }
      }
    }
  }
};
async function sendWhatsAppMessage(to, textBody, phoneNumberId, lastInboundAt) {
    // Free-form text is permitted only within 24 hours of the customer's latest message.
    const windowOpen = Number.isFinite(lastInboundAt) &&
        Date.now() - lastInboundAt >= 0 &&
        Date.now() - lastInboundAt < 24 * 60 * 60 * 1000;

    if (!WHATSAPP_TOKEN || !phoneNumberId || !to || !textBody || !windowOpen) {
        if (!windowOpen) console.warn('Skipped free-form reply: customer service window is closed or timestamp is missing.');
        return false;
    }

    try {
        const response = await fetch(
            `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
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
            console.error('WhatsApp send failed:', response.status, errorBody.slice(0, 500));
            return false;
        }

        return true;
    } catch (error) {
        console.error('WhatsApp send error:', error.message);
        return false;
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

function normalizeText(value) {
    return String(value || '').trim().toLowerCase();
}

async function pauseForHuman(customerPhone) {
    if (!customerPhone) return;

    const session = await getSession(customerPhone) || {
        path: [],
        paused: false,
        lastActive: Date.now()
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

            // Coexistence app-originated messages are outbound echoes.
            // Pause automation for the recipient so staff can handle that conversation.
            if (change?.field === 'smb_message_echoes') {
                for (const echo of value?.message_echoes || []) {
                    if (echo?.to && /^\+?\d+$/.test(String(echo.to))) {
                        await pauseForHuman(String(echo.to).replace(/^\+/, ''));
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

function verifyMetaSignature(req, res, next) {
    // Signature verification must be enabled in production.
    if (!APP_SECRET) {
        if (process.env.NODE_ENV === 'production') {
            return res.status(500).send('APP_SECRET is not configured');
        }
        return next();
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

app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (!VERIFY_TOKEN) {
        console.error('VERIFY_TOKEN is not configured.');
        return res.status(500).send('Webhook verification is not configured');
    }

    if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
        return res.status(200).send(challenge);
    }

    return res.sendStatus(403);
});

app.get('/', (req, res) => {
    res.status(200).send('KCC WhatsApp Bot Engine is Active');
});

async function processTextMessage(message, phoneNumberId) {
    if (
        !message ||
        message.type !== 'text' ||
        !phoneNumberId ||
        !/^\d+$/.test(String(phoneNumberId)) ||
        !message.from ||
        !/^\d+$/.test(String(message.from))
    ) return;

    const from = String(message.from);
    const messageId = message.id;
    const timestampSeconds = Number(message.timestamp);
    const inboundAt = timestampSeconds > 0
        ? timestampSeconds * 1000
        : NaN;

    // Never send a free-form response to a delayed event outside the 24-hour window.
    if (
        !Number.isFinite(inboundAt) ||
        inboundAt > Date.now() + 5 * 60 * 1000 ||
        Date.now() - inboundAt >= 24 * 60 * 60 * 1000
    ) {
        console.warn('Ignored message with missing, future, or expired timestamp.');
        return;
    }

    // Redis SET NX makes webhook retries idempotent per inbound message ID.
    if (await wasAlreadyHandled(messageId)) return;

    const text = normalizeText(message.text?.body).replace(/[.!?]+$/g, '');
    let session = await getSession(from);

    // STOP/UNSUBSCRIBE pauses automated replies until explicit START.
    if (['stop', 'unsubscribe', 'cancel', 'exit'].includes(text)) {
        if (session?.paused && session.pauseReason === 'stop') return;

        session = session || { path: [] };
        session.paused = true;
        session.pauseReason = 'stop';
        session.lastInboundAt = inboundAt;

        await saveSession(from, session);

        await sendWhatsAppMessage(
            from,
            'You have stopped receiving automated messages. Send *START* whenever you want to use the menu again.',
            phoneNumberId,
            inboundAt
        );

        return;
    }

    // Explicit customer START resumes the menu.
    if (text === 'start') {
        const now = Date.now();

        if (
            session &&
            !session.paused &&
            session.lastStartAt &&
            now - session.lastStartAt < START_DEBOUNCE_MS
        ) return;

        session = {
            path: [],
            paused: false,
            pauseReason: null,
            lastStartAt: now,
            lastInboundAt: inboundAt
        };

        await saveSession(from, session);
        await sendWhatsAppMessage(
            from,
            BOT_CONFIG.welcomeText,
            phoneNumberId,
            inboundAt
        );

        return;
    }

    // A paused customer receives no automated replies until START.
    if (!session || session.paused) return;

    // Keep 15-minute menu inactivity separate from Meta's 24-hour messaging window.
    if (
        !session.lastActive ||
        Date.now() - session.lastActive > SESSION_TTL_SECONDS * 1000
    ) {
        await deleteSession(from);
        return;
    }

    session.lastInboundAt = inboundAt;

    const currentPath = Array.isArray(session.path) ? session.path : [];
    let reply = '';

    if (text === '00' || text === 'menu') {
        if (currentPath.length > 0) {
            session.path = [currentPath[0]];
            reply =
                resolvePath(BOT_CONFIG.tree, session.path)?.node?.prompt ||
                BOT_CONFIG.welcomeText;
        } else {
            session.path = [];
            reply = BOT_CONFIG.welcomeText;
        }
    } else if (text === '0' || text === 'back') {
        if (currentPath.length > 1) {
            session.path = currentPath.slice(0, -1);
            reply =
                resolvePath(BOT_CONFIG.tree, session.path)?.node?.prompt ||
                BOT_CONFIG.welcomeText;
        } else {
            session.path = [];
            reply = BOT_CONFIG.welcomeText;
        }
    } else {
        const targetMap = currentPath.length === 0
            ? BOT_CONFIG.tree
            : (resolvePath(BOT_CONFIG.tree, currentPath)?.children || {});

        let chosenKey = text;

        if (currentPath.length === 0) {
            if (['eng', 'english'].includes(text)) chosenKey = '1';
            if (['guj', 'gujarati', 'ગુજરાતી'].includes(text)) chosenKey = '2';
        }

        if (Object.prototype.hasOwnProperty.call(targetMap, chosenKey)) {
            session.path = [...currentPath, chosenKey];

            reply =
                resolvePath(BOT_CONFIG.tree, session.path)?.node?.prompt ||
                'Selected.';
        } else {
            // Invalid input pauses this customer only.
            session.paused = true;
            session.pauseReason = 'invalid_input';
            await saveSession(from, session);
            return;
        }
    }

    await saveSession(from, session);

    if (reply) {
        await sendWhatsAppMessage(from, reply, phoneNumberId, inboundAt);
    }
}

app.post('/webhook', verifyMetaSignature, async (req, res) => {
    try {
        if (req.body?.object !== 'whatsapp_business_account') {
            return res.sendStatus(200);
        }

        const messages = await getIncomingMessages(req.body);

        for (const item of messages) {
            await processTextMessage(item.message, item.phoneNumberId);
        }

        // Acknowledge handled events, including send failures.
        return res.status(200).send('EVENT_RECEIVED');
    } catch (error) {
        console.error('Webhook processing error:', error.message);

        // Non-2xx response allows Meta to retry transient storage failures.
        return res.status(500).send('Webhook processing failed');
    }
});
