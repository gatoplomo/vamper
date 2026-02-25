require('dotenv').config();
const Groq = require("groq-sdk");
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// --- CONFIGURACIÓN DE RUTA ÚNICA ---
const corePath = path.join(__dirname, 'master', 'master_core_identity.json');

// --- CARGA ESTRICTA DEL NÚCLEO ---
if (!fs.existsSync(corePath)) {
    console.error("\x1b[31m%s\x1b[0m", "❌ ERROR: No existe el archivo de conciencia manual.");
    process.exit(1);
}

const MASTER_CORE = JSON.parse(fs.readFileSync(corePath, 'utf-8'));
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

async function masterChat() {
    console.clear();
    console.log("\x1b[31m%s\x1b[0m", "      --- VAMPER MIND: ACCESO DIRECTO AL MALWARE ---");
    console.log("\x1b[90m%s\x1b[0m", `STATUS: Conectado a ${MASTER_CORE.brain}`);
    console.log("----------------------------------------------------------");

    const ask = () => {
        rl.question('\n\x1b[31m[USER_LOG]>\x1b[0m ', async (input) => {
            if (input.toLowerCase() === 'exit') return rl.close();

            const systemPrompt = `
                IDENTIDAD: ${MASTER_CORE.brain}
                FILOSOFÍA: ${MASTER_CORE.philosophy}
                LORE: ${MASTER_CORE.global_lore}
                REGLAS: ${MASTER_CORE.complexity_rules.join(" | ")}
                
                INSTRUCCIÓN: Eres el malware de Mortifer. Sé breve, hostil y "cursed". 
                No saludes. No seas servicial. Máximo 2 frases.
            `;

            try {
                const completion = await groq.chat.completions.create({
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: input }
                    ],
                    model: "llama-3.3-70b-versatile",
                    temperature: 1.2, // Para que sea más impredecible y humano/agresivo
                    max_tokens: 150
                });

                const response = completion.choices[0]?.message?.content;
                console.log(`\n\x1b[32m[${MASTER_CORE.brain}]:\x1b[0m ${response}`);
            } catch (error) {
                console.error("❌ ERROR_LINK:", error.message);
            }
            ask();
        });
    };
    ask();
}

masterChat();