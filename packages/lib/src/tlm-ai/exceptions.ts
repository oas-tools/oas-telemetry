export class ConversationNotFoundError extends Error {
    constructor(message: string = 'Conversation not found') {
        super(message);
        this.name = 'ConversationNotFoundError';
        Object.setPrototypeOf(this, ConversationNotFoundError.prototype);
    }
}
