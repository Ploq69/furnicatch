const CATEGORIES = [
  {
    id: "col01",
    title: "Suffixes –ment and –ness",
    subtitle: "3Ww.03",
    icon: "📝",
    color: "#1B3A6B",
    words: [
      { word: "enjoyment", def: "The state of feeling great pleasure" },
      { word: "amazement", def: "A feeling of great surprise" },
      { word: "illness", def: "The state of being sick" },
      { word: "kindness", def: "The quality of being friendly and caring" },
      { word: "argument", def: "A disagreement between people" },
      { word: "excitement", def: "A feeling of eager enthusiasm" },
      { word: "measurement", def: "The size or amount of something" },
      { word: "foolishness", def: "A lack of good sense" },
      { word: "entertainment", def: "Something that provides amusement" },
      { word: "happiness", def: "The state of feeling great pleasure" }
    ]
  },
  {
    id: "col02",
    title: "Suffixes –ful and –less",
    subtitle: "3Ww.03",
    icon: "✨",
    color: "#2E5A9E",
    words: [
      { word: "fearless", def: "Without fear; brave" },
      { word: "beautiful", def: "Pleasing to look at" },
      { word: "careless", def: "Not giving enough attention" },
      { word: "thankful", def: "Feeling grateful" },
      { word: "sleepless", def: "Without sleep" },
      { word: "powerful", def: "Having great strength" },
      { word: "harmless", def: "Not able to cause harm" },
      { word: "dreadful", def: "Very bad or unpleasant" },
      { word: "useless", def: "Not able to be used" },
      { word: "painful", def: "Causing physical or emotional pain" }
    ]
  },
  {
    id: "col03",
    title: "Suffixes –ous and –ly",
    subtitle: "3Ww.03",
    icon: "💡",
    color: "#E8734A",
    words: [
      { word: "brightly", def: "In a bright way" },
      { word: "enormous", def: "Extremely large" },
      { word: "curious", def: "Eager to learn or know" },
      { word: "quietly", def: "In a quiet manner" },
      { word: "dangerous", def: "Able to cause harm" },
      { word: "bravely", def: "In a brave way" },
      { word: "famous", def: "Known by many people" },
      { word: "angrily", def: "In an angry manner" },
      { word: "happily", def: "In a happy way" },
      { word: "mostly", def: "For the most part" }
    ]
  },
  {
    id: "col04",
    title: "Prefixes un–, dis–, and mis–",
    subtitle: "3Ww.03",
    icon: "🔤",
    color: "#4A7BB7",
    words: [
      { word: "dismiss", def: "To send away or remove from a job" },
      { word: "disobey", def: "To refuse to follow rules" },
      { word: "misfortune", def: "Bad luck" },
      { word: "unfair", def: "Not fair or just" },
      { word: "unhappy", def: "Not happy; sad" },
      { word: "dishonest", def: "Not truthful" },
      { word: "dislike", def: "To not like something" },
      { word: "unnecessary", def: "Not needed" },
      { word: "unusual", def: "Not common or ordinary" },
      { word: "mismanage", def: "To manage badly" }
    ]
  },
  {
    id: "col05",
    title: "Irregular Plurals",
    subtitle: "3Ww.02",
    icon: "🔢",
    color: "#142A4D",
    words: [
      { word: "children", singular: "child", def: "More than one young person" },
      { word: "mice", singular: "mouse", def: "More than one small rodent" },
      { word: "watches", singular: "watch", def: "More than one timepiece" },
      { word: "roofs", singular: "roof", def: "More than one top of a building" },
      { word: "people", singular: "person", def: "More than one human being" },
      { word: "teeth", singular: "tooth", def: "More than one tooth" },
      { word: "fish", singular: "fish", def: "More than one fish" },
      { word: "feet", singular: "foot", def: "More than one foot" },
      { word: "leaves", singular: "leaf", def: "More than one leaf" },
      { word: "men", singular: "man", def: "More than one adult male" }
    ]
  }
];

// Audio paths helper
function getAudioPath(categoryId, word, type) {
  const safeWord = word.toLowerCase().replace(/[^a-z0-9]/g, "_");
  return `audio/${categoryId}/${safeWord}_${type}.mp3`;
}

function getSingularAudioPath(categoryId, singularWord) {
  const safeWord = singularWord.toLowerCase().replace(/[^a-z0-9]/g, "_");
  return `audio/${categoryId}/${safeWord}_en_singular.mp3`;
}
