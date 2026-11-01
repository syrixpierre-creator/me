// Multi-language support for INCONNU XD V2.
//
// Language is resolved per message:
//   1. the sender's own choice (".lang fr" sent by a non-owner)
//   2. the account-wide choice (".lang fr" sent by the owner)
//   3. English (default)
//
// Strings for the newer features (chatbot, play, games, menu header, .lang)
// are fully translated. Older commands are still written in English, so
// bot.js additionally runs every outgoing message through translateCommon(),
// which swaps a small set of very common fixed phrases ("Usage:", "Owner only
// command.", ...) for the chosen language.

const { getGlobalSetting, setGlobalSetting } = require('./store');

const DEFAULT_LANG = 'en';

const LANGUAGES = {
  en: { name: 'English', flag: '🇬🇧', aliases: ['en', 'eng', 'english', 'anglais', 'ingles', 'inglés', 'inglês', 'angle', 'englisch'] },
  fr: { name: 'Français', flag: '🇫🇷', aliases: ['fr', 'fra', 'french', 'francais', 'français', 'franse', 'frances', 'francés', 'francês', 'französisch'] },
  ht: { name: 'Kreyòl Ayisyen', flag: '🇭🇹', aliases: ['ht', 'kreyol', 'kreyòl', 'creole', 'créole', 'haitian', 'ayisyen', 'kreyol ayisyen'] },
  es: { name: 'Español', flag: '🇪🇸', aliases: ['es', 'spa', 'spanish', 'espanol', 'español', 'espagnol', 'espanyol', 'panyol', 'spanisch'] },
  pt: { name: 'Português', flag: '🇧🇷', aliases: ['pt', 'por', 'portuguese', 'portugues', 'português', 'portugais', 'portugès', 'portugiesisch'] },
  ar: { name: 'العربية', flag: '🇸🇦', aliases: ['ar', 'ara', 'arabic', 'arabe', 'العربية', 'عربي', 'arab', 'árabe', 'arabisch'] },
  de: { name: 'Deutsch', flag: '🇩🇪', aliases: ['de', 'deu', 'ger', 'german', 'deutsch', 'allemand', 'aleman', 'alemán', 'alemão', 'alman'] },
};

