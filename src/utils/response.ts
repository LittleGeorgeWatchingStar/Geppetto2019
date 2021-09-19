/**
 * Parses responses from the server.
 */
export default class Response {
    /**
     * @return The response messages
     */
    static parseMessages($response: JQueryXHR): string[] {
        if ($response.responseJSON) {
            const data = $response.responseJSON;
            if (data.errors && $response.status === 400) {
                return data.errors;
            }
            if (data.message) {
                return [data.message];
            }
        }
        return [$response.responseText];
    }

    /**
     * @param join The string with which to join multiple messages.
     * @return A single response message
     */
    static parseMessage($response: JQueryXHR, join = ' '): string {
        const messages = Response.parseMessages($response);
        return messages.join(join);
    }
}
