export function removeCircularRefs(obj: any): any {
    // const seen = new WeakMap(); // Used to keep track of visited objects


    // Replacer function to handle circular references
    function replacer(key: string, value: any) {
        if (key === "_spanProcessor") {
            return "telemetry skips this field to avoid circular reference";
        }
        // GENERIC CIRCULAR REFERENCE HANDLING
        // if (typeof value === "object" && value !== null) {
        //     // If the object has been visited before, return the name prefixed with "CIRCULAR+"
        //     if (seen.has(value)) {
        //         return `CIRCULAR${key}`;
        //     }
        //     seen.set(value, key); // Mark the object as visited with its name
        // }
        return value;
    }

    // Convert the object to a string and then parse it back
    // This will trigger the replacer function to handle circular references
    const jsonString = JSON.stringify(obj, replacer);
    return JSON.parse(jsonString);
}

/**
 * Recursively converts dot-separated keys in an object to nested objects.
 * 
 * @param {any} obj - The object to process.
 * @returns {any} - The object with all dot-separated keys converted to nested objects.
 * @example
 *  Input:
 *  {
 *    "http.method": "GET",
 *    "http.url": "http://example.com",
 *    "nested.obj.key": "value"
 *  }
 *  Output:
 *  {
 *    "http": {
 *      "method": "GET",
 *      "url": "http://example.com"
 *    },
 *    "nested": {
 *      "obj": {
 *        "key": "value"
 *      }
 *    }
 *  }
 */
export function applyNesting(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map(item => applyNesting(item));
    } else if (typeof obj === 'object' && obj !== null) {
        const result: any = {};
        for (const key in obj) {
            const value = applyNesting(obj[key]);
            const keys = key.split('.');
            let temp = result;

            for (let i = 0; i < keys.length; i++) {
                const currentKey = keys[i];
                if (i === keys.length - 1) {
                    temp[currentKey] = value;
                } else {
                    if (!temp[currentKey]) {
                        temp[currentKey] = {};
                    }
                    temp = temp[currentKey];
                }
            }
        }
        return result;
    } else {
        return obj;
    }
}


