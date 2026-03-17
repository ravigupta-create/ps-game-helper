// PS Game Helper - Core Game Registry
// All category files call registerGames() to add their games
const CURRENT_YEAR = new Date().getFullYear();
const NEXT_YEAR = (CURRENT_YEAR + 1).toString().slice(-2);
const GAMES = [];
function registerGames(arr) { GAMES.push(...arr); }
