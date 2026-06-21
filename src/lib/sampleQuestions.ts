/**
 * Two separate pools:
 *  - SUGGESTIONS  → the chips under the input (a random subset shows each reload).
 *  - SAMPLE_QUESTIONS → the "Surprise me" pool (no-repeat picker).
 * Kept distinct so the chips and Surprise me feel like different idea sources.
 */

/** Short suggestion chips: a label to show + the full question to run. */
export const SUGGESTIONS: { label: string; q: string }[] = [
  { label: 'Solid-state EV batteries', q: 'How are major car makers approaching solid-state EV batteries right now?' },
  { label: 'Long-context LLMs', q: 'What are the leading approaches to long-context LLMs, and how do they compare?' },
  { label: 'Microplastics & health', q: 'What is the current scientific consensus on microplastics and human health?' },
  { label: 'Nuclear in Europe', q: 'Is nuclear power making a comeback in Europe? What changed recently?' },
  { label: 'Coffee prices', q: 'What caused the most recent shifts in global coffee prices?' },
  { label: 'Carbon capture', q: 'What are the most promising carbon-capture technologies being deployed today?' },
  { label: 'Mars rovers', q: 'How do the latest Mars rovers differ from earlier missions?' },
  { label: 'Intermittent fasting', q: 'What are the health trade-offs of intermittent fasting, per recent studies?' },
  { label: 'AI agents', q: 'What is the current state of AI agents, and where are they actually useful?' },
  { label: 'Quantum computing', q: 'What are the biggest unsolved problems in quantum computing right now?' },
  { label: 'Nuclear fusion', q: "What's the state of nuclear fusion, and how close is net-positive energy?" },
  { label: 'GLP-1 drugs', q: 'How effective are GLP-1 drugs like Ozempic for conditions beyond diabetes?' },
  { label: 'Green hydrogen', q: 'How viable is green hydrogen as an energy source today?' },
  { label: 'Cultivated meat', q: "What's the state of lab-grown meat and its path to market?" },
  { label: 'Perovskite solar', q: 'How are perovskite solar cells changing the economics of solar power?' },
  { label: 'CRISPR therapies', q: 'What are the latest CRISPR-based therapies approved or in trials?' },
  { label: 'Antibiotic resistance', q: 'How serious is antibiotic resistance, and what new treatments are emerging?' },
  { label: 'Semiconductor supply', q: "What's driving the global semiconductor supply-chain shifts?" },
  { label: 'Brain-computer interfaces', q: 'How do brain-computer interfaces work today, and what can they do?' },
  { label: 'Sleep & health', q: 'What does the science say about sleep and long-term health?' },
  { label: 'Urban heat', q: 'How are cities adapting to extreme heat and urban heat islands?' },
  { label: 'Longevity research', q: "What's the current evidence behind longevity and anti-aging research?" },
  { label: 'AI drug discovery', q: 'How is AI being used in drug discovery, and is it delivering results?' },
  { label: 'AI energy use', q: "What's the real environmental impact of training large AI models?" },
  { label: 'Electric aviation', q: 'How are electric and eVTOL aircraft progressing?' },
  { label: 'Deep-sea mining', q: "What's the state of deep-sea mining and its ecological risks?" },
  { label: 'Vertical farming', q: 'How does vertical farming compare to traditional agriculture?' },
  { label: 'Water scarcity', q: 'What are the most credible plans to address global water scarcity?' },
  { label: 'EU AI Act', q: 'How is the EU AI Act expected to affect AI development globally?' },
  { label: 'Social media & teens', q: "What does research show about social media's effect on teen mental health?" },
  { label: 'Superconductors', q: 'How close are we to practical room-temperature superconductors?' },
  { label: 'Battery recycling', q: "What's the current approach to recycling lithium-ion batteries at scale?" },
  { label: 'Wildfire management', q: 'How is wildfire management changing as fires grow more severe?' },
  { label: 'De-extinction', q: "What's the state of de-extinction efforts like the woolly mammoth?" },
  { label: 'Geothermal energy', q: 'How is geothermal energy evolving with new drilling techniques?' },
  { label: 'Dark matter', q: 'What are the leading theories on what dark matter actually is?' },
  { label: 'Plastic recycling', q: 'How is plastic recycling technology improving, and what are its limits?' },
  { label: 'Bee decline', q: "What's driving declines in bee and insect populations, and what helps?" },
  { label: 'Desalination', q: 'How do modern desalination technologies compare on cost and energy?' },
  { label: 'Robotaxis', q: "What's the current state of autonomous vehicles and robotaxis?" },
  { label: 'Ocean acidification', q: 'How is ocean acidification affecting marine ecosystems?' },
  { label: 'Ultra-processed foods', q: 'What does recent research say about ultra-processed foods and health?' },
  { label: 'CBDCs', q: 'How are central banks approaching digital currencies (CBDCs)?' },
  { label: 'Reusable rockets', q: "What's the latest on reusable rockets and the cost of reaching orbit?" },
  { label: 'Carbon offsets', q: 'How effective are current carbon offset and credit schemes?' },
  { label: 'AI in diagnostics', q: "What's the state of AI in medical diagnostics and imaging?" },
  { label: 'Remote work', q: 'How is the shift to hybrid work affecting productivity?' },
  { label: 'Next-gen batteries', q: 'What are the most promising battery chemistries beyond lithium-ion?' },
  { label: 'Gut microbiome', q: 'What does research say about the gut microbiome and mental health?' },
  { label: 'Space tourism', q: "What's the current state and outlook of commercial space tourism?" },
];

