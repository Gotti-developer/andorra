const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const House = require('../models/House');
const { getUserBalance, modifyUserBalance } = require('../utils/economy');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('casas')
    .setDescription('Muestra el catálogo de casas disponibles para compra.'),

  async execute(interaction) {
    const houses = await House.find().sort({ houseId: 1 });

    if (houses.length === 0) {
      return interaction.reply({ content: 'No hay casas registradas en la base de datos.', flags: 64 });
    }

    // Embed Principal en Amarillo
    const mainEmbed = new EmbedBuilder()
      .setTitle('🏠 Catálogo de Casas Disponibles')
      .setColor(0xFFFF00)
      .setDescription(`Hay **${houses.length}** casas registradas en el catálogo.`)
      .setFooter({ text: 'Selecciona una casa en el menú para ver su información y foto.' });

    let houseList = '';
    houses.forEach(h => {
      const status = h.ownerId ? `🔴 Ocupada (<@${h.ownerId}>)` : '🟢 Disponible';
      houseList += `**Casa #${h.houseId}** | Precio: $${h.price} | Estado: ${status}\n`;
    });

    mainEmbed.addFields({ name: 'Lista de Propiedades', value: houseList });

    // Opciones para el menú desplegable
    const options = houses.map(h => ({
      label: `Casa #${h.houseId} - $${h.price}`,
      description: h.ownerId ? 'Propiedad comprada' : 'Disponible para comprar',
      value: h.houseId.toString()
    }));

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('select_house_panel')
      .setPlaceholder('Busca la casa que quieras ver...')
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const response = await interaction.reply({ embeds: [mainEmbed], components: [row], fetchReply: true });

    // Coleccionador de interacciones (Menús y Botones)
    const collector = response.createMessageComponentCollector({ time: 300000 }); // 5 minutos

    collector.on('collect', async i => {
      // Manejar el Menú Desplegable
      if (i.isStringSelectMenu() && i.customId === 'select_house_panel') {
        const selectedId = parseInt(i.values[0]);
        const house = await House.findOne({ houseId: selectedId });

        if (!house) {
          return i.reply({ content: 'Esa casa ya no existe.', flags: 64 });
        }

        const detailEmbed = new EmbedBuilder()
          .setTitle(`🏠 Información de la Casa #${house.houseId}`)
          .setColor(0xFFFF00)
          .setImage(house.imageUrl)
          .addFields(
            { name: 'Precio', value: `$${house.price}`, inline: true },
            { name: 'Estado', value: house.ownerId ? `🔴 Adquirida por <@${house.ownerId}>` : '🟢 Disponible', inline: true }
          );

        const buyButton = new ButtonBuilder()
          .setCustomId(`buy_${house.houseId}`)
          .setLabel('Comprar')
          .setStyle(ButtonStyle.Success);

        const closeButton = new ButtonBuilder()
          .setCustomId('close_house_panel')
          .setLabel('Cerrar')
          .setStyle(ButtonStyle.Danger);

        const buttonRow = new ActionRowBuilder().addComponents(buyButton, closeButton);

        await i.update({ embeds: [detailEmbed], components: [buttonRow] });
      }

      // Manejar Botones (Comprar y Cerrar)
      if (i.isButton()) {
        if (i.customId === 'close_house_panel') {
          return i.message.delete().catch(() => {});
        }

        if (i.customId.startsWith('buy_')) {
          const targetId = parseInt(i.customId.split('_')[1]);
          const houseToBuy = await House.findOne({ houseId: targetId });

          // Validación si la casa ya fue comprada
          if (houseToBuy.ownerId) {
            return i.reply({ content: '❌ No es posible adquirir esta propiedad, ya cuenta con un propietario.', flags: 64 });
          }

          // Verificación de economía
          const userBalance = await getUserBalance(i.user.id);
          if (userBalance < houseToBuy.price) {
            return i.reply({ content: `❌ Dinero insuficiente. Necesitas **$${houseToBuy.price}** y tienes **$${userBalance}**.`, flags: 64 });
          }

          // Procesar la compra
          await modifyUserBalance(i.user.id, -houseToBuy.price);
          houseToBuy.ownerId = i.user.id;
          await houseToBuy.save();

          // Actualizar el Embed tras la compra exitosa
          const updatedEmbed = new EmbedBuilder()
            .setTitle(`🏠 Información de la Casa #${houseToBuy.houseId}`)
            .setColor(0xFFFF00)
            .setImage(houseToBuy.imageUrl)
            .addFields(
              { name: 'Precio', value: `$${houseToBuy.price}`, inline: true },
              { name: 'Estado', value: `🔴 Adquirida por <@${i.user.id}>`, inline: true }
            );

          await i.update({ embeds: [updatedEmbed], components: [] });
          await i.followUp({ content: `🎉 ¡Felicidades <@${i.user.id}>! Compraste la **Casa #${houseToBuy.houseId}** por **$${houseToBuy.price}**.` });
        }
      }
    });
  }
};