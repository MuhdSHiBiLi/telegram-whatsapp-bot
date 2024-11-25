const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

// Replace with your BotFather token
const token = process.env.BOT_TOKEN;

const bot = new TelegramBot(token, { polling: true });

const userSessions = {}; // To track user inputs

console.log('Bot is running...');

// Utility function for fully encoded text (UTF-8)
function fullyEncodeText(text) {
    return Array.from(text)
        .map(char => {
            if (char === '\n') {
                return '%0A'; // Encode newlines explicitly as %0A
            }
            const utf8Bytes = new TextEncoder().encode(char); // Convert to UTF-8 bytes
            return Array.from(utf8Bytes)
                .map(byte => `%${byte.toString(16).toUpperCase()}`) // Convert bytes to %XX
                .join('');
        })
        .join('');
}

// Utility function for minimal encoding using encodeURIComponent
function minimallyEncodeText(text) {
    return encodeURIComponent(text); // Automatically encodes spaces as %20 and other special characters
}

// Start command to initiate the bot
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Welcome! I’ll help you create a WhatsApp link.\n\nPlease send the phone number (including country code, e.g., +1234567890).');
    userSessions[chatId] = { step: 'number' }; // Start session
});

// Message handler for user input
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;

    // If no session exists, ask the user to start with /start
    if (!userSessions[chatId]) {
        bot.sendMessage(chatId, 'Please use /start to begin.');
        return;
    }

    const userState = userSessions[chatId];

    // Step 1: Collect phone number
    if (userState.step === 'number') {
        const number = msg.text.trim();

        // Validate phone number format
        if (!/^\+?\d{10,15}$/.test(number)) {
            bot.sendMessage(chatId, 'Invalid phone number. Please enter a valid number with country code (e.g., +1234567890).');
            return;
        }

        userState.number = number; // Save the phone number
        console.log(`User entered number: ${userState.number}`);
        userState.step = 'message'; // Move to next step
        bot.sendMessage(chatId, `Great! Now, please send the message you want to link to the number: ${number}`);
    }
    // Step 2: Collect message and generate WhatsApp link
    else if (userState.step === 'message') {
        const rawMessage = msg.text.trim();
        console.log(`User entered message: ${rawMessage}`);
        const fullEncodedMessage = fullyEncodeText(rawMessage); // Fully encode the message
        const minimalEncodedMessage = minimallyEncodeText(rawMessage); // Use encodeURIComponent for minimal encoding
        const number = userState.number;

        const fullLink = `https://wa.me/${number}?text=${fullEncodedMessage}`;
        const shortLink = `https://wa.me/${number}?text=${minimalEncodedMessage}`;

        // Inline keyboard with buttons
        const options = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: 'Copy Fully Encoded Link', callback_data: `copy|${fullLink}` },
                        { text: 'Copy Minimal Encoded Link', callback_data: `copy|${shortLink}` }
                    ]
                ]
            }
        };

        bot.sendMessage(chatId, 'Here are your options:', options);
        delete userSessions[chatId]; // Clear the session after creating the link
    }
});

// Handle button presses
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data.startsWith('copy|')) {
        const link = data.split('|')[1];
        bot.answerCallbackQuery(query.id, { text: 'Link ready to use!' });
        bot.sendMessage(chatId, `Copy this link: ${link}`, {
            reply_markup: { remove_keyboard: true }
        });
    }
});

// Global error handling for polling errors
bot.on('polling_error', (error) => {
    console.error('Polling error:', error.code, error.response ? error.response.body : error.message);
});

// Dummy HTTP server for Render
const http = require('http');
const PORT = process.env.PORT || 3000; // Use Render's dynamically assigned port
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running.');
}).listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
