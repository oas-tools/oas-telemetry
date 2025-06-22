export function removeCircularRefs(obj: any): any {
    // const seen = new WeakMap(); // Used to keep track of visited objects


    // Replacer function to handle circular references
    function replacer(key: string, value: any) {
        if (key === "_spanProcessor") {
            return "oas-telemetry skips this field to avoid circular reference";
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
 * // Input:
 * // {
 * //   "http.method": "GET",
 * //   "http.url": "http://example.com",
 * //   "nested.obj.key": "value"
 * // }
 * // Output:
 * // {
 * //   "http": {
 * //     "method": "GET",
 * //     "url": "http://example.com"
 * //   },
 * //   "nested": {
 * //     "obj": {
 * //       "key": "value"
 * //     }
 * //   }
 * // }
 */
export function convertToNestedObject(obj: any): any {
    const result: any = {};

    for (const key in obj) {
        const keys = key.split('.');
        let temp = result;

        for (let i = 0; i < keys.length; i++) {
            const currentKey = keys[i];

            if (i === keys.length - 1) {
                // Last key, set the value
                temp[currentKey] = obj[key];
            } else {
                // Intermediate key, ensure the object exists
                if (!temp[currentKey]) {
                    temp[currentKey] = {};
                }
                temp = temp[currentKey];
            }
        }
    }

    return result;
}

/**
 * Applies nesting to all dot-separated keys within an object.
 */
export function applyNesting(obj: any): any {
    for (const key in obj) {
        const value = obj[key];
        if (Array.isArray(value)) {
            obj[key] = value.map(item => typeof item === 'object' && item !== null ? applyNesting(item) : item);
        } else if (typeof value === 'object' && value !== null) {
            obj[key] = applyNesting(value);
        }
    }

    return convertToNestedObject(obj);
}

