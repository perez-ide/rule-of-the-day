const quotes = [
  { text: "The righteous may fall seven times, but they rise again.", author: "Proverbs 24:16" },
  { text: "Begin at once to live, and count each separate day as a separate life.", author: "Seneca" },
  { text: "Trust in the Lord with all your heart and lean not on your own understanding.", author: "Proverbs 3:5" },
  { text: "He who began a good work in you will carry it on to completion.", author: "Philippians 1:6" },
  { text: "Obedience is the key to every door.", author: "A.W. Tozer" },
  { text: "Do not be conformed to this world, but be transformed by the renewal of your mind.", author: "Romans 12:2" },
  { text: "Sow a thought, reap an action; sow an action, reap a habit; sow a habit, reap a character.", author: "Charles Reade" },
  { text: "Whether you think you can or you think you can't, you're right.", author: "Marcus Aurelius" },
  { text: "Be still, and know that I am God.", author: "Psalm 46:10" },
  { text: "The only way out is through.", author: "Robert Frost" },
  { text: "Let us not become weary in doing good, for at the proper time we will reap a harvest.", author: "Galatians 6:9" },
  { text: "First say to yourself what you would be; then do what you have to do.", author: "Epictetus" },
  { text: "The steadfast love of the Lord never ceases; his mercies are new every morning.", author: "Lamentations 3:22-23" },
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { text: "I can do all things through him who strengthens me.", author: "Philippians 4:13" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "My grace is sufficient for you, for my power is made perfect in weakness.", author: "2 Corinthians 12:9" },
  { text: "The impediment to action advances action. What stands in the way becomes the way.", author: "Marcus Aurelius" },
  { text: "Seek first the kingdom of God and his righteousness, and all these things will be added to you.", author: "Matthew 6:33" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
  { text: "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.", author: "Joshua 1:9" },
  { text: "Therefore do not worry about tomorrow, for tomorrow will worry about itself. Each day has enough trouble of its own.", author: "Matthew 6:34" }
];

const COOLDOWN_MS = 3600000;

let lastQuoteTime = 0;
let lastIndex = -1;

function getQuote() {
  const now = Date.now();
  if (now - lastQuoteTime < COOLDOWN_MS) {
    return null;
  }

  let idx;
  do {
    idx = Math.floor(Math.random() * quotes.length);
  } while (idx === lastIndex && quotes.length > 1);
  lastIndex = idx;
  lastQuoteTime = now;
  return quotes[idx];
}

export { getQuote };