/** "Surprise me" pool — a distinct set of meaty questions (history/econ/science). */
export const SAMPLE_QUESTIONS = [
  'What were the main causes of the 2008 financial crisis, in plain terms?',
  'How did the Silk Road shape trade and culture across Eurasia?',
  "What's the current scientific understanding of how memory is stored in the brain?",
  'Why did the Roman Empire actually fall, according to historians?',
  'How is inflation measured, and why do estimates differ?',
  'What drove the rapid decline in global extreme poverty since 1990?',
  'How do vaccines train the immune system, step by step?',
  'What is the evidence for and against the existence of dark energy?',
  'How did the printing press change European society?',
  'What are the leading explanations for the Fermi paradox?',
  'How does the modern global container-shipping system work?',
  'What causes ice ages, and where are we in that cycle?',
  'How did Japan rebuild its economy so quickly after WWII?',
  'What is the current understanding of how general anesthesia works?',
  'Why are some languages dying out, and can they be revived?',
  'How do modern weather forecasts achieve their accuracy?',
  'What were the real consequences of the Green Revolution in agriculture?',
  'How does the immune system distinguish self from non-self?',
  "What's driving the global decline in birth rates?",
  'How did the 1918 flu pandemic compare to COVID-19?',
  'What is the current scientific view on consciousness?',
  'How do central banks actually control interest rates?',
  'What caused the Cambrian explosion of animal life?',
  'How does GPS work, and why does it need relativity?',
  'What were the long-term effects of the Marshall Plan?',
  'How do antibiotics actually kill bacteria?',
  'What explains the productivity slowdown in developed economies?',
  'How did early humans first migrate across the globe?',
  'What is the science behind whether earthquakes can be predicted?',
  'How does the stock market actually allocate capital?',
  'What caused the dot-com bubble, and what lessons stuck?',
  'How do plants communicate with each other?',
  'What is the current understanding of why we sleep and dream?',
  'How did container shipping reshape globalization?',
  'What are the leading theories on the origin of life?',
  'How is GDP measured, and what does it miss?',
  'How does herd immunity work, mathematically?',
  'What drove the collapse of the Late Bronze Age civilizations?',
  'How do black holes form, and what happens near them?',
  'What does the evidence say about whether minimum-wage hikes cut employment?',
  'How was smallpox actually eradicated?',
  'What explains the rise and fall of historical reserve currencies?',
  'How does the brain process language?',
  'What are the main drivers of biodiversity loss worldwide?',
  "How did the internet's core protocols (TCP/IP) come to dominate?",
  'What is the current scientific consensus on the health effects of alcohol?',
  'How do economies recover from hyperinflation?',
  'What caused the Irish Potato Famine, and who bears responsibility?',
  'How do mRNA vaccines differ from traditional vaccines?',
  'What were the economic effects of the Black Death in Europe?',
];

// No-repeat memory for "Surprise me" within a session.
let recentlyUsed: string[] = [];

/** A random "Surprise me" question that avoids repeats until the pool cycles. */
export function randomSampleQuestion(): string {
  const fresh = SAMPLE_QUESTIONS.filter((q) => !recentlyUsed.includes(q));
  const pool = fresh.length > 0 ? fresh : SAMPLE_QUESTIONS;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  recentlyUsed.push(pick);
  if (recentlyUsed.length >= SAMPLE_QUESTIONS.length) recentlyUsed = [pick];
  return pick;
}

/** N random distinct items from a list (partial Fisher–Yates shuffle). */
export function sampleN<T>(list: T[], n: number): T[] {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, Math.min(n, a.length));
}
