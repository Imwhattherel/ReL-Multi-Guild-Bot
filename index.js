const {
    Client,
    Collection,
    GatewayIntentBits,
    Partials
} = require("discord.js");

const { readdirSync } = require("fs");
const path = require("path");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v10");
const config = require("./config.json");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel]
});

const token = config.token;
client.commands = new Collection();
client._registeredEvents = new Set();
const rest = new REST({ version: "10" }).setToken(token);
const commands = [];

console.log(`\n🚀 Made by WhatTheReL\n🔧 Loading Version 1...\n`);


const commandsPath = path.join(__dirname, "src", "commands");
const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));

    if (!command?.data?.toJSON || typeof command.run !== "function") {
        console.warn(`⚠️ Skipped invalid command: ${file}`);
        continue;
    }

    commands.push(command.data.toJSON());
    client.commands.set(command.data.name, command);
}


const eventsPath = path.join(__dirname, "src", "events");
const eventFiles = readdirSync(eventsPath).filter(file => file.endsWith(".js"));

for (const file of eventFiles) {
    const event = require(path.join(eventsPath, file));

    if (!event.name || typeof event.execute !== "function") {
        console.warn(`⚠️ Skipped invalid event: ${file}`);
        continue;
    }

    if (!client._registeredEvents.has(event.name)) {
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
        client._registeredEvents.add(event.name);
    }
}


client.once("ready", async () => {
    try {
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        console.log(`✅ ${client.user.tag} is online and commands registered.`);
    } catch (error) {
        console.error("❌ Failed to register slash commands:", error);
    }
});

client.login(token);
