import { neon } from '@neondatabase/serverless';
import { WordData, PolysemyChallenge } from './ai';

// Neon Connection String provided by the user
const sql = neon("postgresql://neondb_owner:npg_j7LQSwPmqs8M@ep-ancient-sun-a13c1btw-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require");

/**
 * Initialize the database tables if they don't exist.
 */
export async function initDB() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS polysemy_challenges (
        id SERIAL PRIMARY KEY,
        word TEXT NOT NULL,
        meaning TEXT NOT NULL,
        sentence TEXT NOT NULL,
        correct TEXT NOT NULL,
        distractors JSONB NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("Database initialized with status-based moderation.");
  } catch (error) {
    console.error("Failed to initialize database:", error);
  }
}

/**
 * Fetch a verified challenge for a specific word from the cache.
 */
export async function getCachedChallenge(word: string): Promise<WordData | null> {
  try {
    const results = await sql`SELECT * FROM polysemy_challenges WHERE lower(word) = lower(${word}) AND status = 'verified'`;

    if (results.length === 0) return null;

    // Group rows by word
    const senses: PolysemyChallenge[] = results.map((row: any) => ({
      meaning: row.meaning,
      sentence: row.sentence,
      correct: row.correct,
      distractors: row.distractors,
      qualityScore: 100 
    }));

    return {
      word: results[0].word,
      senses
    };
  } catch (error) {
    console.error("Database cache fetch error:", error);
    return null;
  }
}

/**
 * Save a newly generated challenge to the pending moderation queue.
 */
export async function savePendingChallenge(data: WordData) {
  try {
    for (const sense of data.senses) {
      await sql`
        INSERT INTO polysemy_challenges (word, meaning, sentence, correct, distractors, status) 
        VALUES (${data.word}, ${sense.meaning}, ${sense.sentence}, ${sense.correct}, ${JSON.stringify(sense.distractors)}, 'pending')
      `;
    }
    console.log(`Saved pending challenge for: ${data.word}`);
  } catch (error) {
    console.error("Database save error:", error);
  }
}

/**
 * Get all challenges awaiting admin approval.
 */
export async function getPendingChallenges() {
  try {
    return await sql`SELECT * FROM polysemy_challenges WHERE status = 'pending' ORDER BY created_at DESC`;
  } catch (error) {
    console.error("Database fetch pending error:", error);
    return [];
  }
}

/**
 * Marks a specific challenge as verified.
 */
export async function approveChallenge(id: number) {
  try {
    await sql`UPDATE polysemy_challenges SET status = 'verified' WHERE id = ${id}`;
  } catch (error) {
    console.error("Database verification error:", error);
  }
}

/**
 * Delete a rejected challenge by ID.
 */
export async function deleteChallenge(id: number) {
  try {
    await sql`DELETE FROM polysemy_challenges WHERE id = ${id}`;
  } catch (error) {
    console.error("Database delete error:", error);
  }
}
