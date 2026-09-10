const fetch = require('node-fetch');

// Lee los valores directamente desde el archivo .env o Render
const GUILD_ID = process.env.GUILD_ID;
const API_TOKEN = process.env.UNBELIEVABLE_API_KEY;

async function getUserBalance(userId) {
  const response = await fetch(`https://unbelievable.one/api/v1/guilds/${GUILD_ID}/users/${userId}`, {
    headers: { 'Authorization': API_TOKEN }
  });
  const data = await response.json();
  return data.cash || 0; // Cambia a data.bank si usas el banco
}

async function modifyUserBalance(userId, amount) {
  const response = await fetch(`https://unbelievable.one/api/v1/guilds/${GUILD_ID}/users/${userId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': API_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ cash: amount }) // Un valor negativo restará dinero
  });
  return response.ok;
}

module.exports = { getUserBalance, modifyUserBalance };