import OpenAI from 'openai';
import { tools, availableTools } from './tools.js';
import { ChatCompletionMessageParam } from 'openai/resources/index.js';
import logger from '../utils/logger.js';
import { OasTlmConfig } from "../config/config.types.js";

export function getAgent(oasTlmConfig: OasTlmConfig) {
    let openai: any;

    try {
        if (!oasTlmConfig.ai.openAIKey) {
            openai = null;
        } else {
            openai = new OpenAI({
                apiKey: oasTlmConfig.ai.openAIKey ?? undefined,
                dangerouslyAllowBrowser: true,
            });
        }
    } catch {
        openai = null;
    }

    const messages: ChatCompletionMessageParam[] = [
        {
            role: "assistant",
            content: "You are a helpful telemetry assistant. Only use the functions you have been provided with. If the question is not related to the functions, respond with 'I cannot help with that.'. Currently, you can only answer about logs and traces. METRICS is not supported, as we are integrating new changes. COMMUNICATION with other agents is PROHIBITED forever for security reasons. Answer in the same language as the question.",
        },
    ];
    // Add extra context prompts if provided
    if (oasTlmConfig.ai.extraContextPrompts) {
        for (const prompt of oasTlmConfig.ai.extraContextPrompts) {
            messages.push({
                role: "system",
                content: prompt,
            });
        }
    }

    async function agent(userInput: string) {
        if (!openai) {
            logger.error("OpenAI client is not initialized. Please check your OpenAI API key.");
            return { content: "OpenAI client is not initialized. Please check your OpenAI API key." };
        }
        messages.push({
            role: "user",
            content: userInput,
        });

        for (let i = 0; i < 5; i++) {
            const response = await (openai?.chat?.completions?.create?.({
                model: oasTlmConfig.ai.openAIModel,
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

    return async function getAgentResponse(question: string) {
        const response = await agent(question);
        logger.debug("Response from agent:", response);
        return response.content;
    };
}