import OpenAI from 'openai';
import { tools, availableTools } from './tools.js';
import logger from '../utils/logger.js';


export async function agent(openai: OpenAI, messages: any[], model: string = "gpt-3.5-turbo") {
    for (let i = 0; i < 5; i++) {
        const modelResponse = await openai.chat.completions.create({
            model,
            messages,
            tools,
        });

        const { finish_reason, message } = modelResponse.choices[0];

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
                ({ name, response }, idx) => {
                    const toolCall = message.tool_calls?.[idx];
                    const params = toolCall ? JSON.parse(toolCall.function.arguments) : {};
                    return `Tool "${name}" called with parameters:\n${JSON.stringify(params, null, 2)}\nResult:\n${JSON.stringify(response, null, 2)}`;
                }
            ).join("\n\n");

            messages.push({
                role: "function",
                name: "multiple_tool_calls",
                content: resultMessage,
                timestamp: new Date().toISOString()
            });

        } else if (finish_reason === "stop") {
            messages.push({ ...message, timestamp: new Date().toISOString() });
            return;
        }
    }

    messages.push({ role: "assistant", content: "Maximum iterations reached without a suitable response. Try a more specific query.", timestamp: new Date().toISOString() });
}
