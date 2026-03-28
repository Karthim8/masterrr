/**
 * Tamil Speech-to-Text via Gemini multimodal API.
 * Records audio with MediaRecorder, converts to base64, and asks Gemini to transcribe.
 * This avoids Chrome's Web Speech API which requires a direct connection to Google's
 * speech servers (blocked in many network environments → "network" error).
 */

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MIME_PREFERRED_ORDER = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
];

function getSupportedMimeType(): string {
  for (const mime of MIME_PREFERRED_ORDER) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return "audio/webm"; // fallback
}

/** Converts a Blob to a base64 data string (without the data URL prefix). */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Strip off "data:audio/webm;base64," prefix
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Transcribes audio (recorded from the user's mic) to Tamil text using Gemini.
 * @param audioBlob - The recorded audio blob from MediaRecorder.
 * @param mimeType  - The MIME type of the audio blob.
 */
async function transcribeWithGemini(audioBlob: Blob, mimeType: string): Promise<string> {
  const base64Audio = await blobToBase64(audioBlob);

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: mimeType.split(";")[0], // strip codec params for Gemini
              data: base64Audio,
            },
          },
          {
            text: `Transcribe this Tamil audio exactly as spoken. 
Return ONLY the transcribed Tamil text with no explanation, no translation, no punctuation added.
If the audio is unclear or silent, return an empty string.`,
          },
        ],
      },
    ],
  });

  const text = response.text?.trim() ?? "";
  // If Gemini says something like "The audio is silent" or similar, return empty
  if (text.length < 2 || /^(the audio|no speech|silent|unclear|inaudible)/i.test(text)) {
    return "";
  }
  return text;
}

export type RecordingState = "idle" | "recording" | "processing";

export interface GeminiSTTController {
  start: () => Promise<void>;
  stop: () => void;
}

/**
 * Creates a Gemini STT controller.
 * @param onResult      - Called with the final transcribed Tamil text.
 * @param onStateChange - Called whenever recording state changes.
 * @param onError       - Called with a human-readable error message.
 * @param maxSeconds    - Auto-stop after this many seconds (default: 8).
 */
export function createGeminiSTT(
  onResult: (text: string) => void,
  onStateChange: (state: RecordingState) => void,
  onError: (msg: string) => void,
  maxSeconds = 8
): GeminiSTTController {
  let mediaRecorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let autoStopTimer: ReturnType<typeof setTimeout> | null = null;
  const chunks: BlobPart[] = [];

  async function start() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        onError("Microphone access denied. Please allow mic access in your browser.");
      } else {
        onError("Could not access microphone. " + (err.message || ""));
      }
      return;
    }

    const mimeType = getSupportedMimeType();
    chunks.length = 0;

    try {
      mediaRecorder = new MediaRecorder(stream, { mimeType });
    } catch {
      mediaRecorder = new MediaRecorder(stream); // no mimeType constraint fallback
    }

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      // Clean up the stream
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;

      if (chunks.length === 0) {
        onStateChange("idle");
        onError("No audio captured. Please try again.");
        return;
      }

      onStateChange("processing");
      const blob = new Blob(chunks, { type: mediaRecorder?.mimeType || "audio/webm" });

      try {
        const transcript = await transcribeWithGemini(blob, blob.type);
        onStateChange("idle");
        if (transcript) {
          onResult(transcript);
        } else {
          onError("No speech detected. Please try speaking clearly.");
        }
      } catch (err: any) {
        onStateChange("idle");
        console.error("Gemini STT error:", err);
        onError("Transcription failed: " + (err.message || "Unknown error"));
      }
    };

    mediaRecorder.start(100); // collect data every 100ms
    onStateChange("recording");

    // Auto-stop after maxSeconds
    autoStopTimer = setTimeout(() => {
      stop();
    }, maxSeconds * 1000);
  }

  function stop() {
    if (autoStopTimer) {
      clearTimeout(autoStopTimer);
      autoStopTimer = null;
    }
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    } else {
      // Nothing was recording
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
      onStateChange("idle");
    }
  }

  return { start, stop };
}
