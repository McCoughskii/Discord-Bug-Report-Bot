const { error, time } = require("console");
const Discord = require("discord.js");
const client = new Discord.Client();
const config = require("./config.json");
const questions = config.questions;
const answerPrefix = config.answers;
const fs = require("fs");
const { default: Collection } = require("@discordjs/collection");

var reportEmbed = new Discord.MessageEmbed()
  .setColor(8311585)
  .setTitle("Bug Report");

console.log("Listing Questions:");
questions.forEach(i => {
  console.log(i);
});

var channelID = loadData().toString();
console.log(channelID);
function loadData() {
  return fs.readFileSync("./data.txt", "utf8", (err, fileData) => {
    if (err) return console.error(err);
    console.log(fileData);
    channelID = fileData;
  });
}

const clean = text => {
  if (typeof text === "string")
    return text
      .replace(/`/g, "`" + String.fromCharCode(8203))
      .replace(/@/g, "@" + String.fromCharCode(8203));
  else return text;
};

/* Decided to not use reactions to start report process.
const filter = (reaction, messageID) => {
    return reaction.emoji.name === '🐛' //&& messageID === reaction.message.id;
}
*/

function setup(channel) {
  channelID = channel.id;
  channel
    .send(
      `To report a bug please DM <@${client.user.id}> !reportbug to report a bug.`
    )
    .then(message => {
      //message.react("🐛");
      message.pin({ reason: "Bug Report Setup" });
      fs.writeFile("data.txt", channelID, err => {
        if (err) {
          message.channel.send(
            "Could not complete Setup, please contact <@114091125479833609> to fix this issue."
          );
          throw err;
        }
        console.log("Data.txt file has been saved");
        startup(client);
      });
    });
}

let mainGuild;
let bugChannel;

function startup(client) {
  mainGuild = client.guilds.cache.get(config.guild);
  bugChannel = mainGuild.channels.cache.get(channelID);
}

client.on("ready", () => {
  console.log(
    `\nLogged in as ${client.user.tag}!\nBot Started At: ${client.readyAt}`
  );
  client.user
    .setActivity("for bugs!", { type: "WATCHING" })
    .then(presence =>
      console.log(
        `Activity set to ${presence.game ? presence.game.name : "none"}`
      )
    )
    .catch(console.error);

  console.log(channelID.toString());
  //client.channels.cache.get(channelID).send('Hello here!');

  startup(client);
});

client.on("message", async message => {
  // if author is a bot dont respond
  if (message.author.bot) return;

  // We also stop processing if the message does not start with our prefix.
  if (message.content.indexOf(config.prefix) !== 0) return;

  //Then we use the config prefix to get our arguments and command:
  const args = message.content.split(/\s+/g);
  const command = args
    .shift()
    .slice(config.prefix.length)
    .toLowerCase();

  // eval command (runs code by message, restricted to serabus only)
  if (message.content.startsWith(config.prefix + "eval")) {
    if (message.author.id !== config.ownerID) return;
    try {
      const code = args.join(" ");
      let evaled = eval(code);

      if (typeof evaled !== "string") evaled = require("util").inspect(evaled);

      message.channel.send(clean(evaled), { code: "xl" });
    } catch (err) {
      message.channel.send(`\`ERROR\` \`\`\`xl\n${clean(err)}\n\`\`\``);
    }
  }

  // command used to setup the bot.
  if (command === "setup") {
    if (message.author.id !== config.ownerID) return;
    message.channel.send("Starting Setup...");
    let guild = message.guild;
    guild.channels
      .create(config.bugChannel, {
        reason: "Channel during Bug Report Setup",
        type: "text",
        topic: "Report bugs"
      })
      .then(channel => {
        setup(channel);
        message.channel.send("Setup complete!");
      })
      .catch(console.error, err => {
        message.channel.send(err);
      });
  }

  // command used to actually report a bug
  if (command === "reportbug") {
    if (message.channel.type != "dm") {
      return message.channel
        .send(
          "Bug reports can only be created via DMs, please send me a DM with the text !reportbug"
        )
        .then(m => {
          m.delete({ timeout: 5000 });
        });
    }
    if (channelID === undefined) {
      return message.channel.send(
        "The bot has not been properly setup, please DM <@580393392673128459> and notify them know of this issue."
      );
    }
    bugChannel = mainGuild.channels.cache.get(channelID);
    askQuestions(message);
  }

  if (command === "fixed") {
    message.delete();
    // check if user is a developer or executive
    if (
      !message.member.roles.cache.has("config.allowedRole1") &&
      !message.member.roles.cache.has("config.allowedRole2")
    ) {
      return message.channel
        .send("You do not have access to this command")
        .then(m => {
          m.delete({ timeout: 5000 });
        });
    }

    let msg = message.channel.messages.fetch(args[0]);

    if (msg === undefined || null) {
      return message.channel
        .send(
          "Could not find that bug report, make sure to provide a valid bug report ID."
        )
        .then(m => m.delete({ timeout: 5000 }));
    }

    if ((await msg).embeds == undefined || null) {
      return message.channel
        .send("That message does not appear to be a bug report")
        .then(m => m.delete({ timeout: 5000 }));
    }

    let oldEmbed = (await msg).embeds[0];
    if (oldEmbed === undefined) {
      return message.channel
        .send("That message does not appear to be a bug report")
        .then(m => m.delete({ timeout: 5000 }));
    }

    let reason;

    for (let i = 1; i < args.length; i++) {
      reason = args[i] + " ";
    }

    if (reason == undefined) {
      reason = "No reason given";
    }

    let newEmbed = new Discord.MessageEmbed(oldEmbed)
      .setTitle("Bug Report - Fixed")
      .setColor("BLUE");
    newEmbed.fields = [{ name: "Reason", value: reason }];

    (await msg).edit(newEmbed);
  }

  if (command === "deny") {
    message.delete();
    // check if user is a developer or exec
    if (
      !message.member.roles.cache.has("config.allowedRole1") &&
      !message.member.roles.cache.has("config.allowedRole2")
    ) {
      return message.channel
        .send("You do not have access to this command")
        .then(m => {
          m.delete({ timeout: 5000 });
        });
    }

    let msg = message.channel.messages.fetch(args[0]);

    if (msg === undefined || null) {
      return message.channel
        .send(
          "Could not find that bug report, make sure to provide a valid bug report ID. (Hint: It's just the message ID)"
        )
        .then(m => m.delete({ timeout: 5000 }));
    }
    try {
      if ((await msg).embeds == undefined || null) {
        return message.channel
          .send("That message does not appear to be a bug report")
          .then(m => m.delete({ timeout: 5000 }));
      }
    } catch(error) {
      console.log(error);
      message.channel.send("An error has occured");
    }

    let oldEmbed = (await msg).embeds[0];
    if (oldEmbed === undefined) {
      return message.channel
        .send("That message does not appear to be a bug report")
        .then(m => m.delete({ timeout: 5000 }));
    }

    let reason = "";

    for (let i = 1; i < args.length; i++) {
      reason += args[i] + " ";
      console.log(args[i]);
    }

    if (reason == undefined) {
      reason = "No reason given";
    }

    let newEmbed = new Discord.MessageEmbed(oldEmbed)
      .setTitle("Bug Report - Denied")
      .setColor("RED");
    newEmbed.fields = [{ name: "Reason", value: reason }];

    (await msg).edit(newEmbed);
  }
});

async function askQuestions(message) {
  let answers = [];

  await message.channel.send(questions[0]);
  await message.channel
    .awaitMessages(m => message.author.id == m.author.id, {
      max: 1,
      time: 60000,
      errors: ["time"]
    })
    .then(collected => {
      answers.push(collected.first().content);
      return question2(message, answers);
    })
    .catch(err => {
      message.channel.send("You did not answer the prompt in time, sorry.");
      console.log(err);
      return message.channel.send(err);
    });
}

async function question2(message, answers) {
  await message.channel.send(questions[1]);
  await message.channel
    .awaitMessages(m => message.author.id == m.author.id, {
      max: 1,
      time: 60000,
      errors: ["time"]
    })
    .then(collected => {
      answers.push(collected.first().content);
      return question3(message, answers);
    })
    .catch(() => {
      return message.channel.send(
        "You did not answer the prompt in time, sorry."
      );
    });
}

async function question3(message, answers) {
  await message.channel.send(questions[2]);
  await message.channel
    .awaitMessages(m => message.author.id == m.author.id, {
      max: 1,
      time: 60000,
      errors: ["time"]
    })
    .then(collected => {
      answers.push(collected.first().content);
      return question4(message, answers);
    })
    .catch(() => {
      return message.channel.send(
        "You did not answer the prompt in time, sorry."
      );
    });
}

async function question4(message, answers) {
  await message.channel.send(questions[3]);
  await message.channel
    .awaitMessages(m => message.author.id == m.author.id, {
      max: 1,
      time: 60000,
      errors: ["time"]
    })
    .then(collected => {
      answers.push(collected.first().content);
      return question5(message, answers);
    })
    .catch(() => {
      return message.channel.send(
        "You did not answer the prompt in time, sorry."
      );
    });
}

async function question5(message, answers) {
  await message.channel.send(questions[4]);
  await message.channel
    .awaitMessages(m => message.author.id == m.author.id, {
      max: 1,
      time: 60000,
      errors: ["time"]
    })
    .then(async collected => {
      answers.push(collected.first().content);
      console.log(answers);
      message.channel.send("Thank you for submitting a bug report!");

      let textChannel = client.channels.cache.get(channelID);
      reportEmbed
        .setDescription(
          `${answerPrefix[0]}${answers[0]}\n
          ${answerPrefix[1]}${answers[1]}\n
          ${answerPrefix[2]}${answers[2]}\n
          ${answerPrefix[3]}${answers[3]}\n
          ${answerPrefix[4]}${answers[4]}`
        )
        .setTimestamp()
        .setColor(8311585)
        .setTitle("Bug Report")
        .setAuthor(message.author.tag, message.author.avatarURL()).fields = [];

      await textChannel.send(reportEmbed).then(m => {
        reportEmbed.setFooter(`Bug Report ID: ${m.id}`);
        m.edit(reportEmbed);
      });
    })
    .catch(err => {
      return message.channel.send(
        "You did not answer the prompt in time, sorry."
      );
    });
}

client.login(process.env.TOKEN);
