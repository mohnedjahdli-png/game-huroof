import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

const envPath = path.join('..', 'ai-speakup', '.env.local');
let API_KEY = '';
try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const keyLine = envContent.split('\n').find(line => line.startsWith('GOOGLE_GENERATIVE_AI_API_KEY='));
    API_KEY = keyLine ? keyLine.split('=')[1].trim() : '';
} catch (e) {
    console.error("Could not read .env.local file:", e.message);
    process.exit(1);
}

if (!API_KEY) {
    console.error("API Key not found!");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash", 
    generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    text: { type: SchemaType.STRING },
                    answer: { type: SchemaType.STRING },
                    category: { type: SchemaType.STRING }
                },
                required: ["text", "answer", "category"]
            }
        }
    }
});

const ARABIC_LETTERS = ['أ', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'هـ', 'و', 'ي'];

let allQuestions = [];

const promptTemplate = (letter) => `
أنت خبير في كتابة أسئلة مسابقة "حروف" الثقافية المرموقة.
المطلوب منك الآن كتابة 50 سؤال معلومات عامة وثقافة بحيث تبدأ إجابة كل سؤال منها بحرف (${letter}) حصراً!

القواعد الصارمة جداً:
1. يجب أن تكون الإجابة مكونة من كلمة واحدة أو كلمتين على الأكثر، والكلمة الأولى الأساسية يجب أن تبدأ بحرف (${letter}). بدون وضع "الـ" التعريف في البداية (مثال لحرف السين: سحابة وليس السحابة).
2. لا تكرر الأسئلة.
3. اكتب 50 سؤالاً بالضبط، لا أقل. 
4. استلهم من أمثلة البرنامج: "حزمة دقيقة من الضوء تنطلق في استقامة واحدة من مصدر الضوء؟ الجواب: شعاع" (لحرف الشين).
5. يجب أن تغطي الأسئلة مجالات متنوعة (لغة، علوم، جغرافيا، تاريخ، رياضة، ثقافة عامة، إسلاميات، طب).
6. السؤال يكون واضحاً مباشراً كما في مسابقات التلفزيون الراقية. لا تضع "مستوى صعوبة".
7. اخرج النتيجة على صيغة مصفوفة JSON تحتوي على كائنات بخصائص: text, answer, category.
`;

const delay = ms => new Promise(res => setTimeout(res, ms));

async function main() {
    console.log("Starting question generation. This will take roughly 3-4 minutes.");
    for (let letter of ARABIC_LETTERS) {
        let cleanLetter = letter === 'هـ' ? 'ه' : letter;
        console.log(`\n-> Generating 50 questions for letter ${letter}...`);
        let success = false;
        let attempts = 0;
        
        while(!success && attempts < 4) {
            try {
                const result = await model.generateContent(promptTemplate(cleanLetter));
                const response = await result.response;
                const text = response.text();
                const json = JSON.parse(text);
                
                if(json.length < 30) {
                   console.log(`   Warning: Letter ${letter} only produced ${json.length} questions.`);
                }
                allQuestions.push(...json);
                success = true;
                console.log(`   Success! Collected ${json.length} questions for ${letter}.`);
                await delay(3500); // Wait between valid calls
            } catch(e) {
                attempts++;
                console.log(`   Error for letter ${letter}, attempt ${attempts}: `, e.message);
                await delay(6000 * attempts);
            }
        }
        if(!success) {
            console.log(`   [FAILED] Could not generate for letter ${letter} after multiple attempts.`);
        }
    }
    
    // Save to questions.js
    const fileContent = "const questionBank = " + JSON.stringify(allQuestions, null, 4) + ";";
    fs.writeFileSync('questions.js', fileContent, 'utf8');
    console.log("\n==================================");
    console.log("Completed successfully! Total questions generated: " + allQuestions.length);
    console.log("==================================");
}

main();
