require('dotenv').config();

const { Client, Intents } = require('discord.js');
let intents = new Intents();
intents.add(Intents.FLAGS.GUILDS);
intents.add(Intents.FLAGS.GUILD_MESSAGES);
const client = new Client({ intents: intents });

const fs = require('fs');

const { JSDOM } = require('jsdom');

const command = '!homestuck';
const max_len = 2000 - 8;
const max_allowed_lines = 500;

const homestuck_text = fs.readFileSync('homestuck.txt', 'utf-8');

const madfunnyid = "671165585513644042";
const hussiebotid = "HussieBot#3223";

const pages_in_homestuck = 8130;

const lines = homestuck_text.split('\n');

function handle(message) {

	var messages = [];

	const params = message.content.match(/ [0-9]+/);
	var param = -1;
	if(params && params.length > 0) {
		param = parseInt(params[0]);
	}

	const page_check = message.content.match(/ page/);
	if(page_check && page_check.length > 0) {
		var number = param;
		if(number > pages_in_homestuck) {
			number = pages_in_homestuck;
		} else if(number <= 0) {
			number = Math.floor(Math.random() * pages_in_homestuck) + 1;
		}

		const url = 'http://homestuck.com/story/' + number;

		JSDOM.fromURL(url).then(dom => {
			let title = parse_title(dom, number);
			if(title) {
				message.channel.send(title);
			}
			let imageurls = parse_image_urls(dom);
			let videourls = parse_video(dom);
			let messages = parse_text(dom);
			sendSequential(message.channel, imageurls, videourls, messages);
		});
	} else {
		var messages = rand_slice(param);
		sendmessages(messages, message.channel);
	}
}

function sendSequential(channel, images, videos, text) {
	if(images.length > 0) {
		channel.send({ files: [ images[0] ] }).then(m => {
			sendSequential(channel, images.slice(1), videos, text);
		});
	} else if(videos.length > 0) {
		channel.send({ files: [ videos[0] ] }).then(m => {
			sendSequential(channel, [], videos.slice(1), text);
		});
	} else if(text.length > 0) {
		channel.send(text[0]).then(m => {
			sendSequential(channel, [], [], text.slice(1));
		});
	}
}

function sendmessages(messages, channel) {
	for(var i = 0; i < messages.length; i++) {
		channel.send(messages[i]);
	}
}

/*
#content_container h2: title
#content_container img: image

p.o-chat_log: pesterlog
p.o-story_text: text

https://www.homestuck.com/story/5263
*/
function parse_image_urls(dom) {
	let imageNodes = dom.window.document.querySelectorAll('#content_container img');
	let imageNodesArray = Array.from(imageNodes);
	return imageNodesArray.map(node => node.src);
}

function parse_video(dom) {
	return [];
}

function parse_title(dom, number) {
	let titleNode = dom.window.document.querySelector('#content_container h2');
	if(titleNode) {
		return "**" + titleNode.textContent + " (" + number + ")**";
	}
	return "**(" + number + ")**";
}

function parse_text(dom) {
	let story_text_node = dom.window.document.querySelector("p.o-story_text");
	let pesterlog_node = dom.window.document.querySelector("p.o_chat-log");
	var content = '';
	if(story_text_node) {
		content += story_text_node.textContent;
		if(pesterlog_node) {
			content += '\n';
		}
	}
	if(pesterlog_node) {
		content += pesterlog_node.textContent;
	}
	return generate_messages(content);
	//return generate_messages(dom.window.document.querySelector('body').textContent);
}

function rand_slice(num_lines) {
	num_lines = Math.max(Math.min(num_lines, max_allowed_lines), 1);

	const randIndex = Math.floor(Math.random() * (lines.length + 1 - num_lines));

	var output = '';
	for(var i = randIndex; i < randIndex + num_lines; i++) {
		output += lines[i];
		output += '\n';
	}

	var messages = generate_messages(output);

	return messages;
}

function generate_messages(text) {
	if(text === '') {
		return [];
	}
	if(text.length < max_len) {
		return ['\`\`\`\n' + text + '\n\`\`\`'];
	}

	const lines = text.split('\n');
	var messages = [];
	var cur_msg = '';
	for(var i = 0; i < lines.length; i++) {
		if(lines[i].length >= max_len) {
			messages.push('\`\`\`\n' + cur_msg + '\n\`\`\`');
			cur_msg = '';
			const words = lines[i].split(' ');
			for(var k = 0; k < words.length; k++) {
				if(words[k].length > max_len) {
					//bad word! naughty word.
					continue;
				}
				if(cur_msg.length + words[k].length >= max_len) {
					messages.push('\`\`\`\n' + cur_msg + '\n\`\`\`');
					cur_msg = '';
				}
				cur_msg += words[k];
			}
			messages.push('\`\`\`\n' + cur_msg + '\n\`\`\`');
			cur_msg = '';
		} else {
			//TODO: finish this
			if(cur_msg.length + lines[i].length >= max_len) {
				messages.push('\`\`\`\n' + cur_msg + '\n\`\`\`');
				cur_msg = '';
			}
			cur_msg += lines[i];
			cur_msg += '\n';
		}
	}

	return messages;
}

function userInMentions(user, message) {
	return message.mentions.users.some(
		u => u === user
	);
}

client.on('messageCreate', (message) => {
	message.channel

	if(message.author === client.user) {
	    return;
	}

	if(message.author.tag == hussiebotid) {
		//console.dir(message.guild.emojis);
		//console.dir(message.guild.emojis[madfunnyid]);
		message.react(message.guild.emojis.get(madfunnyid));
	}

	if(userInMentions(client.user, message)) {
	    //send message
			handle(message);
	}
});

console.log(lines.length);

const bot_token = process.env.TOKEN;

client.login(bot_token);
