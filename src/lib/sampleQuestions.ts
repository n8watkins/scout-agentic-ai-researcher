/** "Surprise me" sample research questions — meaty enough to need the loop. */
export const SAMPLE_QUESTIONS = [
  'What are the leading approaches to long-context LLMs in 2025, and how do they compare?',
  'Is nuclear power making a comeback in Europe? What changed recently?',
  'What are the health trade-offs of intermittent fasting, according to recent studies?',
  'How are major car makers approaching solid-state EV batteries right now?',
  'What caused the most recent shifts in global coffee prices?',
  'What is the current scientific consensus on microplastics and human health?',
  'How do the latest Mars rovers differ from earlier missions?',
  'What are the most promising carbon-capture technologies being deployed today?',
];

export function randomSampleQuestion(exclude?: string): string {
  const pool = exclude ? SAMPLE_QUESTIONS.filter((q) => q !== exclude) : SAMPLE_QUESTIONS;
  return pool[Math.floor(Math.random() * pool.length)];
}
