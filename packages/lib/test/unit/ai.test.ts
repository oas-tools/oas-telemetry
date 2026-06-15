import { vi, describe, expect, it, beforeAll, afterAll } from "vitest";
import express from "express";
import axios from "axios";
import { getAIRoutes } from "../../src/tlm-ai/aiRoutes";
import { Server } from "http";

vi.mock("openai", () => {
    return {
        default: class MockOpenAI {
            chat = {
                completions: {
                    create: vi.fn().mockResolvedValue({
                        choices: [
                            {
                                index: 0,
                                message: {
                                    role: "assistant",
                                    content: "Mocked AI Response",
                                },
                                finish_reason: "stop",
                            },
                        ],
                    }),
                },
            };
        },
    };
});

describe("AI API Unit/Integration Tests", () => {
    let app: express.Express;
    let server: Server;
    let port: number;
    let baseUrl: string;

    const mockConfig: any = {
        ai: {
            openAIKey: "mock-key",
            openAIModel: "gpt-3.5-turbo",
            extraContextPrompts: []
        }
    };

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use("/ai", getAIRoutes(mockConfig));

        return new Promise<void>((resolve) => {
            server = app.listen(0, () => {
                const addr = server.address();
                if (addr && typeof addr !== "string") {
                    port = addr.port;
                    baseUrl = `http://localhost:${port}/ai`;
                }
                resolve();
            });
        });
    });

    afterAll(() => {
        return new Promise<void>((resolve) => {
            server.close(() => resolve());
        });
    });

    it("should report AI service as healthy", async () => {
        const response = await axios.get(`${baseUrl}/chat/health`);
        expect(response.status).toBe(200);
        expect(response.data).toBe("AI service is healthy");
    });

    it("should create, list, retrieve, message, and delete a conversation", async () => {
        // 1. Create conversation
        const createResponse = await axios.post(`${baseUrl}/chat`);
        expect(createResponse.status).toBe(201);
        expect(createResponse.data).toHaveProperty("id");
        expect(Array.isArray(createResponse.data.messages)).toBe(true);
        const conversationId = createResponse.data.id;

        // 2. List conversations
        const listResponse = await axios.get(`${baseUrl}/chat`);
        expect(listResponse.status).toBe(200);
        expect(Array.isArray(listResponse.data)).toBe(true);
        expect(listResponse.data.some((c: any) => c.id === conversationId)).toBe(true);

        // 3. Get conversation history
        const historyResponse = await axios.get(`${baseUrl}/chat/${conversationId}`);
        expect(historyResponse.status).toBe(200);
        expect(historyResponse.data.id).toBe(conversationId);

        // 4. Send message
        const messagePayload = { content: "Tell me about this API" };
        const messageResponse = await axios.post(`${baseUrl}/chat/${conversationId}/message`, messagePayload);
        expect(messageResponse.status).toBe(200);
        expect(Array.isArray(messageResponse.data)).toBe(true);
        expect(messageResponse.data.some((m: any) => m.content === "Mocked AI Response")).toBe(true);

        // 5. Delete conversation
        const deleteResponse = await axios.delete(`${baseUrl}/chat/${conversationId}`);
        expect(deleteResponse.status).toBe(204);

        // 6. Verify deleted (should return 404)
        const getDeletedResponse = await axios.get(`${baseUrl}/chat/${conversationId}`).catch((err) => err.response);
        expect(getDeletedResponse.status).toBe(404);
    });

    it("should return 400 when sending message with missing content", async () => {
        const createResponse = await axios.post(`${baseUrl}/chat`);
        const conversationId = createResponse.data.id;

        const response = await axios.post(`${baseUrl}/chat/${conversationId}/message`, {}).catch((err) => err.response);
        expect(response.status).toBe(400);
        expect(response.data.error).toBe("Missing content");

        await axios.delete(`${baseUrl}/chat/${conversationId}`);
    });

    it("should return 404 when sending message to a non-existent conversation", async () => {
        const response = await axios.post(`${baseUrl}/chat/non-existent-conv/message`, { content: "hello" }).catch((err) => err.response);
        expect(response.status).toBe(404);
        expect(response.data.error).toContain("Conversation not found");
    });

    it("should return 404 when deleting a non-existent conversation", async () => {
        const response = await axios.delete(`${baseUrl}/chat/non-existent-conv`).catch((err) => err.response);
        expect(response.status).toBe(404);
        expect(response.data.error).toBe("Not found");
    });
});
