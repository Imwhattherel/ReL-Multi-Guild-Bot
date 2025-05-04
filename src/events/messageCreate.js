const { ChannelType } = require("discord.js");

module.exports = {
  name: "messageCreate",
  async execute(message) {
    const client = message.client;

 
    if (message.author.bot) return;
    if (message.channel.type !== ChannelType.GuildText) return;

 
    const stickyMessages = client.stickyMessages;
    if (!stickyMessages || !stickyMessages.has(message.channel.id)) return;

    const sticky = stickyMessages.get(message.channel.id);
    if (!sticky) return;

    try {
     
      const prevSticky = await message.channel.messages.fetch(sticky.messageId).catch(() => null);
      if (prevSticky) await prevSticky.delete().catch(() => {});
    } catch (err) {
      console.warn(`[Sticky] Failed to delete old sticky message:`, err.message);
    }

    try {
   
      const newSticky = await message.channel.send(sticky.message);
      stickyMessages.set(message.channel.id, {
        message: sticky.message,
        messageId: newSticky.id
      });
    } catch (err) {
      console.error(`[Sticky] Failed to send new sticky message:`, err.message);
    }
  }
};