function normalizeLang(input) {
  const v = String(input || '').trim().toLowerCase();
  if (!v) return null;
  for (const [code, info] of Object.entries(LANGUAGES)) {
    if (info.aliases.includes(v)) return code;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Dictionary. {name} placeholders are filled by t(). English is the
// reference; any key missing in another language falls back to English.
// ---------------------------------------------------------------------------
const STRINGS = {
  en: {
    'lang.current': '🌐 *Language*\n\nCurrent: {flag} *{name}*\n\n*Available:*\n{list}\n\nUsage: {p}lang fr\n{scopeNote}',
    'lang.scopeOwner': '👑 As the owner, your choice becomes the default for everyone on this bot.',
    'lang.scopeUser': '👤 Your choice only applies to you.',
    'lang.invalid': '❌ Unknown language "{input}".\nAvailable: {codes}',
    'lang.setSession': '✅ Bot language set to {flag} *{name}* for everyone.',
    'lang.setUser': '✅ Your language is now {flag} *{name}*.',
    'lang.reset': '✅ Your personal language was removed — you now follow the bot default.',

    'menu.user': 'User', 'menu.runtime': 'Runtime', 'menu.time': 'Time', 'menu.ram': 'RAM',
    'menu.prefix': 'Prefix', 'menu.commands': 'Commands', 'menu.mode': 'Mode',
    'menu.group': 'Group', 'menu.private': 'Private', 'menu.lang': 'Language',

    'common.ownerOnly': '❌ Owner only command.',
    'common.groupOnly': '❌ This command only works in groups.',
    'common.error': '⚠️ Error: {msg}',

    'chatbot.help': '🤖 *AI Chatbot* — status: *{status}*\n\n{p}chatbot on — turn it on\n{p}chatbot off — turn it off\n{p}chatbot status — show settings\n{p}chatbot model <id> — change the model\n{p}chatbot key <api-key> — set your xKiro key\n{p}chatbot reset — clear conversation memory\n\n*How it works:*\n• DM: replies to everyone who writes to you\n• Group: replies only when someone tags you, mentions you or replies to your message (anti-spam)',
    'chatbot.on': '✅ Chatbot *ON*.\n• DMs: I answer everyone.\n• Groups: only when you are tagged, mentioned or replied to.',
    'chatbot.off': '📴 Chatbot *OFF*.',
    'chatbot.status': '🤖 *Chatbot status*\n\nState: *{status}*\nModel: {model}\nAPI key: {key}',
    'chatbot.enabled': 'ON', 'chatbot.disabled': 'OFF',
    'chatbot.keyOk': 'configured ✅', 'chatbot.keyMissing': 'missing ❌ (set XKIRO_API_KEY or use {p}chatbot key <key>)',
    'chatbot.keySet': '🔑 xKiro API key saved. Delete your message containing the key for safety.',
    'chatbot.keyGroup': '⚠️ Never send your API key in a group. Send it in your own DM ("Message yourself").',
    'chatbot.modelSet': '✅ Chatbot model set to *{model}*.',
    'chatbot.reset': '🧹 Chatbot memory cleared.',
    'chatbot.noKeyOn': '⚠️ Chatbot is ON but no xKiro API key is set. Use {p}chatbot key <key> or set XKIRO_API_KEY.',

    'play.usage': '🎵 Usage: {p}play <song name or YouTube link>\nExample: {p}play Wendyyy Picasso',
    'play.searching': '🔍 Searching for: {query}',
    'play.noResults': '❌ No results found.',
    'play.choose': '🎵 *{title}*\n\n👤 Channel: {author}\n⏱️ Duration: {duration}\n👁️ Views: {views}\n🔗 {url}\n\n*Reply to this message with:*\n1️⃣ 🎧 Audio (MP3)\n2️⃣ 🎬 Video (MP4)\n\n⏳ Expires in 5 minutes.',
    'play.dlAudio': '🎧 Downloading audio... please wait.',
    'play.dlVideo': '🎬 Downloading video... please wait.',
    'play.failed': '❌ Download failed on every source. Try again in a moment or try another song.',
    'play.tooLarge': '❌ File too large to send on WhatsApp ({size} MB).',
    'play.expired': '⌛ This choice expired. Run {p}play again.',
    'play.invalidChoice': '❓ Reply *1* for audio or *2* for video.',

    'ttt.usage': '❌⭕ *Tic-Tac-Toe*\n\n{p}ttt — play against the bot\n{p}ttt @user — challenge someone\n{p}ttt end — stop the current game\n\nPlay by sending a number from 1 to 9.',
    'ttt.started': '🎮 *Tic-Tac-Toe*\n\n❌ {x}\n⭕ {o}\n\n{board}\n\n👉 Turn: {turn} — send a number 1-9.',
    'ttt.turn': '{board}\n\n👉 Turn: {turn} — send a number 1-9.',
    'ttt.win': '{board}\n\n🏆 {winner} wins!',
    'ttt.draw': '{board}\n\n🤝 Draw!',
    'ttt.taken': '❌ That cell is already taken.',
    'ttt.notTurn': '⏳ Not your turn.',
    'ttt.already': '⚠️ A game is already running in this chat. Use {p}ttt end to stop it.',
    'ttt.ended': '🛑 Game stopped.',
    'ttt.none': 'ℹ️ No game running here.',
    'ttt.bot': 'Bot 🤖',
    'ttt.self': '❌ You can\'t play against yourself.',

    'hangman.start': '🪢 *Hangman*\n\n{word}\n\n❤️ Lives: {lives}\nSend one letter to guess. ({p}hangman end to stop)',
    'hangman.state': '{art}\n{word}\n\n❤️ Lives: {lives}\n🔤 Tried: {tried}',
    'hangman.win': '🎉 You found it: *{word}*!',
    'hangman.lose': '{art}\n💀 Game over! The word was *{word}*.',
    'hangman.already': '⚠️ Letter "{letter}" was already tried.',

    'rps.usage': '✊✋✌️ Usage: {p}rps rock | paper | scissors',
    'rps.result': 'You: {you}\nBot: {bot}\n\n{verdict}',
    'rps.win': '🏆 You win!', 'rps.lose': '😈 Bot wins!', 'rps.draw': '🤝 Draw!',
    'rps.rock': 'rock ✊', 'rps.paper': 'paper ✋', 'rps.scissors': 'scissors ✌️',

    'guess.start': '🔢 *Guess the number*\nI picked a number between 1 and 100. You have {tries} tries — send a number!',
    'guess.higher': '⬆️ Higher! ({left} tries left)',
    'guess.lower': '⬇️ Lower! ({left} tries left)',
    'guess.win': '🎉 Correct! It was *{n}* — found in {used} tries.',
    'guess.lose': '💀 Out of tries! It was *{n}*.',

    'math.question': '🧮 *Math quiz* ({level})\n\n{q} = ?\n\n⏳ {sec}s — send your answer!',
    'math.correct': '✅ Correct, {name}! {q} = *{a}*',
    'math.wrong': '❌ Wrong answer, try again!',
    'math.timeout': '⌛ Time\'s up! {q} = *{a}*',

    'slot.result': '🎰 *SLOT MACHINE*\n\n┃ {r} ┃\n\n{verdict}',
    'slot.jackpot': '💰 JACKPOT! Three of a kind!', 'slot.pair': '✨ Nice, a pair!', 'slot.lose': '😢 No luck this time.',

    '8ball.usage': '🎱 Usage: {p}8ball <question>',
    '8ball.answers': 'It is certain.|Without a doubt.|Yes, definitely.|Most likely.|Signs point to yes.|Ask again later.|Cannot predict now.|Don\'t count on it.|My sources say no.|Very doubtful.',

    'ship.usage': '💘 Usage: {p}ship @user1 @user2 (or reply to someone)',
    'ship.result': '💘 *Love meter*\n\n{a} ❤️ {b}\n\n{bar} {pct}%\n\n{verdict}',
    'ship.v0': 'Just friends... 😅', 'ship.v1': 'There\'s something there 👀', 'ship.v2': 'Great match! 💞', 'ship.v3': 'Soulmates! 💍',

    'poll.usage': '📊 Usage: {p}poll Question | option 1 | option 2 | ...\n(2 to 12 options)',

    'remind.usage': '⏰ Usage: {p}remind <time> <message>\nTime: 30s, 10m, 2h (max 24h)\nExample: {p}remind 10m drink water',
    'remind.set': '⏰ OK! I\'ll remind you in {time}.',
    'remind.fire': '⏰ *Reminder* for @{user}:\n\n{text}',

    'afk.set': '💤 AFK mode ON{reason}. I\'ll tell people who tag you or DM you.',
    'afk.back': '👋 Welcome back! You were AFK for {time}.',
    'afk.notice': '💤 The owner is AFK{reason} (since {time}). They will reply later.',

    'genpass.result': '🔐 *Generated password* ({len} chars):\n\n{pass}',
    'genpass.usage': '🔐 Usage: {p}genpass [length 8-64]',
  },

  fr: {
    'lang.current': '🌐 *Langue*\n\nActuelle : {flag} *{name}*\n\n*Disponibles :*\n{list}\n\nUtilisation : {p}lang fr\n{scopeNote}',
    'lang.scopeOwner': '👑 En tant que propriétaire, ton choix devient la langue par défaut du bot pour tout le monde.',
    'lang.scopeUser': '👤 Ton choix ne s\'applique qu\'à toi.',
    'lang.invalid': '❌ Langue inconnue « {input} ».\nDisponibles : {codes}',
    'lang.setSession': '✅ Langue du bot réglée sur {flag} *{name}* pour tout le monde.',
    'lang.setUser': '✅ Ta langue est maintenant {flag} *{name}*.',
    'lang.reset': '✅ Ta langue personnelle a été supprimée — tu suis maintenant la langue du bot.',

    'menu.user': 'Utilisateur', 'menu.runtime': 'Actif depuis', 'menu.time': 'Heure', 'menu.ram': 'RAM',
    'menu.prefix': 'Préfixe', 'menu.commands': 'Commandes', 'menu.mode': 'Mode',
    'menu.group': 'Groupe', 'menu.private': 'Privé', 'menu.lang': 'Langue',

    'common.ownerOnly': '❌ Commande réservée au propriétaire.',
    'common.groupOnly': '❌ Cette commande fonctionne seulement dans les groupes.',
    'common.error': '⚠️ Erreur : {msg}',

    'chatbot.help': '🤖 *Chatbot IA* — état : *{status}*\n\n{p}chatbot on — activer\n{p}chatbot off — désactiver\n{p}chatbot status — voir les réglages\n{p}chatbot model <id> — changer de modèle\n{p}chatbot key <clé-api> — enregistrer ta clé xKiro\n{p}chatbot reset — effacer la mémoire\n\n*Fonctionnement :*\n• Privé : répond à tous ceux qui t\'écrivent\n• Groupe : répond seulement quand on te tag, te mentionne ou répond à ton message (anti-spam)',
    'chatbot.on': '✅ Chatbot *ACTIVÉ*.\n• Privé : je réponds à tout le monde.\n• Groupes : seulement quand tu es tag, mentionné ou qu\'on te répond.',
    'chatbot.off': '📴 Chatbot *DÉSACTIVÉ*.',
    'chatbot.status': '🤖 *État du chatbot*\n\nÉtat : *{status}*\nModèle : {model}\nClé API : {key}',
    'chatbot.enabled': 'ACTIVÉ', 'chatbot.disabled': 'DÉSACTIVÉ',
    'chatbot.keyOk': 'configurée ✅', 'chatbot.keyMissing': 'absente ❌ (définis XKIRO_API_KEY ou utilise {p}chatbot key <clé>)',
    'chatbot.keySet': '🔑 Clé API xKiro enregistrée. Supprime ton message contenant la clé par sécurité.',
    'chatbot.keyGroup': '⚠️ N\'envoie jamais ta clé API dans un groupe. Envoie-la dans ton propre chat (« Envoyez-vous un message »).',
    'chatbot.modelSet': '✅ Modèle du chatbot : *{model}*.',
    'chatbot.reset': '🧹 Mémoire du chatbot effacée.',
    'chatbot.noKeyOn': '⚠️ Le chatbot est activé mais aucune clé xKiro n\'est définie. Utilise {p}chatbot key <clé> ou XKIRO_API_KEY.',

    'play.usage': '🎵 Utilisation : {p}play <titre ou lien YouTube>\nExemple : {p}play Wendyyy Picasso',
    'play.searching': '🔍 Recherche : {query}',
    'play.noResults': '❌ Aucun résultat trouvé.',
    'play.choose': '🎵 *{title}*\n\n👤 Chaîne : {author}\n⏱️ Durée : {duration}\n👁️ Vues : {views}\n🔗 {url}\n\n*Réponds à ce message avec :*\n1️⃣ 🎧 Audio (MP3)\n2️⃣ 🎬 Vidéo (MP4)\n\n⏳ Expire dans 5 minutes.',
    'play.dlAudio': '🎧 Téléchargement de l\'audio... patiente.',
    'play.dlVideo': '🎬 Téléchargement de la vidéo... patiente.',
    'play.failed': '❌ Le téléchargement a échoué sur toutes les sources. Réessaie dans un instant ou essaie un autre son.',
    'play.tooLarge': '❌ Fichier trop lourd pour WhatsApp ({size} Mo).',
    'play.expired': '⌛ Ce choix a expiré. Relance {p}play.',
    'play.invalidChoice': '❓ Réponds *1* pour l\'audio ou *2* pour la vidéo.',

    'ttt.usage': '❌⭕ *Morpion (Tic-Tac-Toe)*\n\n{p}ttt — jouer contre le bot\n{p}ttt @user — défier quelqu\'un\n{p}ttt end — arrêter la partie\n\nJoue en envoyant un chiffre de 1 à 9.',
    'ttt.started': '🎮 *Morpion*\n\n❌ {x}\n⭕ {o}\n\n{board}\n\n👉 Tour : {turn} — envoie un chiffre 1-9.',
    'ttt.turn': '{board}\n\n👉 Tour : {turn} — envoie un chiffre 1-9.',
    'ttt.win': '{board}\n\n🏆 {winner} gagne !',
    'ttt.draw': '{board}\n\n🤝 Match nul !',
    'ttt.taken': '❌ Cette case est déjà prise.',
    'ttt.notTurn': '⏳ Ce n\'est pas ton tour.',
    'ttt.already': '⚠️ Une partie est déjà en cours ici. Utilise {p}ttt end pour l\'arrêter.',
    'ttt.ended': '🛑 Partie arrêtée.',
    'ttt.none': 'ℹ️ Aucune partie en cours ici.',
    'ttt.bot': 'Bot 🤖',
    'ttt.self': '❌ Tu ne peux pas jouer contre toi-même.',

    'hangman.start': '🪢 *Pendu*\n\n{word}\n\n❤️ Vies : {lives}\nEnvoie une lettre. ({p}hangman end pour arrêter)',
    'hangman.state': '{art}\n{word}\n\n❤️ Vies : {lives}\n🔤 Essayées : {tried}',
    'hangman.win': '🎉 Trouvé : *{word}* !',
    'hangman.lose': '{art}\n💀 Perdu ! Le mot était *{word}*.',
    'hangman.already': '⚠️ La lettre « {letter} » a déjà été essayée.',

    'rps.usage': '✊✋✌️ Utilisation : {p}rps pierre | papier | ciseaux',
    'rps.result': 'Toi : {you}\nBot : {bot}\n\n{verdict}',
    'rps.win': '🏆 Tu gagnes !', 'rps.lose': '😈 Le bot gagne !', 'rps.draw': '🤝 Égalité !',
    'rps.rock': 'pierre ✊', 'rps.paper': 'papier ✋', 'rps.scissors': 'ciseaux ✌️',

    'guess.start': '🔢 *Devine le nombre*\nJ\'ai choisi un nombre entre 1 et 100. Tu as {tries} essais — envoie un nombre !',
    'guess.higher': '⬆️ Plus grand ! ({left} essais restants)',
    'guess.lower': '⬇️ Plus petit ! ({left} essais restants)',
    'guess.win': '🎉 Bravo ! C\'était *{n}* — trouvé en {used} essais.',
    'guess.lose': '💀 Plus d\'essais ! C\'était *{n}*.',

    'math.question': '🧮 *Quiz de maths* ({level})\n\n{q} = ?\n\n⏳ {sec}s — envoie ta réponse !',
    'math.correct': '✅ Correct, {name} ! {q} = *{a}*',
    'math.wrong': '❌ Mauvaise réponse, réessaie !',
    'math.timeout': '⌛ Temps écoulé ! {q} = *{a}*',

    'slot.result': '🎰 *MACHINE À SOUS*\n\n┃ {r} ┃\n\n{verdict}',
    'slot.jackpot': '💰 JACKPOT ! Trois identiques !', 'slot.pair': '✨ Pas mal, une paire !', 'slot.lose': '😢 Pas de chance cette fois.',

    '8ball.usage': '🎱 Utilisation : {p}8ball <question>',
    '8ball.answers': 'C\'est certain.|Sans aucun doute.|Oui, absolument.|Très probablement.|Les signes disent oui.|Redemande plus tard.|Impossible de prédire maintenant.|N\'y compte pas.|Mes sources disent non.|Très peu probable.',

    'ship.usage': '💘 Utilisation : {p}ship @user1 @user2 (ou réponds à quelqu\'un)',
    'ship.result': '💘 *Compatibilité amoureuse*\n\n{a} ❤️ {b}\n\n{bar} {pct}%\n\n{verdict}',
    'ship.v0': 'Juste amis... 😅', 'ship.v1': 'Il y a quelque chose 👀', 'ship.v2': 'Super couple ! 💞', 'ship.v3': 'Âmes sœurs ! 💍',

    'poll.usage': '📊 Utilisation : {p}poll Question | option 1 | option 2 | ...\n(2 à 12 options)',

    'remind.usage': '⏰ Utilisation : {p}remind <durée> <message>\nDurée : 30s, 10m, 2h (max 24h)\nExemple : {p}remind 10m boire de l\'eau',
    'remind.set': '⏰ OK ! Je te le rappelle dans {time}.',
    'remind.fire': '⏰ *Rappel* pour @{user} :\n\n{text}',

    'afk.set': '💤 Mode AFK activé{reason}. Je préviendrai ceux qui te tag ou t\'écrivent.',
    'afk.back': '👋 Bon retour ! Tu étais AFK depuis {time}.',
    'afk.notice': '💤 Le propriétaire est AFK{reason} (depuis {time}). Il répondra plus tard.',

    'genpass.result': '🔐 *Mot de passe généré* ({len} caractères) :\n\n{pass}',
    'genpass.usage': '🔐 Utilisation : {p}genpass [longueur 8-64]',
  },

  ht: {
    'lang.current': '🌐 *Lang*\n\nKounye a : {flag} *{name}*\n\n*Disponib :*\n{list}\n\nItilizasyon : {p}lang ht\n{scopeNote}',
    'lang.scopeOwner': '👑 Kòm mèt bot la, chwa ou vin lang pa defo pou tout moun.',
    'lang.scopeUser': '👤 Chwa ou a se pou ou sèlman.',
    'lang.invalid': '❌ Lang « {input} » pa egziste.\nDisponib : {codes}',
    'lang.setSession': '✅ Lang bot la se {flag} *{name}* kounye a pou tout moun.',
    'lang.setUser': '✅ Lang ou se {flag} *{name}* kounye a.',
    'lang.reset': '✅ Lang pèsonèl ou retire — w ap swiv lang bot la.',

    'menu.user': 'Itilizatè', 'menu.runtime': 'Tan aktif', 'menu.time': 'Lè', 'menu.ram': 'RAM',
    'menu.prefix': 'Prefiks', 'menu.commands': 'Kòmand', 'menu.mode': 'Mòd',
    'menu.group': 'Gwoup', 'menu.private': 'Prive', 'menu.lang': 'Lang',

    'common.ownerOnly': '❌ Kòmand sa a se pou mèt bot la sèlman.',
    'common.groupOnly': '❌ Kòmand sa a mache nan gwoup sèlman.',
    'common.error': '⚠️ Erè : {msg}',

    'chatbot.help': '🤖 *Chatbot IA* — eta : *{status}*\n\n{p}chatbot on — limen\n{p}chatbot off — etenn\n{p}chatbot status — wè paramèt yo\n{p}chatbot model <id> — chanje modèl\n{p}chatbot key <kle-api> — mete kle xKiro ou\n{p}chatbot reset — efase memwa\n\n*Kijan li mache :*\n• Prive : li reponn tout moun ki ekri w\n• Gwoup : li reponn sèlman lè yo tag ou, mansyone w oswa reponn mesaj ou (anti-spam)',
    'chatbot.on': '✅ Chatbot *LIMEN*.\n• Prive : m ap reponn tout moun.\n• Gwoup : sèlman lè yo tag ou, mansyone w oswa reponn ou.',
    'chatbot.off': '📴 Chatbot *ETENN*.',
    'chatbot.status': '🤖 *Eta chatbot la*\n\nEta : *{status}*\nModèl : {model}\nKle API : {key}',
    'chatbot.enabled': 'LIMEN', 'chatbot.disabled': 'ETENN',
    'chatbot.keyOk': 'konfigire ✅', 'chatbot.keyMissing': 'pa genyen ❌ (mete XKIRO_API_KEY oswa {p}chatbot key <kle>)',
    'chatbot.keySet': '🔑 Kle API xKiro anrejistre. Efase mesaj ki gen kle a pou sekirite.',
    'chatbot.keyGroup': '⚠️ Pa janm voye kle API ou nan yon gwoup. Voye l nan pwòp chat ou.',
    'chatbot.modelSet': '✅ Modèl chatbot la : *{model}*.',
    'chatbot.reset': '🧹 Memwa chatbot la efase.',
    'chatbot.noKeyOn': '⚠️ Chatbot la limen men pa gen kle xKiro. Itilize {p}chatbot key <kle> oswa XKIRO_API_KEY.',

    'play.usage': '🎵 Itilizasyon : {p}play <non mizik oswa lyen YouTube>\nEgzanp : {p}play Wendyyy Picasso',
    'play.searching': '🔍 M ap chèche : {query}',
    'play.noResults': '❌ Pa jwenn anyen.',
    'play.choose': '🎵 *{title}*\n\n👤 Chèn : {author}\n⏱️ Dire : {duration}\n👁️ Vi : {views}\n🔗 {url}\n\n*Reponn mesaj sa a ak :*\n1️⃣ 🎧 Odyo (MP3)\n2️⃣ 🎬 Videyo (MP4)\n\n⏳ Li ekspire nan 5 minit.',
    'play.dlAudio': '🎧 M ap telechaje odyo a... tann.',
    'play.dlVideo': '🎬 M ap telechaje videyo a... tann.',
    'play.failed': '❌ Telechajman an echwe sou tout sous yo. Eseye ankò pita oswa chwazi yon lòt mizik.',
    'play.tooLarge': '❌ Fichye a twò lou pou WhatsApp ({size} MB).',
    'play.expired': '⌛ Chwa sa a ekspire. Fè {p}play ankò.',
    'play.invalidChoice': '❓ Reponn *1* pou odyo oswa *2* pou videyo.',

    'ttt.usage': '❌⭕ *Tik-Tak-To*\n\n{p}ttt — jwe kont bot la\n{p}ttt @user — defye yon moun\n{p}ttt end — kanpe pati a\n\nJwe lè w voye yon chif ant 1 ak 9.',
    'ttt.started': '🎮 *Tik-Tak-To*\n\n❌ {x}\n⭕ {o}\n\n{board}\n\n👉 Tou : {turn} — voye yon chif 1-9.',
    'ttt.turn': '{board}\n\n👉 Tou : {turn} — voye yon chif 1-9.',
    'ttt.win': '{board}\n\n🏆 {winner} genyen !',
    'ttt.draw': '{board}\n\n🤝 Match nil !',
    'ttt.taken': '❌ Kaz sa a deja pran.',
    'ttt.notTurn': '⏳ Se pa tou pa w.',
    'ttt.already': '⚠️ Gen yon pati k ap jwe deja isit la. Fè {p}ttt end pou kanpe l.',
    'ttt.ended': '🛑 Pati a kanpe.',
    'ttt.none': 'ℹ️ Pa gen pati k ap jwe isit la.',
    'ttt.bot': 'Bot 🤖',
    'ttt.self': '❌ Ou pa ka jwe kont tèt ou.',

    'hangman.start': '🪢 *Jwèt Pann*\n\n{word}\n\n❤️ Lavi : {lives}\nVoye yon lèt. ({p}hangman end pou kanpe)',
    'hangman.state': '{art}\n{word}\n\n❤️ Lavi : {lives}\n🔤 Eseye : {tried}',
    'hangman.win': '🎉 Ou jwenn li : *{word}* !',
    'hangman.lose': '{art}\n💀 Ou pèdi ! Mo a se te *{word}*.',
    'hangman.already': '⚠️ Lèt « {letter} » te deja eseye.',

    'rps.usage': '✊✋✌️ Itilizasyon : {p}rps wòch | papye | sizo',
    'rps.result': 'Ou : {you}\nBot : {bot}\n\n{verdict}',
    'rps.win': '🏆 Ou genyen !', 'rps.lose': '😈 Bot la genyen !', 'rps.draw': '🤝 Egalite !',
    'rps.rock': 'wòch ✊', 'rps.paper': 'papye ✋', 'rps.scissors': 'sizo ✌️',

    'guess.start': '🔢 *Devine nimewo a*\nMwen chwazi yon nimewo ant 1 ak 100. Ou gen {tries} chans — voye yon nimewo !',
    'guess.higher': '⬆️ Pi gwo ! (rete {left} chans)',
    'guess.lower': '⬇️ Pi piti ! (rete {left} chans)',
    'guess.win': '🎉 Bravo ! Se te *{n}* — ou jwenn li nan {used} chans.',
    'guess.lose': '💀 Pa gen chans ankò ! Se te *{n}*.',

    'math.question': '🧮 *Kwiz matematik* ({level})\n\n{q} = ?\n\n⏳ {sec}s — voye repons ou !',
    'math.correct': '✅ Bon repons, {name} ! {q} = *{a}*',
    'math.wrong': '❌ Move repons, eseye ankò !',
    'math.timeout': '⌛ Tan fini ! {q} = *{a}*',

    'slot.result': '🎰 *MACHIN A SOU*\n\n┃ {r} ┃\n\n{verdict}',
    'slot.jackpot': '💰 JACKPOT ! Twa menm !', 'slot.pair': '✨ Pa mal, yon pè !', 'slot.lose': '😢 Pa gen chans fwa sa a.',

    '8ball.usage': '🎱 Itilizasyon : {p}8ball <kesyon>',
    '8ball.answers': 'Se sèten.|San dout.|Wi, nèt.|Gen anpil chans.|Siy yo di wi.|Mande ankò pita.|M pa ka di kounye a.|Pa konte sou sa.|Sous mwen yo di non.|Pa gen anpil chans.',

    'ship.usage': '💘 Itilizasyon : {p}ship @user1 @user2 (oswa reponn yon moun)',
    'ship.result': '💘 *Mezi lanmou*\n\n{a} ❤️ {b}\n\n{bar} {pct}%\n\n{verdict}',
    'ship.v0': 'Zanmi sèlman... 😅', 'ship.v1': 'Gen yon bagay la 👀', 'ship.v2': 'Bèl koup ! 💞', 'ship.v3': 'Nanm sè ! 💍',

    'poll.usage': '📊 Itilizasyon : {p}poll Kesyon | opsyon 1 | opsyon 2 | ...\n(2 rive 12 opsyon)',

    'remind.usage': '⏰ Itilizasyon : {p}remind <tan> <mesaj>\nTan : 30s, 10m, 2h (max 24h)\nEgzanp : {p}remind 10m bwè dlo',
    'remind.set': '⏰ OK ! M ap raple w nan {time}.',
    'remind.fire': '⏰ *Rapèl* pou @{user} :\n\n{text}',

    'afk.set': '💤 Mòd AFK limen{reason}. M ap avèti moun ki tag ou oswa ekri w.',
    'afk.back': '👋 Byenvini ankò ! Ou te AFK pandan {time}.',
    'afk.notice': '💤 Mèt la AFK{reason} (depi {time}). L ap reponn pita.',

    'genpass.result': '🔐 *Modpas jenere* ({len} karaktè) :\n\n{pass}',
    'genpass.usage': '🔐 Itilizasyon : {p}genpass [longè 8-64]',
  },

  es: {
    'lang.current': '🌐 *Idioma*\n\nActual: {flag} *{name}*\n\n*Disponibles:*\n{list}\n\nUso: {p}lang es\n{scopeNote}',
    'lang.scopeOwner': '👑 Como propietario, tu elección será el idioma predeterminado para todos.',
    'lang.scopeUser': '👤 Tu elección solo se aplica a ti.',
    'lang.invalid': '❌ Idioma desconocido "{input}".\nDisponibles: {codes}',
    'lang.setSession': '✅ Idioma del bot cambiado a {flag} *{name}* para todos.',
    'lang.setUser': '✅ Tu idioma ahora es {flag} *{name}*.',
    'lang.reset': '✅ Se eliminó tu idioma personal — ahora sigues el idioma del bot.',

    'menu.user': 'Usuario', 'menu.runtime': 'Activo', 'menu.time': 'Hora', 'menu.ram': 'RAM',
    'menu.prefix': 'Prefijo', 'menu.commands': 'Comandos', 'menu.mode': 'Modo',
    'menu.group': 'Grupo', 'menu.private': 'Privado', 'menu.lang': 'Idioma',

    'common.ownerOnly': '❌ Comando solo para el propietario.',
    'common.groupOnly': '❌ Este comando solo funciona en grupos.',
    'common.error': '⚠️ Error: {msg}',

    'chatbot.help': '🤖 *Chatbot IA* — estado: *{status}*\n\n{p}chatbot on — activar\n{p}chatbot off — desactivar\n{p}chatbot status — ver ajustes\n{p}chatbot model <id> — cambiar modelo\n{p}chatbot key <clave-api> — guardar tu clave xKiro\n{p}chatbot reset — borrar memoria\n\n*Cómo funciona:*\n• Privado: responde a todos los que te escriben\n• Grupo: solo responde cuando te etiquetan, te mencionan o responden a tu mensaje (anti-spam)',
    'chatbot.on': '✅ Chatbot *ACTIVADO*.\n• Privado: respondo a todos.\n• Grupos: solo cuando te etiquetan, mencionan o responden.',
    'chatbot.off': '📴 Chatbot *DESACTIVADO*.',
    'chatbot.status': '🤖 *Estado del chatbot*\n\nEstado: *{status}*\nModelo: {model}\nClave API: {key}',
    'chatbot.enabled': 'ACTIVADO', 'chatbot.disabled': 'DESACTIVADO',
    'chatbot.keyOk': 'configurada ✅', 'chatbot.keyMissing': 'falta ❌ (define XKIRO_API_KEY o usa {p}chatbot key <clave>)',
    'chatbot.keySet': '🔑 Clave API de xKiro guardada. Borra tu mensaje con la clave por seguridad.',
    'chatbot.keyGroup': '⚠️ Nunca envíes tu clave API en un grupo. Envíala en tu propio chat.',
    'chatbot.modelSet': '✅ Modelo del chatbot: *{model}*.',
    'chatbot.reset': '🧹 Memoria del chatbot borrada.',
    'chatbot.noKeyOn': '⚠️ El chatbot está activado pero no hay clave xKiro. Usa {p}chatbot key <clave> o XKIRO_API_KEY.',

    'play.usage': '🎵 Uso: {p}play <canción o enlace de YouTube>\nEjemplo: {p}play Wendyyy Picasso',
    'play.searching': '🔍 Buscando: {query}',
    'play.noResults': '❌ No se encontraron resultados.',
    'play.choose': '🎵 *{title}*\n\n👤 Canal: {author}\n⏱️ Duración: {duration}\n👁️ Vistas: {views}\n🔗 {url}\n\n*Responde a este mensaje con:*\n1️⃣ 🎧 Audio (MP3)\n2️⃣ 🎬 Video (MP4)\n\n⏳ Expira en 5 minutos.',
    'play.dlAudio': '🎧 Descargando audio... espera.',
    'play.dlVideo': '🎬 Descargando video... espera.',
    'play.failed': '❌ La descarga falló en todas las fuentes. Inténtalo de nuevo o prueba otra canción.',
    'play.tooLarge': '❌ Archivo demasiado grande para WhatsApp ({size} MB).',
    'play.expired': '⌛ Esta opción expiró. Usa {p}play otra vez.',
    'play.invalidChoice': '❓ Responde *1* para audio o *2* para video.',

    'ttt.usage': '❌⭕ *Tres en raya*\n\n{p}ttt — jugar contra el bot\n{p}ttt @user — retar a alguien\n{p}ttt end — terminar la partida\n\nJuega enviando un número del 1 al 9.',
    'ttt.started': '🎮 *Tres en raya*\n\n❌ {x}\n⭕ {o}\n\n{board}\n\n👉 Turno: {turn} — envía un número 1-9.',
    'ttt.turn': '{board}\n\n👉 Turno: {turn} — envía un número 1-9.',
    'ttt.win': '{board}\n\n🏆 ¡{winner} gana!',
    'ttt.draw': '{board}\n\n🤝 ¡Empate!',
    'ttt.taken': '❌ Esa casilla ya está ocupada.',
    'ttt.notTurn': '⏳ No es tu turno.',
    'ttt.already': '⚠️ Ya hay una partida en este chat. Usa {p}ttt end para terminarla.',
    'ttt.ended': '🛑 Partida terminada.',
    'ttt.none': 'ℹ️ No hay partida aquí.',
    'ttt.bot': 'Bot 🤖',
    'ttt.self': '❌ No puedes jugar contra ti mismo.',

    'hangman.start': '🪢 *Ahorcado*\n\n{word}\n\n❤️ Vidas: {lives}\nEnvía una letra. ({p}hangman end para parar)',
    'hangman.state': '{art}\n{word}\n\n❤️ Vidas: {lives}\n🔤 Probadas: {tried}',
    'hangman.win': '🎉 ¡Lo encontraste: *{word}*!',
    'hangman.lose': '{art}\n💀 ¡Perdiste! La palabra era *{word}*.',
    'hangman.already': '⚠️ La letra "{letter}" ya se probó.',

    'rps.usage': '✊✋✌️ Uso: {p}rps piedra | papel | tijera',
    'rps.result': 'Tú: {you}\nBot: {bot}\n\n{verdict}',
    'rps.win': '🏆 ¡Ganaste!', 'rps.lose': '😈 ¡Gana el bot!', 'rps.draw': '🤝 ¡Empate!',
    'rps.rock': 'piedra ✊', 'rps.paper': 'papel ✋', 'rps.scissors': 'tijera ✌️',

    'guess.start': '🔢 *Adivina el número*\nElegí un número entre 1 y 100. Tienes {tries} intentos — ¡envía un número!',
    'guess.higher': '⬆️ ¡Más alto! ({left} intentos restantes)',
    'guess.lower': '⬇️ ¡Más bajo! ({left} intentos restantes)',
    'guess.win': '🎉 ¡Correcto! Era *{n}* — en {used} intentos.',
    'guess.lose': '💀 ¡Sin intentos! Era *{n}*.',

    'math.question': '🧮 *Quiz de matemáticas* ({level})\n\n{q} = ?\n\n⏳ {sec}s — ¡envía tu respuesta!',
    'math.correct': '✅ ¡Correcto, {name}! {q} = *{a}*',
    'math.wrong': '❌ Respuesta incorrecta, ¡intenta otra vez!',
    'math.timeout': '⌛ ¡Se acabó el tiempo! {q} = *{a}*',

    'slot.result': '🎰 *TRAGAMONEDAS*\n\n┃ {r} ┃\n\n{verdict}',
    'slot.jackpot': '💰 ¡JACKPOT! ¡Tres iguales!', 'slot.pair': '✨ ¡Bien, un par!', 'slot.lose': '😢 Sin suerte esta vez.',

    '8ball.usage': '🎱 Uso: {p}8ball <pregunta>',
    '8ball.answers': 'Es cierto.|Sin duda.|Sí, definitivamente.|Muy probablemente.|Las señales dicen que sí.|Pregunta más tarde.|No puedo predecirlo ahora.|No cuentes con ello.|Mis fuentes dicen que no.|Muy dudoso.',

    'ship.usage': '💘 Uso: {p}ship @user1 @user2 (o responde a alguien)',
    'ship.result': '💘 *Medidor de amor*\n\n{a} ❤️ {b}\n\n{bar} {pct}%\n\n{verdict}',
    'ship.v0': 'Solo amigos... 😅', 'ship.v1': 'Hay algo ahí 👀', 'ship.v2': '¡Gran pareja! 💞', 'ship.v3': '¡Almas gemelas! 💍',

    'poll.usage': '📊 Uso: {p}poll Pregunta | opción 1 | opción 2 | ...\n(2 a 12 opciones)',

    'remind.usage': '⏰ Uso: {p}remind <tiempo> <mensaje>\nTiempo: 30s, 10m, 2h (máx 24h)\nEjemplo: {p}remind 10m beber agua',
    'remind.set': '⏰ ¡OK! Te lo recuerdo en {time}.',
    'remind.fire': '⏰ *Recordatorio* para @{user}:\n\n{text}',

    'afk.set': '💤 Modo AFK activado{reason}. Avisaré a quien te etiquete o escriba.',
    'afk.back': '👋 ¡Bienvenido de nuevo! Estuviste AFK {time}.',
    'afk.notice': '💤 El propietario está AFK{reason} (desde hace {time}). Responderá más tarde.',

    'genpass.result': '🔐 *Contraseña generada* ({len} caracteres):\n\n{pass}',
    'genpass.usage': '🔐 Uso: {p}genpass [longitud 8-64]',
  },

  pt: {
    'lang.current': '🌐 *Idioma*\n\nAtual: {flag} *{name}*\n\n*Disponíveis:*\n{list}\n\nUso: {p}lang pt\n{scopeNote}',
    'lang.scopeOwner': '👑 Como dono, sua escolha vira o idioma padrão para todos.',
    'lang.scopeUser': '👤 Sua escolha vale só para você.',
    'lang.invalid': '❌ Idioma desconhecido "{input}".\nDisponíveis: {codes}',
    'lang.setSession': '✅ Idioma do bot definido para {flag} *{name}* para todos.',
    'lang.setUser': '✅ Seu idioma agora é {flag} *{name}*.',
    'lang.reset': '✅ Seu idioma pessoal foi removido — agora você segue o padrão do bot.',

    'menu.user': 'Usuário', 'menu.runtime': 'Ativo há', 'menu.time': 'Hora', 'menu.ram': 'RAM',
    'menu.prefix': 'Prefixo', 'menu.commands': 'Comandos', 'menu.mode': 'Modo',
    'menu.group': 'Grupo', 'menu.private': 'Privado', 'menu.lang': 'Idioma',

    'common.ownerOnly': '❌ Comando só para o dono.',
    'common.groupOnly': '❌ Este comando só funciona em grupos.',
    'common.error': '⚠️ Erro: {msg}',

    'chatbot.help': '🤖 *Chatbot IA* — status: *{status}*\n\n{p}chatbot on — ativar\n{p}chatbot off — desativar\n{p}chatbot status — ver ajustes\n{p}chatbot model <id> — trocar modelo\n{p}chatbot key <chave-api> — salvar sua chave xKiro\n{p}chatbot reset — limpar memória\n\n*Como funciona:*\n• Privado: responde a todos que te escrevem\n• Grupo: só responde quando te marcam, mencionam ou respondem sua mensagem (anti-spam)',
    'chatbot.on': '✅ Chatbot *ATIVADO*.\n• Privado: respondo a todos.\n• Grupos: só quando você é marcado, mencionado ou respondido.',
    'chatbot.off': '📴 Chatbot *DESATIVADO*.',
    'chatbot.status': '🤖 *Status do chatbot*\n\nEstado: *{status}*\nModelo: {model}\nChave API: {key}',
    'chatbot.enabled': 'ATIVADO', 'chatbot.disabled': 'DESATIVADO',
    'chatbot.keyOk': 'configurada ✅', 'chatbot.keyMissing': 'ausente ❌ (defina XKIRO_API_KEY ou use {p}chatbot key <chave>)',
    'chatbot.keySet': '🔑 Chave API xKiro salva. Apague sua mensagem com a chave por segurança.',
    'chatbot.keyGroup': '⚠️ Nunca envie sua chave API em um grupo. Envie no seu próprio chat.',
    'chatbot.modelSet': '✅ Modelo do chatbot: *{model}*.',
    'chatbot.reset': '🧹 Memória do chatbot limpa.',
    'chatbot.noKeyOn': '⚠️ O chatbot está ativado mas sem chave xKiro. Use {p}chatbot key <chave> ou XKIRO_API_KEY.',

    'play.usage': '🎵 Uso: {p}play <música ou link do YouTube>\nExemplo: {p}play Wendyyy Picasso',
    'play.searching': '🔍 Procurando: {query}',
    'play.noResults': '❌ Nenhum resultado encontrado.',
    'play.choose': '🎵 *{title}*\n\n👤 Canal: {author}\n⏱️ Duração: {duration}\n👁️ Visualizações: {views}\n🔗 {url}\n\n*Responda esta mensagem com:*\n1️⃣ 🎧 Áudio (MP3)\n2️⃣ 🎬 Vídeo (MP4)\n\n⏳ Expira em 5 minutos.',
    'play.dlAudio': '🎧 Baixando áudio... aguarde.',
    'play.dlVideo': '🎬 Baixando vídeo... aguarde.',
    'play.failed': '❌ O download falhou em todas as fontes. Tente de novo ou outra música.',
    'play.tooLarge': '❌ Arquivo grande demais para o WhatsApp ({size} MB).',
    'play.expired': '⌛ Esta escolha expirou. Use {p}play de novo.',
    'play.invalidChoice': '❓ Responda *1* para áudio ou *2* para vídeo.',

    'ttt.usage': '❌⭕ *Jogo da velha*\n\n{p}ttt — jogar contra o bot\n{p}ttt @user — desafiar alguém\n{p}ttt end — encerrar a partida\n\nJogue enviando um número de 1 a 9.',
    'ttt.started': '🎮 *Jogo da velha*\n\n❌ {x}\n⭕ {o}\n\n{board}\n\n👉 Vez de: {turn} — envie um número 1-9.',
    'ttt.turn': '{board}\n\n👉 Vez de: {turn} — envie um número 1-9.',
    'ttt.win': '{board}\n\n🏆 {winner} venceu!',
    'ttt.draw': '{board}\n\n🤝 Empate!',
    'ttt.taken': '❌ Essa casa já está ocupada.',
    'ttt.notTurn': '⏳ Não é a sua vez.',
    'ttt.already': '⚠️ Já existe uma partida neste chat. Use {p}ttt end para encerrar.',
    'ttt.ended': '🛑 Partida encerrada.',
    'ttt.none': 'ℹ️ Nenhuma partida aqui.',
    'ttt.bot': 'Bot 🤖',
    'ttt.self': '❌ Você não pode jogar contra si mesmo.',

    'hangman.start': '🪢 *Forca*\n\n{word}\n\n❤️ Vidas: {lives}\nEnvie uma letra. ({p}hangman end para parar)',
    'hangman.state': '{art}\n{word}\n\n❤️ Vidas: {lives}\n🔤 Tentadas: {tried}',
    'hangman.win': '🎉 Você acertou: *{word}*!',
    'hangman.lose': '{art}\n💀 Fim de jogo! A palavra era *{word}*.',
    'hangman.already': '⚠️ A letra "{letter}" já foi tentada.',

    'rps.usage': '✊✋✌️ Uso: {p}rps pedra | papel | tesoura',
    'rps.result': 'Você: {you}\nBot: {bot}\n\n{verdict}',
    'rps.win': '🏆 Você venceu!', 'rps.lose': '😈 O bot venceu!', 'rps.draw': '🤝 Empate!',
    'rps.rock': 'pedra ✊', 'rps.paper': 'papel ✋', 'rps.scissors': 'tesoura ✌️',

    'guess.start': '🔢 *Adivinhe o número*\nEscolhi um número entre 1 e 100. Você tem {tries} tentativas — envie um número!',
    'guess.higher': '⬆️ Maior! ({left} tentativas restantes)',
    'guess.lower': '⬇️ Menor! ({left} tentativas restantes)',
    'guess.win': '🎉 Certo! Era *{n}* — em {used} tentativas.',
    'guess.lose': '💀 Sem tentativas! Era *{n}*.',

    'math.question': '🧮 *Quiz de matemática* ({level})\n\n{q} = ?\n\n⏳ {sec}s — envie sua resposta!',
    'math.correct': '✅ Correto, {name}! {q} = *{a}*',
    'math.wrong': '❌ Resposta errada, tente de novo!',
    'math.timeout': '⌛ Tempo esgotado! {q} = *{a}*',

    'slot.result': '🎰 *CAÇA-NÍQUEIS*\n\n┃ {r} ┃\n\n{verdict}',
    'slot.jackpot': '💰 JACKPOT! Três iguais!', 'slot.pair': '✨ Boa, um par!', 'slot.lose': '😢 Sem sorte desta vez.',

    '8ball.usage': '🎱 Uso: {p}8ball <pergunta>',
    '8ball.answers': 'É certo.|Sem dúvida.|Sim, definitivamente.|Muito provável.|Os sinais dizem que sim.|Pergunte mais tarde.|Não dá para prever agora.|Não conte com isso.|Minhas fontes dizem não.|Muito duvidoso.',

    'ship.usage': '💘 Uso: {p}ship @user1 @user2 (ou responda alguém)',
    'ship.result': '💘 *Medidor do amor*\n\n{a} ❤️ {b}\n\n{bar} {pct}%\n\n{verdict}',
    'ship.v0': 'Só amigos... 😅', 'ship.v1': 'Tem alguma coisa aí 👀', 'ship.v2': 'Ótimo casal! 💞', 'ship.v3': 'Almas gêmeas! 💍',

    'poll.usage': '📊 Uso: {p}poll Pergunta | opção 1 | opção 2 | ...\n(2 a 12 opções)',

    'remind.usage': '⏰ Uso: {p}remind <tempo> <mensagem>\nTempo: 30s, 10m, 2h (máx 24h)\nExemplo: {p}remind 10m beber água',
    'remind.set': '⏰ OK! Vou te lembrar em {time}.',
    'remind.fire': '⏰ *Lembrete* para @{user}:\n\n{text}',

    'afk.set': '💤 Modo AFK ativado{reason}. Vou avisar quem te marcar ou escrever.',
    'afk.back': '👋 Bem-vindo de volta! Você ficou AFK por {time}.',
    'afk.notice': '💤 O dono está AFK{reason} (há {time}). Ele responderá depois.',

    'genpass.result': '🔐 *Senha gerada* ({len} caracteres):\n\n{pass}',
    'genpass.usage': '🔐 Uso: {p}genpass [tamanho 8-64]',
  },

  ar: {
    'lang.current': '🌐 *اللغة*\n\nالحالية: {flag} *{name}*\n\n*المتاحة:*\n{list}\n\nالاستخدام: {p}lang ar\n{scopeNote}',
    'lang.scopeOwner': '👑 بصفتك المالك، اختيارك يصبح اللغة الافتراضية للجميع.',
    'lang.scopeUser': '👤 اختيارك ينطبق عليك فقط.',
    'lang.invalid': '❌ لغة غير معروفة "{input}".\nالمتاحة: {codes}',
    'lang.setSession': '✅ تم ضبط لغة البوت إلى {flag} *{name}* للجميع.',
    'lang.setUser': '✅ لغتك الآن {flag} *{name}*.',
    'lang.reset': '✅ تمت إزالة لغتك الشخصية — أنت الآن تتبع لغة البوت.',

    'menu.user': 'المستخدم', 'menu.runtime': 'مدة التشغيل', 'menu.time': 'الوقت', 'menu.ram': 'الذاكرة',
    'menu.prefix': 'البادئة', 'menu.commands': 'الأوامر', 'menu.mode': 'الوضع',
    'menu.group': 'مجموعة', 'menu.private': 'خاص', 'menu.lang': 'اللغة',

    'common.ownerOnly': '❌ هذا الأمر للمالك فقط.',
    'common.groupOnly': '❌ هذا الأمر يعمل في المجموعات فقط.',
    'common.error': '⚠️ خطأ: {msg}',

    'chatbot.help': '🤖 *روبوت الدردشة الذكي* — الحالة: *{status}*\n\n{p}chatbot on — تشغيل\n{p}chatbot off — إيقاف\n{p}chatbot status — عرض الإعدادات\n{p}chatbot model <id> — تغيير النموذج\n{p}chatbot key <api-key> — حفظ مفتاح xKiro\n{p}chatbot reset — مسح الذاكرة\n\n*طريقة العمل:*\n• الخاص: يرد على كل من يراسلك\n• المجموعات: يرد فقط عند الإشارة إليك أو ذكرك أو الرد على رسالتك (مضاد للسبام)',
    'chatbot.on': '✅ تم *تشغيل* روبوت الدردشة.\n• الخاص: أرد على الجميع.\n• المجموعات: فقط عند الإشارة إليك أو ذكرك أو الرد عليك.',
    'chatbot.off': '📴 تم *إيقاف* روبوت الدردشة.',
    'chatbot.status': '🤖 *حالة روبوت الدردشة*\n\nالحالة: *{status}*\nالنموذج: {model}\nمفتاح API: {key}',
    'chatbot.enabled': 'يعمل', 'chatbot.disabled': 'متوقف',
    'chatbot.keyOk': 'مضبوط ✅', 'chatbot.keyMissing': 'غير موجود ❌ (اضبط XKIRO_API_KEY أو استخدم {p}chatbot key <key>)',
    'chatbot.keySet': '🔑 تم حفظ مفتاح xKiro. احذف رسالتك التي تحتوي على المفتاح للأمان.',
    'chatbot.keyGroup': '⚠️ لا ترسل مفتاح API في مجموعة أبداً. أرسله في محادثتك الخاصة مع نفسك.',
    'chatbot.modelSet': '✅ نموذج روبوت الدردشة: *{model}*.',
    'chatbot.reset': '🧹 تم مسح ذاكرة روبوت الدردشة.',
    'chatbot.noKeyOn': '⚠️ روبوت الدردشة يعمل لكن لا يوجد مفتاح xKiro. استخدم {p}chatbot key <key> أو XKIRO_API_KEY.',

    'play.usage': '🎵 الاستخدام: {p}play <اسم الأغنية أو رابط يوتيوب>\nمثال: {p}play Wendyyy Picasso',
    'play.searching': '🔍 جارٍ البحث عن: {query}',
    'play.noResults': '❌ لا توجد نتائج.',
    'play.choose': '🎵 *{title}*\n\n👤 القناة: {author}\n⏱️ المدة: {duration}\n👁️ المشاهدات: {views}\n🔗 {url}\n\n*رد على هذه الرسالة بـ:*\n1️⃣ 🎧 صوت (MP3)\n2️⃣ 🎬 فيديو (MP4)\n\n⏳ تنتهي خلال 5 دقائق.',
    'play.dlAudio': '🎧 جارٍ تحميل الصوت... انتظر.',
    'play.dlVideo': '🎬 جارٍ تحميل الفيديو... انتظر.',
    'play.failed': '❌ فشل التحميل من جميع المصادر. حاول لاحقاً أو جرّب أغنية أخرى.',
    'play.tooLarge': '❌ الملف كبير جداً لواتساب ({size} ميغابايت).',
    'play.expired': '⌛ انتهت صلاحية هذا الاختيار. استخدم {p}play مرة أخرى.',
    'play.invalidChoice': '❓ رد بـ *1* للصوت أو *2* للفيديو.',

    'ttt.usage': '❌⭕ *إكس أو*\n\n{p}ttt — العب ضد البوت\n{p}ttt @user — تحدَّ شخصاً\n{p}ttt end — إنهاء اللعبة\n\nالعب بإرسال رقم من 1 إلى 9.',
    'ttt.started': '🎮 *إكس أو*\n\n❌ {x}\n⭕ {o}\n\n{board}\n\n👉 الدور: {turn} — أرسل رقماً 1-9.',
    'ttt.turn': '{board}\n\n👉 الدور: {turn} — أرسل رقماً 1-9.',
    'ttt.win': '{board}\n\n🏆 {winner} فاز!',
    'ttt.draw': '{board}\n\n🤝 تعادل!',
    'ttt.taken': '❌ هذه الخانة مشغولة.',
    'ttt.notTurn': '⏳ ليس دورك.',
    'ttt.already': '⚠️ توجد لعبة جارية هنا. استخدم {p}ttt end لإنهائها.',
    'ttt.ended': '🛑 تم إنهاء اللعبة.',
    'ttt.none': 'ℹ️ لا توجد لعبة هنا.',
    'ttt.bot': 'البوت 🤖',
    'ttt.self': '❌ لا يمكنك اللعب ضد نفسك.',

    'hangman.start': '🪢 *الرجل المشنوق*\n\n{word}\n\n❤️ المحاولات: {lives}\nأرسل حرفاً. ({p}hangman end للإيقاف)',
    'hangman.state': '{art}\n{word}\n\n❤️ المحاولات: {lives}\n🔤 المجرّبة: {tried}',
    'hangman.win': '🎉 وجدتها: *{word}*!',
    'hangman.lose': '{art}\n💀 انتهت اللعبة! الكلمة كانت *{word}*.',
    'hangman.already': '⚠️ الحرف "{letter}" مجرّب مسبقاً.',

    'rps.usage': '✊✋✌️ الاستخدام: {p}rps rock | paper | scissors',
    'rps.result': 'أنت: {you}\nالبوت: {bot}\n\n{verdict}',
    'rps.win': '🏆 فزت!', 'rps.lose': '😈 البوت فاز!', 'rps.draw': '🤝 تعادل!',
    'rps.rock': 'حجر ✊', 'rps.paper': 'ورقة ✋', 'rps.scissors': 'مقص ✌️',

    'guess.start': '🔢 *خمّن الرقم*\nاخترت رقماً بين 1 و100. لديك {tries} محاولات — أرسل رقماً!',
    'guess.higher': '⬆️ أكبر! (تبقّى {left} محاولات)',
    'guess.lower': '⬇️ أصغر! (تبقّى {left} محاولات)',
    'guess.win': '🎉 صحيح! كان *{n}* — في {used} محاولات.',
    'guess.lose': '💀 انتهت المحاولات! كان *{n}*.',

    'math.question': '🧮 *مسابقة رياضيات* ({level})\n\n{q} = ?\n\n⏳ {sec} ثانية — أرسل إجابتك!',
    'math.correct': '✅ صحيح يا {name}! {q} = *{a}*',
    'math.wrong': '❌ إجابة خاطئة، حاول مجدداً!',
    'math.timeout': '⌛ انتهى الوقت! {q} = *{a}*',

    'slot.result': '🎰 *آلة الحظ*\n\n┃ {r} ┃\n\n{verdict}',
    'slot.jackpot': '💰 الجائزة الكبرى! ثلاثة متطابقة!', 'slot.pair': '✨ جميل، زوج!', 'slot.lose': '😢 لا حظ هذه المرة.',

    '8ball.usage': '🎱 الاستخدام: {p}8ball <سؤال>',
    '8ball.answers': 'هذا مؤكد.|بلا شك.|نعم بالتأكيد.|على الأرجح.|المؤشرات تقول نعم.|اسأل لاحقاً.|لا يمكن التنبؤ الآن.|لا تعتمد على ذلك.|مصادري تقول لا.|مشكوك فيه جداً.',

    'ship.usage': '💘 الاستخدام: {p}ship @user1 @user2 (أو رد على شخص)',
    'ship.result': '💘 *مقياس الحب*\n\n{a} ❤️ {b}\n\n{bar} {pct}%\n\n{verdict}',
    'ship.v0': 'مجرد أصدقاء... 😅', 'ship.v1': 'هناك شيء ما 👀', 'ship.v2': 'ثنائي رائع! 💞', 'ship.v3': 'توأم روح! 💍',

    'poll.usage': '📊 الاستخدام: {p}poll السؤال | خيار 1 | خيار 2 | ...\n(من 2 إلى 12 خياراً)',

    'remind.usage': '⏰ الاستخدام: {p}remind <المدة> <الرسالة>\nالمدة: 30s، 10m، 2h (حد أقصى 24h)\nمثال: {p}remind 10m اشرب الماء',
    'remind.set': '⏰ حسناً! سأذكّرك بعد {time}.',
    'remind.fire': '⏰ *تذكير* لـ @{user}:\n\n{text}',

    'afk.set': '💤 وضع الغياب مفعّل{reason}. سأخبر من يشير إليك أو يراسلك.',
    'afk.back': '👋 أهلاً بعودتك! كنت غائباً لمدة {time}.',
    'afk.notice': '💤 المالك غائب{reason} (منذ {time}). سيرد لاحقاً.',

    'genpass.result': '🔐 *كلمة مرور مولّدة* ({len} حرفاً):\n\n{pass}',
    'genpass.usage': '🔐 الاستخدام: {p}genpass [الطول 8-64]',
  },

  de: {
    'lang.current': '🌐 *Sprache*\n\nAktuell: {flag} *{name}*\n\n*Verfügbar:*\n{list}\n\nVerwendung: {p}lang de\n{scopeNote}',
    'lang.scopeOwner': '👑 Als Besitzer wird deine Wahl die Standardsprache für alle.',
    'lang.scopeUser': '👤 Deine Wahl gilt nur für dich.',
    'lang.invalid': '❌ Unbekannte Sprache „{input}“.\nVerfügbar: {codes}',
    'lang.setSession': '✅ Bot-Sprache für alle auf {flag} *{name}* gesetzt.',
    'lang.setUser': '✅ Deine Sprache ist jetzt {flag} *{name}*.',
    'lang.reset': '✅ Deine persönliche Sprache wurde entfernt — du folgst jetzt dem Bot-Standard.',

    'menu.user': 'Benutzer', 'menu.runtime': 'Laufzeit', 'menu.time': 'Zeit', 'menu.ram': 'RAM',
    'menu.prefix': 'Präfix', 'menu.commands': 'Befehle', 'menu.mode': 'Modus',
    'menu.group': 'Gruppe', 'menu.private': 'Privat', 'menu.lang': 'Sprache',

    'common.ownerOnly': '❌ Nur für den Besitzer.',
    'common.groupOnly': '❌ Dieser Befehl funktioniert nur in Gruppen.',
    'common.error': '⚠️ Fehler: {msg}',

    'chatbot.help': '🤖 *KI-Chatbot* — Status: *{status}*\n\n{p}chatbot on — einschalten\n{p}chatbot off — ausschalten\n{p}chatbot status — Einstellungen anzeigen\n{p}chatbot model <id> — Modell ändern\n{p}chatbot key <api-key> — xKiro-Schlüssel speichern\n{p}chatbot reset — Gedächtnis löschen\n\n*So funktioniert es:*\n• Privat: antwortet allen, die dir schreiben\n• Gruppe: antwortet nur, wenn du markiert, erwähnt oder auf deine Nachricht geantwortet wirst (Anti-Spam)',
    'chatbot.on': '✅ Chatbot *AN*.\n• Privat: Ich antworte allen.\n• Gruppen: nur wenn du markiert, erwähnt oder zitiert wirst.',
    'chatbot.off': '📴 Chatbot *AUS*.',
    'chatbot.status': '🤖 *Chatbot-Status*\n\nStatus: *{status}*\nModell: {model}\nAPI-Schlüssel: {key}',
    'chatbot.enabled': 'AN', 'chatbot.disabled': 'AUS',
    'chatbot.keyOk': 'eingerichtet ✅', 'chatbot.keyMissing': 'fehlt ❌ (XKIRO_API_KEY setzen oder {p}chatbot key <key>)',
    'chatbot.keySet': '🔑 xKiro-API-Schlüssel gespeichert. Lösche deine Nachricht mit dem Schlüssel zur Sicherheit.',
    'chatbot.keyGroup': '⚠️ Sende deinen API-Schlüssel niemals in einer Gruppe. Sende ihn im Chat mit dir selbst.',
    'chatbot.modelSet': '✅ Chatbot-Modell: *{model}*.',
    'chatbot.reset': '🧹 Chatbot-Gedächtnis gelöscht.',
    'chatbot.noKeyOn': '⚠️ Der Chatbot ist an, aber es ist kein xKiro-Schlüssel gesetzt. Nutze {p}chatbot key <key> oder XKIRO_API_KEY.',

    'play.usage': '🎵 Verwendung: {p}play <Songname oder YouTube-Link>\nBeispiel: {p}play Wendyyy Picasso',
    'play.searching': '🔍 Suche nach: {query}',
    'play.noResults': '❌ Keine Ergebnisse gefunden.',
    'play.choose': '🎵 *{title}*\n\n👤 Kanal: {author}\n⏱️ Dauer: {duration}\n👁️ Aufrufe: {views}\n🔗 {url}\n\n*Antworte auf diese Nachricht mit:*\n1️⃣ 🎧 Audio (MP3)\n2️⃣ 🎬 Video (MP4)\n\n⏳ Läuft in 5 Minuten ab.',
    'play.dlAudio': '🎧 Audio wird geladen... bitte warten.',
    'play.dlVideo': '🎬 Video wird geladen... bitte warten.',
    'play.failed': '❌ Download auf allen Quellen fehlgeschlagen. Versuche es später oder mit einem anderen Song.',
    'play.tooLarge': '❌ Datei zu groß für WhatsApp ({size} MB).',
    'play.expired': '⌛ Diese Auswahl ist abgelaufen. Nutze {p}play erneut.',
    'play.invalidChoice': '❓ Antworte *1* für Audio oder *2* für Video.',

    'ttt.usage': '❌⭕ *Tic-Tac-Toe*\n\n{p}ttt — gegen den Bot spielen\n{p}ttt @user — jemanden herausfordern\n{p}ttt end — Spiel beenden\n\nSpiele, indem du eine Zahl von 1 bis 9 sendest.',
    'ttt.started': '🎮 *Tic-Tac-Toe*\n\n❌ {x}\n⭕ {o}\n\n{board}\n\n👉 Am Zug: {turn} — sende eine Zahl 1-9.',
    'ttt.turn': '{board}\n\n👉 Am Zug: {turn} — sende eine Zahl 1-9.',
    'ttt.win': '{board}\n\n🏆 {winner} gewinnt!',
    'ttt.draw': '{board}\n\n🤝 Unentschieden!',
    'ttt.taken': '❌ Dieses Feld ist schon belegt.',
    'ttt.notTurn': '⏳ Du bist nicht dran.',
    'ttt.already': '⚠️ In diesem Chat läuft schon ein Spiel. Nutze {p}ttt end zum Beenden.',
    'ttt.ended': '🛑 Spiel beendet.',
    'ttt.none': 'ℹ️ Hier läuft kein Spiel.',
    'ttt.bot': 'Bot 🤖',
    'ttt.self': '❌ Du kannst nicht gegen dich selbst spielen.',

    'hangman.start': '🪢 *Galgenmännchen*\n\n{word}\n\n❤️ Leben: {lives}\nSende einen Buchstaben. ({p}hangman end zum Beenden)',
    'hangman.state': '{art}\n{word}\n\n❤️ Leben: {lives}\n🔤 Versucht: {tried}',
    'hangman.win': '🎉 Gefunden: *{word}*!',
    'hangman.lose': '{art}\n💀 Verloren! Das Wort war *{word}*.',
    'hangman.already': '⚠️ Der Buchstabe „{letter}“ wurde schon versucht.',

    'rps.usage': '✊✋✌️ Verwendung: {p}rps stein | papier | schere',
    'rps.result': 'Du: {you}\nBot: {bot}\n\n{verdict}',
    'rps.win': '🏆 Du gewinnst!', 'rps.lose': '😈 Der Bot gewinnt!', 'rps.draw': '🤝 Unentschieden!',
    'rps.rock': 'Stein ✊', 'rps.paper': 'Papier ✋', 'rps.scissors': 'Schere ✌️',

    'guess.start': '🔢 *Zahlenraten*\nIch habe eine Zahl zwischen 1 und 100 gewählt. Du hast {tries} Versuche — sende eine Zahl!',
    'guess.higher': '⬆️ Höher! (noch {left} Versuche)',
    'guess.lower': '⬇️ Niedriger! (noch {left} Versuche)',
    'guess.win': '🎉 Richtig! Es war *{n}* — in {used} Versuchen.',
    'guess.lose': '💀 Keine Versuche mehr! Es war *{n}*.',

    'math.question': '🧮 *Mathe-Quiz* ({level})\n\n{q} = ?\n\n⏳ {sec}s — sende deine Antwort!',
    'math.correct': '✅ Richtig, {name}! {q} = *{a}*',
    'math.wrong': '❌ Falsche Antwort, versuch es nochmal!',
    'math.timeout': '⌛ Zeit abgelaufen! {q} = *{a}*',

    'slot.result': '🎰 *SPIELAUTOMAT*\n\n┃ {r} ┃\n\n{verdict}',
    'slot.jackpot': '💰 JACKPOT! Drei gleiche!', 'slot.pair': '✨ Nett, ein Paar!', 'slot.lose': '😢 Diesmal kein Glück.',

    '8ball.usage': '🎱 Verwendung: {p}8ball <Frage>',
    '8ball.answers': 'Es ist sicher.|Ohne Zweifel.|Ja, definitiv.|Sehr wahrscheinlich.|Die Zeichen sagen ja.|Frag später nochmal.|Kann ich jetzt nicht sagen.|Verlass dich nicht darauf.|Meine Quellen sagen nein.|Sehr zweifelhaft.',

    'ship.usage': '💘 Verwendung: {p}ship @user1 @user2 (oder auf jemanden antworten)',
    'ship.result': '💘 *Liebesmeter*\n\n{a} ❤️ {b}\n\n{bar} {pct}%\n\n{verdict}',
    'ship.v0': 'Nur Freunde... 😅', 'ship.v1': 'Da ist was 👀', 'ship.v2': 'Tolles Paar! 💞', 'ship.v3': 'Seelenverwandte! 💍',

    'poll.usage': '📊 Verwendung: {p}poll Frage | Option 1 | Option 2 | ...\n(2 bis 12 Optionen)',

    'remind.usage': '⏰ Verwendung: {p}remind <Zeit> <Nachricht>\nZeit: 30s, 10m, 2h (max. 24h)\nBeispiel: {p}remind 10m Wasser trinken',
    'remind.set': '⏰ OK! Ich erinnere dich in {time}.',
    'remind.fire': '⏰ *Erinnerung* für @{user}:\n\n{text}',

    'afk.set': '💤 AFK-Modus AN{reason}. Ich sage es allen, die dich markieren oder anschreiben.',
    'afk.back': '👋 Willkommen zurück! Du warst {time} AFK.',
    'afk.notice': '💤 Der Besitzer ist AFK{reason} (seit {time}). Er antwortet später.',

    'genpass.result': '🔐 *Generiertes Passwort* ({len} Zeichen):\n\n{pass}',
    'genpass.usage': '🔐 Verwendung: {p}genpass [Länge 8-64]',
  },
};

// Fixed phrases that appear across the (English-only) legacy commands. Swapped
// in outgoing text by translateCommon() so the most frequent bits of older
// commands also follow the chosen language. Only exact substrings — never
// free text — so user/AI content is left alone.
const COMMON_PHRASES = {
  '❌ Owner only — link the account and send this command from it.': 'common.ownerOnly',
  '❌ Owner only command.': 'common.ownerOnly',
  '❌ No results found.': 'play.noResults',
};
const WORD_PHRASES = {
  fr: { 'Usage:': 'Utilisation :', 'Example:': 'Exemple :', 'Error:': 'Erreur :', 'Please wait': 'Patiente', 'Searching for:': 'Recherche :' },
  ht: { 'Usage:': 'Itilizasyon :', 'Example:': 'Egzanp :', 'Error:': 'Erè :', 'Please wait': 'Tanpri tann', 'Searching for:': 'M ap chèche :' },
  es: { 'Usage:': 'Uso:', 'Example:': 'Ejemplo:', 'Error:': 'Error:', 'Please wait': 'Por favor espera', 'Searching for:': 'Buscando:' },
  pt: { 'Usage:': 'Uso:', 'Example:': 'Exemplo:', 'Error:': 'Erro:', 'Please wait': 'Aguarde', 'Searching for:': 'Procurando:' },
  ar: { 'Usage:': 'الاستخدام:', 'Example:': 'مثال:', 'Error:': 'خطأ:', 'Please wait': 'يرجى الانتظار', 'Searching for:': 'جارٍ البحث عن:' },
  de: { 'Usage:': 'Verwendung:', 'Example:': 'Beispiel:', 'Error:': 'Fehler:', 'Please wait': 'Bitte warten', 'Searching for:': 'Suche nach:' },
};

function format(str, vars = {}) {
  return String(str).replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m));
}

