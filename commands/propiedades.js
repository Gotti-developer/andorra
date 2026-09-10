const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const House = require('../models/House');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('propiedades')
    .setDescription('Muestra la lista global de propietarios de casas.'),

  async execute(interaction) {
    const ownedHouses = await House.find({ ownerId: { $ne: null } });

    if (ownedHouses.length === 0) {
      return interaction.reply({ content: 'No hay ninguna propiedad vendida por el momento.', flags: 64 });
    }

    // Agrupar casas por propietario
    const ownersMap = {};
    ownedHouses.forEach(h => {
      if (!ownersMap[h.ownerId]) {
        ownersMap[h.ownerId] = [];
      }
      ownersMap[h.ownerId].push(h);
    });

    const listEmbed = new EmbedBuilder()
      .setTitle('📜 Registro General de Propietarios')
      .setColor(0xFFFF00);

    let descriptionText = '';
    const selectOptions = [];

    for (const [ownerId, houses] of Object.entries(ownersMap)) {
      descriptionText += `<@${ownerId}> — **${houses.length}** propiedad(es) (#${houses.map(h => h.houseId).join(', #')})\n`;
      
      selectOptions.push({
        label: `Ver propiedades de ID: ${ownerId}`,
        description: `Tiene ${houses.length} casa(s)`,
        value: ownerId
      });
    }

    listEmbed.setDescription(descriptionText);

    // Menú para consultar detalles de un propietario específico
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('select_owner_detail')
      .setPlaceholder('Ver más detalles de las casas de un usuario...')
      .addOptions(selectOptions.slice(0, 25)); // Límite de 25 opciones de Discord

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const response = await interaction.reply({ embeds: [listEmbed], components: [row], fetchReply: true });

    const collector = response.createMessageComponentCollector({ time: 180000 });

    collector.on('collect', async i => {
      if (i.isStringSelectMenu() && i.customId === 'select_owner_detail') {
        const selectedOwnerId = i.values[0];
        const userHouses = ownersMap[selectedOwnerId];

        const detailEmbed = new EmbedBuilder()
          .setTitle(`🏠 Propiedades de <@${selectedOwnerId}>`)
          .setColor(0xFFFF00)
          .setDescription(userHouses.map(h => `• **Casa #${h.houseId}** | Valor: $${h.price}`).join('\n'));

        await i.reply({ embeds: [detailEmbed], flags: 64 });
      }
    });
  }
};