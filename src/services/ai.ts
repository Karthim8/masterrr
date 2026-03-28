import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface PolysemyChallenge {
  meaning: string;
  sentence: string;
  correct: string;
  distractors: string[];
  qualityScore?: number; // Simulated LLM-as-judge score
}

export interface WordData {
  word: string;
  senses: PolysemyChallenge[];
}

export async function generateChallenge(word: string, model: string): Promise<WordData> {
  if (model === 'gemini') {
    return generateWithGemini(word);
  } else {
    // Simulate other models (Mistral, Sonar)
    return simulateOtherModels(word, model);
  }
}

async function generateWithGemini(word: string): Promise<WordData> {
  const schema = {
    type: Type.OBJECT,
    properties: {
      word: { type: Type.STRING },
      senses: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            meaning: { type: Type.STRING, description: "The specific meaning/sense of the word (e.g., 'to read (Verb)')" },
            sentence: { type: Type.STRING, description: "A Tamil sentence using the word in this sense, but with the word replaced by '___'." },
            correct: { type: Type.STRING, description: "The correct Tamil word (properly conjugated) to fill the blank." },
            distractors: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3 grammatically correct but semantically wrong Tamil words for the blank."
            }
          },
          required: ["meaning", "sentence", "correct", "distractors"]
        }
      }
    },
    required: ["word", "senses"]
  };

  const prompt = `You are an expert Tamil linguist and game designer.
${word.includes(' ') 
  ? `The user provided this sentence: "${word}". 
     1. Identify a polysemous (ambiguous) Tamil word within this sentence.
     2. Generate a polysemy challenge for that specific word.
     3. Ensure one of the senses uses the original sentence provided by the user.`
  : `Generate a polysemy challenge for the ambiguous Tamil word: "${word}".`}

Identify at least 5 distinct meanings/senses of the target word.
For each sense, create a sentence where the word is used, but replace the word with '___'.
Provide the correct conjugated form of the word to fill the blank.
Provide 3 'smart distractors' that are grammatically correct in Tamil but semantically nonsensical in that specific sentence.
Ensure high quality and no hallucinations.`;

  let lastError: any = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature: 0.7,
        }
      });

      const data = JSON.parse(response.text || "{}");
      
      // Simulate LLM-as-judge quality scoring (Technique 3)
      if (data.senses) {
        data.senses = data.senses.map((sense: any) => ({
          ...sense,
          qualityScore: Math.floor(Math.random() * 15) + 85 // 85-99 score
        }));
      }
      
      return data as WordData;
    } catch (error: any) {
      lastError = error;
      // If it's a 429 (Quota), wait and retry
      if (error?.status === 'RESOURCE_EXHAUSTED' || error?.code === 429) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}

async function simulateOtherModels(word: string, model: string): Promise<WordData> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Provide fallback data for demo words
  if (word === 'படி') {
    return {
      word: 'படி',
      senses: [
        {
          meaning: 'to read (Verb)',
          sentence: 'அவன் தேர்வுக்காகப் பாடம் ___.',
          correct: 'படித்தான்',
          distractors: ['ஏறினார்', 'அளக்கிறாள்', 'படிந்தது'],
          qualityScore: 92
        },
        {
          meaning: 'step/stair (Noun)',
          sentence: 'கோவில் ___ உயரமாக இருந்தது.',
          correct: 'படியில்',
          distractors: ['படி', 'படிப்பில்', 'படிப்பு'],
          qualityScore: 88
        }
      ]
    };
  } else if (word === 'கல்') {
    return {
      word: 'கல்',
      senses: [
        {
          meaning: 'stone (Noun)',
          sentence: 'சிற்பி ___ சிலையாக செதுக்கினார்.',
          correct: 'கல்லை',
          distractors: ['கற்பதை', 'கல்விக்கு', 'கல்லில்'],
          qualityScore: 95
        },
        {
          meaning: 'to learn (Verb)',
          sentence: 'நல்ல பழக்கங்களை நாம் ___ வேண்டும்.',
          correct: 'கற்க',
          distractors: ['கல்லை', 'விற்க', 'நிற்க'],
          qualityScore: 91
        }
      ]
    };
  } else if (word === 'ஆறு') {
    return {
      word: 'ஆறு',
      senses: [
        {
          meaning: 'a river (Noun)',
          sentence: 'மீனவர் ___ மீன் பிடித்தார்.',
          correct: 'ஆற்றில்',
          distractors: ['அடியில்', 'ஆறுக்கு', 'ஆறாக'],
          qualityScore: 94
        },
        {
          meaning: 'six (Number)',
          sentence: 'அவனுக்கு ___ வயது ஆகிறது.',
          correct: 'ஆறு',
          distractors: ['ஆறாக', 'ஆற்றில்', 'ஆற'],
          qualityScore: 89
        }
      ]
    };
  }
  
  // Generic fallback
  return {
    word,
    senses: [
      {
        meaning: 'Sense 1 (Noun)',
        sentence: `This is a simulated sentence for ${word} meaning 1 ___.`,
        correct: `${word}1`,
        distractors: ['Wrong1', 'Wrong2', 'Wrong3'],
        qualityScore: 90
      },
      {
        meaning: 'Sense 2 (Verb)',
        sentence: `This is a simulated sentence for ${word} meaning 2 ___.`,
        correct: `${word}2`,
        distractors: ['Wrong4', 'Wrong5', 'Wrong6'],
        qualityScore: 85
      }
    ]
  };
}
