const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs-extra");
const path = require("path");

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

const MEM_FILE = path.join(__dirname, "data", "memory.json");
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
        reply: `✨ Auralis a appris : "${q.trim()}" → "${a.trim()}"`
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

  // Appel du modèle (factice pour l’instant)
  const reply = await callProvider(message);
  return res.json({ reply });
});

// === COMPORTEMENT DE BASE D’AURALIS ===
async function callProvider(message) {
  const lower = message.toLowerCase();
  if (lower.includes("bonjour")) return "Salut 🌸 Je suis Auralis, ton IA locale prête à apprendre !";
  if (lower.includes("qui es")) return "Je suis Auralis — une intelligence locale, indépendante et curieuse 🤖💫";
  return (
    "Je suis Auralis, et je n’ai pas encore de réponse précise pour ça... " +
    "mais tu peux m’enseigner avec la commande : enseigne:question=>réponse"
  );
}

const PORT = 3000;
app.listen(PORT, () => console.log(`🌐 Auralis est en ligne sur http://localhost:${PORT}`));
