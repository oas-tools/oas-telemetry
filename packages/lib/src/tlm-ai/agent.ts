import OpenAI from 'openai';
import dotenv from 'dotenv';
import { tools, availableTools } from './tools.js';
import { ChatCompletionMessageParam } from 'openai/resources/index.js';
import logger from '../utils/logger.js';
dotenv.config();

let openai: any;

try {
    openai = new OpenAI({
        apiKey: process.env.OASTLM_AI_OPENAI_API_KEY,
        dangerouslyAllowBrowser: true,
    });
} catch {
    openai = null
}

const messages: ChatCompletionMessageParam[] = [
    {
        role: "assistant",
        content:
            "You are a helpful telemetry assistant. Only use the functions you have been provided with. If the question is not related to the functions, respond with 'I cannot help with that.'. If you need to call to other agents, do so using the tools provided."
    },
];

async function agent(userInput: string) {
    messages.push({
        role: "user",
        content: userInput,
    });

    for (let i = 0; i < 5; i++) {
        const response = await (openai?.chat?.completions?.create?.({
            model: process.env.OASTLM_AI_OPENAI_MODEL_NAME || "gpt-4o-mini",
            messages: messages,
            tools: tools,
        }));

        const { finish_reason, message } = response.choices[0];

        if (finish_reason === "tool_calls" && message.tool_calls) {
            logger.debug("Tool calls detected:", message.tool_calls);

            const results = [];

            for (const toolCall of message.tool_calls) {
                const functionName = toolCall.function.name as keyof typeof availableTools;
                const functionToCall = availableTools[functionName];
                const functionArgs = JSON.parse(toolCall.function.arguments);
                const functionArgsArr: any[] = Object.values(functionArgs);

                // @ts-expect-error yes
                // eslint-disable-next-line prefer-spread
                const functionResponse = await functionToCall.apply(null, functionArgsArr);
                results.push({
                    name: functionName,
                    response: functionResponse,
                });
            }

            const resultMessage = results.map(
                ({ name, response }) =>
                    `Result from "${name}":\n${JSON.stringify(response, null, 2)}`
            ).join("\n\n");


            messages.push({
                role: "function",
                name: "multiple_tool_calls",
                content: resultMessage,
            });

        } else if (finish_reason === "stop") {
            messages.push(message);
            return message;
        }
    }

    return { content: "Se alcanzó el número máximo de iteraciones sin una respuesta adecuada. Intenta con una consulta más específica." };
}

export async function getAgentResponse(question: string) {
    const response = await agent(question);
    logger.debug("Response from agent:", response);
    return response.content;
}