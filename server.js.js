import express from "express";
import bodyParser from "body-parser";
import fs from "fs-extra";
import path from "path";
import fetch from "node-fetch"; // pour appeler Hugging Face

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(process.cwd(), "public")));

// === FICHIER MÉMOIRE ===
const MEM_FILE = path.join(process.cwd(), "data", "memory.json");
fs.ensureFileSync(MEM_FILE);
if (!fs.existsSync(MEM_FILE)) fs.writeJsonSync(MEM_FILE, []);

// === MÉMOIRE ===
function loadMemory() {
  try {
    return fs.readJsonSync(MEM_FILE);
  } catch {
    return [];
  }
}
function saveMemory(mem) {
  fs.writeJsonSync(MEM_FILE, mem, { spaces: 2 });
}

// === FONCTION DE SIMILARITÉ ===
function sim(a, b) {
  a = a.toLowerCase();
  b = b.toLowerCase();
  let matches = 0;
  for (const w of a.split(" ")) if (b.includes(w)) matches++;
  return matches / Math.max(a.split(" ").length, 1);
}

// === APPEL HUGGING FACE ===
const HF_API = "https://api-inference.huggingface.co/models/meta-llama/Llama-3-8b";
const HF_TOKEN = "Auralis"; // 🔒 Mets ici ton vrai token Hugging Face

async function callProvider(message) {
  try {
    const response = await fetch(HF_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: message }),
    });

    const data = await response.json();

    // vérifie que la réponse contient bien du texte
    if (Array.isArray(data) && data[0]?.generated_text) {
      return data[0].generated_text;
    } else {
      console.error("Réponse inattendue :", data);
      return "🤖 Erreur lors de la génération de texte.";
    }
  } catch (err) {
    console.error("Erreur Hugging Face :", err);
    return "⚠️ Impossible de contacter le modèle Hugging Face.";
  }
}

// === ENDPOINT PRINCIPAL ===
app.post("/api/chat", async (req, res) => {
  const { message } = req.body;
  const mem = loadMemory();

  // Apprentissage manuel
  if (message.startsWith("enseigne:")) {
    const [q, a] = message.replace("enseigne:", "").split("=>");
    if (q && a) {
      mem.unshift({ q: q.trim(), a: a.trim() });
      saveMemory(mem);
      return res.json({
        reply: `✨ Auralis a appris : "${q.trim()}" → "${a.trim()}"`,
      });
    }
  }

  // Recherche d’une réponse existante
  let best = { a: "Je ne sais pas encore répondre à ça 🤔", s: 0 };
  for (const m of mem) {
    const s = sim(message, m.q);
    if (s > best.s) best = { a: m.a, s };
  }
  if (best.s > 0.2) return res.json({ reply: best.a });

  // Appel du modèle Hugging Face
  const reply = await callProvider(message);
  return res.json({ reply });
});

const PORT = 3000;
app.listen(PORT, () =>
  console.log(`🌐 Auralis est en ligne sur http://localhost:${PORT}`)
);
