const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();


// Replace with your BotFather tokeconst token = process.env.BOT_TOKEN;
const token = process.env.BOT_TOKEN;

const bot = new TelegramBot(token, { polling: true });

const userSessions = {}; // To track user inputs

console.log('Bot is running...');

// Utility function to fully encode text
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




// Start command to initiate the bot
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Welcome! I’ll help you create a WhatsApp link.\n\nPlease send the phone number (including country code, e.g., +1234567890).');
    userSessions[chatId] = { step: 'number' }; // Start session
});

// Message handler for user input
bot.on('message', (msg) => {
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
        console.log(`USER ENTERD MESSAGE IS :--\n ${rawMessage}`);
        const message = fullyEncodeText(rawMessage); // Fully encode the message
        const number = userState.number;
        const link = `https://wa.me/${number}?text=${message}`;

        bot.sendMessage(chatId, `Here’s your WhatsApp link: ${link}`);
        delete userSessions[chatId]; // Clear the session after creating the link
    }
});

// Global error handling for polling errors
bot.on('polling_error', (error) => {
    console.error('Polling error:', error.code, error.response ? error.response.body : error.message);
});

//dumy http server for render
const http = require('http');

const PORT = process.env.PORT || 3000; // Use Render's dynamically assigned port
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running.');
}).listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
