const fs = require('fs');
const vm = require('vm');

let fileStr = fs.readFileSync('server/apply-ultimate-i18n.js', 'utf8');

// Replace User's username -> User username or User’s username
fileStr = fileStr.replace("friendNickPh: 'User\\'s username'", "friendNickPh: 'User’s username'");
fileStr = fileStr.replace("friendNickPh: 'User's username'", "friendNickPh: 'User’s username'");

// Let's check other English contractions / possessives:
fileStr = fileStr.replaceAll("Don't", "Do not");
fileStr = fileStr.replaceAll("don't", "do not");
fileStr = fileStr.replaceAll("can't", "cannot");
fileStr = fileStr.replaceAll("won't", "will not");
fileStr = fileStr.replaceAll("It's", "It is");
fileStr = fileStr.replaceAll("it's", "it is");
fileStr = fileStr.replaceAll("User's", "User’s");
fileStr = fileStr.replaceAll("user's", "user’s");
fileStr = fileStr.replaceAll("Someone else's", "Someone else’s");
fileStr = fileStr.replaceAll("someone else's", "someone else’s");

fs.writeFileSync('server/apply-ultimate-i18n.js', fileStr, 'utf8');
console.log('Processed English apostrophes in apply-ultimate-i18n.js');
