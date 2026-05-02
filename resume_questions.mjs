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

const genAI = new GoogleGenerativeAI(API_KEY);
// Switch to gemini-1.5-pro-latest for higher rate limits
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

const REMAINING_LETTERS = ['ل', 'ن', 'هـ', 'و', 'ي'];

// Read existing questions
let existingQuestions = [];
try {
    const bgContent = fs.readFileSync('questions.js', 'utf8');
    const match = bgContent.match(/const questionBank = \[(.*)\];/s);
    if(match) {
        existingQuestions = JSON.parse('[' + match[1] + ']');
        console.log("Loaded " + existingQuestions.length + " existing questions.");
    }
} catch (e) {
    console.error("Failed to read existing questions");
}

let newQuestions = [];

const promptTemplate = (letter) => `
أنت خبير في كتابة أسئلة مسابقة "حروف" الثقافية المرموقة.
المطلوب منك كتابة 50 سؤال معلومات عامة بحيث تبدأ إجابة كل سؤال منها بحرف (${letter}) حصراً!

القواعد:
1. الجواب كلمة واحدة أو كلمتين على الأكثر، والكلمة الأولى الأساسية يجب أن تبدأ بحرف (${letter}).
2. بدون وضع "الـ" التعريف في البداية (مثال: نسر وليس النسر).
3. اكتب 50 سؤالاً بالضبط، لا أقل. 
4. لا تضع خيارات، ولا مستويات صعوبة. سؤال مباشر.
5. استلهم من أمثلة البرنامج: "حزمة دقيقة من الضوء تنطلق في استقامة واحدة من مصدر الضوء؟ الجواب: شعاع".
6. يجب أن تغطي الأسئلة مجالات (لغة، علوم، جغرافيا، تاريخ).
7. اخرج النتيجة على صيغة مصفوفة JSON تحتوي على كائنات بخصائص: text, answer, category.
`;

const delay = ms => new Promise(res => setTimeout(res, ms));

async function main() {
    for (let letter of REMAINING_LETTERS) {
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
                
                newQuestions.push(...json);
                success = true;
                console.log(`   Success! Collected ${json.length} questions for ${letter}.`);
                await delay(3500); 
            } catch(e) {
                attempts++;
                console.log(`   Error for letter ${letter}, attempt ${attempts}: `, e.message);
                await delay(6000 * attempts);
            }
        }
    }
    
    // Save to questions.js appended
    const combinedQuestions = [...existingQuestions, ...newQuestions];
    const fileContent = "const questionBank = " + JSON.stringify(combinedQuestions, null, 4) + ";";
    fs.writeFileSync('questions.js', fileContent, 'utf8');
    console.log("\n==================================");
    console.log("Successfully appended! Total questions now: " + combinedQuestions.length);
    console.log("==================================");
}

main();
