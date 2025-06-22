export interface KnownMicroservice {
    id: string;
    url: string;
}

let knownMicroservices: KnownMicroservice[] | null = null;

export const getKnownMicroservices = () => knownMicroservices || [];

export const setKnownMicroservices = (microservices: KnownMicroservice[]) => {
    knownMicroservices = microservices;
};