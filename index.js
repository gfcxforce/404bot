const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder, Routes, ChannelType } = require('discord.js');
const { REST } = require('@discordjs/rest');
const express = require('express');

// --- RENDER UYUMAMA SİSTEMİ ---
const app = express();
app.get('/', (req, res) => res.send('Bot 7/24 Aktif!'));
app.listen(process.env.PORT || 3000);

// --- BOT AYARLARI ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Veritabanı niyetine geçici hafıza (Bot kapanınca sıfırlanır)
const warnings = new Map();
const balances = new Map();

// --- SLASH KOMUTLARI ---
const commands = [
    new SlashCommandBuilder().setName('ban').setDescription('Kullanıcıyı banlar').addUserOption(o => o.setName('hedef').setDescription('Kişi').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    new SlashCommandBuilder().setName('kick').setDescription('Kullanıcıyı atar').addUserOption(o => o.setName('hedef').setDescription('Kişi').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    new SlashCommandBuilder().setName('uyar').setDescription('Kullanıcıya uyarı verir').addUserOption(o => o.setName('hedef').setDescription('Kişi').setRequired(true)),
    new SlashCommandBuilder().setName('uyarı-göster').setDescription('Uyarı sayısına bakar').addUserOption(o => o.setName('hedef').setDescription('Kişi').setRequired(true)),
    new SlashCommandBuilder().setName('kanal-kilitle').setDescription('Kanalı kapatır'),
    new SlashCommandBuilder().setName('kanal-aç').setDescription('Kanalı açar'),
    new SlashCommandBuilder().setName('kategori-aç').setDescription('Kategori oluşturur').addStringOption(o => o.setName('isim').setRequired(true)),
    new SlashCommandBuilder().setName('kategori-sil').setDescription('Kategoriyi siler').addChannelOption(o => o.setName('kategori').setRequired(true).addChannelTypes(ChannelType.GuildCategory)),
    new SlashCommandBuilder().setName('rol-ver').setDescription('Rol verir').addUserOption(o => o.setName('hedef').setRequired(true)).addRoleOption(o => o.setName('rol').setRequired(true)),
    new SlashCommandBuilder().setName('rol-al').setDescription('Rol alır').addUserOption(o => o.setName('hedef').setRequired(true)).addRoleOption(o => o.setName('rol').setRequired(true)),
    new SlashCommandBuilder().setName('sil').setDescription('Mesajları siler').addIntegerOption(o => o.setName('sayı').setDescription('1-100').setRequired(true)),
].map(c => c.toJSON());

// --- OTO MESAJ & EKONOMİ (SA-AS / OWO) ---
client.on('messageCreate', async (msg) => {
    if (msg.author.bot) return;
    const content = msg.content.toLowerCase();

    // Sa-As & Naber
    if (content === 'sa') msg.reply('Aleykümselam, hoş geldin kanka!');
    if (content === 'naber') msg.reply('İyiyim kanka, senden naber?');

    // OWO & CASH SİSTEMİ
    if (content === '!404 owo' || content === '!404 cash') {
        let bakiye = balances.get(msg.author.id) || 0;
        let sans = Math.floor(Math.random() * 200) - 50; // Hem ekler hem azaltır
        let yeniBakiye = bakiye + sans;
        balances.set(msg.author.id, yeniBakiye);
        msg.reply(`💰 İşlem Sonucu: **${sans} cash**. Güncel bakiye: **${yeniBakiye}**`);
    }
});

// --- KOMUT YÖNETİMİ ---
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName, options, guild, channel } = interaction;

    try {
        if (commandName === 'ban') {
            await options.getMember('hedef').ban();
            await interaction.reply('Kullanıcı banlandı.');
        }

        if (commandName === 'sil') {
            let sayi = options.getInteger('sayı');
            await channel.bulkDelete(sayi > 100 ? 100 : sayi);
            await interaction.reply({ content: `${sayi} mesaj silindi.`, ephemeral: true });
        }

        if (commandName === 'uyar') {
            const member = options.getMember('hedef');
            let count = (warnings.get(member.id) || 0) + 1;
            warnings.set(member.id, count);
            
            let muteTime = count === 1 ? 2*60*1000 : (count === 2 ? 3*60*1000 : 60*60*1000);
            await member.timeout(muteTime, `${count}. uyarı`);
            await interaction.reply(`${member} uyarıldı (${count}/3). Ceza: **${muteTime/60000} dk mute**.`);
        }

        if (commandName === 'kanal-kilitle') {
            await channel.permissionOverwrites.edit(guild.id, { SendMessages: false });
            await interaction.reply('Kanal kilitlendi. 🔒');
        }

        if (commandName === 'kanal-aç') {
            await channel.permissionOverwrites.edit(guild.id, { SendMessages: true });
            await interaction.reply('Kanal açıldı. 🔓');
        }

        if (commandName === 'kategori-aç') {
            const ad = options.getString('isim');
            await guild.channels.create({ name: ad, type: ChannelType.GuildCategory });
            await interaction.reply(`${ad} kategorisi açıldı.`);
        }

        if (commandName === 'kategori-sil') {
            const cat = options.getChannel('kategori');
            await cat.delete();
            await interaction.reply('Kategori silindi.');
        }

        if (commandName === 'rol-ver') {
            await options.getMember('hedef').roles.add(options.getRole('rol'));
