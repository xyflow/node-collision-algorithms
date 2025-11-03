const handEmojis = ['🤚'];

export function getRandomEmoji() {
	return handEmojis[Math.floor(Math.random() * handEmojis.length)];
}
