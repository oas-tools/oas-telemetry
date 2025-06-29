export const convertRegexRecursively = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(convertRegexRecursively);
    } else if (obj && typeof obj === 'object') {
        const newObj: any = {};
        for (const key of Object.keys(obj)) {
            if (key === '$regex' && typeof obj[key] === 'string') {
                try {
                    return new RegExp(obj[key]);
                } catch {
                    throw new Error(`Invalid regex value "${obj[key]}"`);
                }
            } else {
                newObj[key] = convertRegexRecursively(obj[key]);
            }
        }
        return newObj;
    }
    return obj;
};
