// PS Game Helper - Core Game Registry
// All category files call registerGames() to add their games
const CURRENT_YEAR = new Date().getFullYear();
const NEXT_YEAR = (CURRENT_YEAR + 1).toString().slice(-2);
const GAMES = [];
function registerGames(arr) { GAMES.push(...arr); }

// Year-specific control changes for yearly sports titles
// Each entry: { added: [...tips added that year], removed: [...tip titles removed], renamed: {old:new}, notes: "summary" }
// Tips in the base game represent the CURRENT year. Year changes describe diffs from current.
const YEAR_CHANGES = {
  madden: {
    nameFormat: function(y) { return "Madden NFL " + y; },
    minYear: 2020, maxYear: CURRENT_YEAR,
    changes: {
      2020: { removed: ["Precision Passing","RPO Reads"], notes: "No precision passing system. Simpler pass mechanics. No RPO reads." },
      2021: { removed: ["Precision Passing","RPO Reads"], notes: "Added next-gen stats integration. Still no precision passing." },
      2022: { removed: ["Precision Passing"], notes: "Gameday Momentum system added. RPO reads introduced." },
      2023: { added: [{level:"intermediate",section:"Passing",title:"Skill-Based Passing (Legacy)",controls:["L2 + receiver"],desc:"First year of skill-based passing. Aim a reticle for pass placement.",why:"Precursor to precision passing. Rewarded accuracy."}], notes: "FieldSENSE introduced. Skill-based passing debut." },
      2024: { notes: "Superstar mode overhaul. Precision passing refined. Hit stick improvements." },
      2025: { notes: "BOOM Tech tackling. Foundational Football improvements to blocking AI." },
    }
  },
  nba2k: {
    nameFormat: function(y) { return "NBA 2K" + String(y).slice(-2); },
    minYear: 2020, maxYear: parseInt("20" + NEXT_YEAR),
    changes: {
      2020: { removed: ["Snatchback","Speed Boost"], notes: "Pre-next-gen dribbling. Simpler dribble moves. No snatchback or speed boost." },
      2021: { removed: ["Snatchback"], notes: "Next-gen debut on PS5. New shot meter. Speed boost introduced." },
      2022: { notes: "New dribble system. Shot timing windows tightened. Snatchback added." },
      2023: { added: [{level:"advanced",section:"Dribbling",title:"Adrenaline Boosts",controls:["3 boosts per possession"],desc:"You get 3 adrenaline boosts per possession. Each dribble move uses one.",why:"Prevents dribble spam. Forces smarter shot creation."}], notes: "Adrenaline boost system limits dribble moves per possession." },
      2024: { notes: "ProPLAY animations from real NBA footage. Refined adrenaline system." },
      2025: { notes: "Enhanced Pro Stick shooting. Improved badge system." },
    }
  },
  fc: {
    nameFormat: function(y) { return y <= 2023 ? "FIFA " + y : "EA Sports FC " + (y - 2000 - 1); },
    minYear: 2020, maxYear: CURRENT_YEAR,
    changes: {
      2020: { removed: ["Tactical Sprint","Player Lock","Trivela Shot","Directional Nutmeg","Skill Cancel"], notes: "FIFA 20. No tactical sprint. VOLTA debut. Simpler skill system." },
      2021: { removed: ["Player Lock","Trivela Shot","Directional Nutmeg","Skill Cancel"], notes: "FIFA 21. Creative runs introduced. Agile dribbling debut." },
      2022: { removed: ["Trivela Shot","Directional Nutmeg","Skill Cancel"], notes: "FIFA 22. HyperMotion tech. Next-gen animation overhaul." },
      2023: { removed: ["Trivela Shot","Skill Cancel"], notes: "FIFA 23. Power shots introduced. Last FIFA-branded game. Women's club football." },
      2024: { added: [{level:"intermediate",section:"Shooting",title:"Power Shot",controls:["L1 + R1 + ○"],desc:"New shot type with extra power but slower wind-up.",why:"Powerful from distance but defenders can close you down during animation."}], notes: "EA FC 24. PlayStyles replaced traits. Controlled sprint." },
      2025: { notes: "EA FC 25. FC IQ tactical system. Roles replace positions." },
    }
  },
  mlb: {
    nameFormat: function(y) { return "MLB The Show " + y; },
    minYear: 2020, maxYear: CURRENT_YEAR,
    changes: {
      2020: { removed: ["PCI Anchor Points","Back Door Slider","Delayed Steal"], notes: "Simpler PCI system. Pre-pinpoint pitching era." },
      2021: { added: [{level:"intermediate",section:"Pitching",title:"Pinpoint Pitching (New)",controls:["Right Stick gestures"],desc:"Brand new Pinpoint pitching interface debuted in 2021.",why:"Most accurate method ever. Changed the meta completely."}], notes: "Pinpoint pitching debut. Stadium Creator introduced." },
      2022: { notes: "Mini Seasons mode. Refined pinpoint. PCI improvements." },
      2023: { notes: "Complete fielding overhaul. New diving/throwing animations." },
      2024: { notes: "Negro Leagues legends. Storylines mode. Spring Training." },
      2025: { notes: "Enhanced physics engine. Revamped Diamond Dynasty." },
    }
  },
  nhl: {
    nameFormat: function(y) { return "NHL " + y; },
    minYear: 2020, maxYear: CURRENT_YEAR,
    changes: {
      2020: { removed: ["Michigan / Lacrosse Goal","Between-the-Legs","Short-Side Snipe"], notes: "Pre-Frostbite engine. Simpler deking system." },
      2021: { removed: ["Michigan / Lacrosse Goal","Between-the-Legs"], notes: "HUT Rush mode. Still Ignite engine on PS4." },
      2022: { removed: ["Michigan / Lacrosse Goal"], notes: "X-Factor abilities introduced. Superstar abilities debut." },
      2023: { notes: "Frostbite engine debut. Last Chance Puck movement. Michigan goal added." },
      2024: { notes: "Exhaust Engine for pressure-based gameplay. Vision passing." },
      2025: { notes: "Next-gen ice physics. Improved goalie AI." },
    }
  },
  wwe2k: {
    nameFormat: function(y) { return "WWE 2K" + String(y).slice(-2); },
    minYear: 2020, maxYear: parseInt("20" + NEXT_YEAR),
    changes: {
      2020: { removed: ["Payback Abilities","OMG Moment"], notes: "WWE 2K20. Buggy launch. Pre-rework era." },
      2022: { added: [{level:"intermediate",section:"Combat",title:"Combo System (New)",controls:["□ → □ → △ etc."],desc:"2K22 introduced a new combo-based combat system replacing the simulation style.",why:"Faster, more arcade-like combat. Completely new feel from 2K20."}], notes: "WWE 2K22. Complete gameplay overhaul. New combo system. MyGM mode." },
      2023: { notes: "War Games match type. Improved WarGames. Payback abilities expanded." },
      2024: { notes: "Ambulance match. Casket match. Expanded match types." },
      2025: { notes: "MyRise upgrades. Cross-platform play." },
    }
  }
};
