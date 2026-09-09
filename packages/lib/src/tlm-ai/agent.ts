import OpenAI from 'openai';
import { tools, availableTools } from './tools.js';
import logger from '../utils/logger.js';

function compactConversation(messages: any[], maxUserTurns = 4, maxItemChars = 12_000) {
    const systemMessages = messages.filter((message) => message.role === 'system');
    const userIndexes = messages.reduce<number[]>((indexes, message, index) => {
        if (message.role === 'user') indexes.push(index);
        return indexes;
    }, []);
    const start = userIndexes.length > maxUserTurns
        ? userIndexes[userIndexes.length - maxUserTurns]
        : 0;
    const system = systemMessages.length <= 3
        ? systemMessages
        : [systemMessages[0], ...systemMessages.slice(-2)];
    const recent = messages.slice(start).filter((message) => message.role !== 'system');

    return [...system, ...recent].map((message) => {
        if (typeof message.output === 'string' && message.output.length > maxItemChars) {
            return { ...message, output: `${message.output.slice(0, maxItemChars)}\n[truncated]` };
        }
        return message;
    });
}

function isContextWindowError(error: any) {
    const message = String(error?.message || error).toLowerCase();
    return message.includes('context window')
        || message.includes('context length')
        || message.includes('input exceeds')
        || message.includes('too many tokens');
}

export async function agent(openai: OpenAI, messages: any[], model: string = "gpt-3.5-turbo", allowedTools?: string[]) {
    const maxToolCalls = 20;
    const maxDurationMs = 30_000;
    const startedAt = Date.now();
    let toolCallCount = 0;
    const enabledTools = allowedTools?.length
        ? tools.filter((tool: any) => allowedTools.includes(tool.name))
        : tools;
    let input = compactConversation(messages);

    while (true) {
        if (toolCallCount >= maxToolCalls || Date.now() - startedAt >= maxDurationMs) {
            messages.push({
                type: 'message',
                role: 'assistant',
                status: 'completed',
                content: [{
                    type: 'output_text',
                    text: `I couldn't complete the analysis within the limit. Try a more specific question. Current limits: ${maxToolCalls} tool calls, ${maxDurationMs / 1000} seconds.`,
                }],
            });
            return;
        }

        let response;
        try {
            response = await openai.responses.create({ model, input, tools: enabledTools });
        } catch (error) {
            if (!isContextWindowError(error)) throw error;

            logger.warn('AI context window exceeded; retrying with a compact conversation.');
            input = compactConversation(input, 2, 6_000);
            try {
                response = await openai.responses.create({ model, input, tools: enabledTools });
            } catch (retryError) {
                if (!isContextWindowError(retryError)) throw retryError;
                messages.push({
                    type: 'message',
                    role: 'assistant',
                    status: 'completed',
                    content: [{
                        type: 'output_text',
                        text: 'The conversation is too long to continue. Please start a new conversation or ask a shorter question.',
                    }],
                });
                return;
            }
        }

        messages.push(...response.output);
        input.push(...response.output);
        const functionCalls = response.output.filter((item: any) => item.type === 'function_call') as any[];
        if (functionCalls.length > 0) {
            toolCallCount += functionCalls.length;
            logger.debug("Tool calls detected:", functionCalls);

            for (const call of functionCalls) {
                const functionToCall = availableTools[call.name as keyof typeof availableTools] as any;
                let result: unknown;
                try {
                    result = functionToCall
                        ? await functionToCall(JSON.parse(call.arguments || '{}'))
                        : { error: `Unknown tool: ${call.name}` };
                } catch (error: any) {
                    logger.error(`Tool ${call.name} failed:`, error);
                    result = { error: error?.message || 'Tool execution failed' };
                }
                const toolOutput = {
                    type: 'function_call_output',
                    call_id: call.call_id,
                    output: JSON.stringify(result) ?? '',
                };
                messages.push(toolOutput);
                input.push(toolOutput);
            }
        } else {
            return;
        }
    }
}
