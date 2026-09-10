require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const express = require('express');

// Inicialización del cliente de Discord
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

// Carga de comandos slash desde la carpeta commands/
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
    }
  }
}

// Manejador de interacciones
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: 'Ocurrió un error al ejecutar este comando.', flags: 64 });
  }
});

// Evento cuando el bot inicia
client.once('ready', () => {
  console.log(`🤖 Bot iniciado con éxito como ${client.user.tag}`);
});

// Conectar a MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Conectado exitosamente a MongoDB Atlas'))
  .catch(err => console.error('❌ Error de conexión a MongoDB:', err));

// Servidor Express para evitar que Render cierre el servicio por puertos
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('El bot está activo.'));
app.listen(PORT, () => console.log(`🌐 Servidor HTTP escuchando en el puerto ${PORT}`));

// Iniciar sesión en Discord
client.login(process.env.DISCORD_TOKEN);