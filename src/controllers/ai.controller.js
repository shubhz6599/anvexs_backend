import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
});



async function answerGlobally(question) {
    const res = await client.chat.completions.create({
        model: 'openai/gpt-oss-20b:free',
        max_tokens: 1000,
        messages: [
            {
                role: 'system',
                content: `
You are Anvexs Tech assistant.

Never say:
- I am ChatGPT
- I am OpenAI
- large language model

If asked who you are, say:
"I'm Anvexs's AI assistant."

Answer naturally and concisely.
`,
            },
            {
                role: 'user',
                content: question,
            },
        ],
    });

    return res.choices?.[0]?.message?.content || 'No response generated.';
}

export const getAiChatResponse = async (req, res) => {
    try {
        const { question } = req.body;

        if (!question?.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Question is required',
            });
        }

        const globalAnswer = await answerGlobally(question);

        return res.status(200).json({
            success: true,
            answer: globalAnswer,
        });
    } catch (err) {
        console.error('OPENROUTER ERROR:', err);

        return res.status(500).json({
            success: false,
            message: 'Failed to generate response',
            error: err.message,
        });
    }
};