function t(lang, key, vars) {
  const dict = STRINGS[lang] || STRINGS[DEFAULT_LANG];
  const raw = dict[key] !== undefined ? dict[key] : STRINGS[DEFAULT_LANG][key];
  if (raw === undefined) return key;
  return format(raw, vars);
}

function translateCommon(lang, text) {
  if (!text || typeof text !== 'string' || !lang || lang === DEFAULT_LANG) return text;
  let out = text;
  for (const [phrase, key] of Object.entries(COMMON_PHRASES)) {
    if (out.includes(phrase)) out = out.split(phrase).join(t(lang, key));
  }
  const words = WORD_PHRASES[lang];
  if (words) {
    for (const [phrase, tr] of Object.entries(words)) {
      if (out.includes(phrase)) out = out.split(phrase).join(tr);
    }
  }
  return out;
}

// ---- storage (per linked account) ----
function getSessionLang(sessionId) {
  const v = getGlobalSetting(sessionId, 'lang');
  return LANGUAGES[v] ? v : DEFAULT_LANG;
}
function setSessionLang(sessionId, code) {
  setGlobalSetting(sessionId, 'lang', code);
}
function getUserLangs(sessionId) {
  return getGlobalSetting(sessionId, 'userLangs') || {};
}
function setUserLang(sessionId, number, code) {
  const map = { ...getUserLangs(sessionId) };
  if (code) map[number] = code;
  else delete map[number];
  setGlobalSetting(sessionId, 'userLangs', map);
}
// number = bare phone number of the sender (may be empty)
function getLang(sessionId, number) {
  const own = number && getUserLangs(sessionId)[number];
  if (own && LANGUAGES[own]) return own;
  return getSessionLang(sessionId);
}

module.exports = {
  DEFAULT_LANG,
  LANGUAGES,
  STRINGS,
  normalizeLang,
  t,
  translateCommon,
  getLang,
  getSessionLang,
  setSessionLang,
  setUserLang,
  getUserLangs,
};
