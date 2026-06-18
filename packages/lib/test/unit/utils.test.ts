import { vi, describe, expect, it, beforeEach } from "vitest";
import { specLoader, heapStats, getOasTelemetrySpec } from "../../src/tlm-util/utilController";
import { readFileSync } from "fs";
import v8 from "node:v8";

vi.mock("fs", () => ({
    readFileSync: vi.fn()
}));

vi.mock("node:v8", () => ({
    default: {
        getHeapStatistics: vi.fn(() => ({
            total_heap_size: 1024 * 1024 * 10,
            used_heap_size: 1024 * 1024 * 5
        }))
    }
}));

const makeMockResponse = () => {
    const res: any = {
        headers: {} as Record<string, string>,
        statusCode: 200,
        body: null as any,
        setHeader(name: string, value: string) {
            this.headers[name] = value;
            return this;
        },
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        send(data: any) {
            this.body = typeof data === "object" && data !== null ? JSON.stringify(data) : data;
            return this;
        }
    };
    return res;
};

describe("Utils API Unit Tests", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("Case: specFileName and spec given", () => {
        it("should return the spec loaded from the file", () => {
            const mockConfig: any = {
                general: {
                    specFileName: "mock-spec.json",
                    spec: JSON.stringify({ info: { title: "Config Spec" } })
                }
            };
            vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ info: { title: "Valid Spec for Testing" } }));

            const req: any = {};
            const res = makeMockResponse();

            specLoader(req, res, mockConfig);

            expect(readFileSync).toHaveBeenCalledWith("mock-spec.json", { encoding: "utf8", flag: "r" });
            expect(res.statusCode).toBe(200);
            expect(res.headers["Content-Type"]).toBe("application/json");
            const parsed = JSON.parse(res.body);
            expect(parsed.info.title).toBe("Valid Spec for Testing");
        });
    });

    describe("Case: only specFileName given", () => {
        it("should return the spec loaded from the file", () => {
            const mockConfig: any = {
                general: {
                    specFileName: "mock-spec.json"
                }
            };
            vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ info: { title: "Valid Spec for Testing" } }));

            const req: any = {};
            const res = makeMockResponse();

            specLoader(req, res, mockConfig);

            expect(readFileSync).toHaveBeenCalledWith("mock-spec.json", { encoding: "utf8", flag: "r" });
            expect(res.statusCode).toBe(200);
            expect(res.headers["Content-Type"]).toBe("application/json");
            const parsed = JSON.parse(res.body);
            expect(parsed.info.title).toBe("Valid Spec for Testing");
        });
    });

    describe("Case: invalid specFileName given", () => {
        it("should return 404 not found", () => {
            const mockConfig: any = {
                general: {
                    specFileName: "non-existent.json"
                }
            };
            vi.mocked(readFileSync).mockImplementation(() => {
                throw new Error("ENOENT");
            });

            const req: any = {};
            const res = makeMockResponse();

            specLoader(req, res, mockConfig);

            expect(res.statusCode).toBe(404);
        });
    });

    describe("Case: only spec given", () => {
        it("should return the spec defined in userConfig", () => {
            const mockConfig: any = {
                general: {
                    spec: JSON.stringify({ paths: { "/api/v1/pets": {} } })
                }
            };
            const req: any = {};
            const res = makeMockResponse();

            specLoader(req, res, mockConfig);

            expect(res.statusCode).toBe(200);
            expect(res.headers["Content-Type"]).toBe("application/json");
            const parsed = JSON.parse(res.body);
            expect(parsed.paths).toBeDefined();
            expect(parsed.paths["/api/v1/pets"]).toBeDefined();
        });
    });

    describe("Case: invalid spec given", () => {
        it("should return 404 not found", () => {
            const mockConfig: any = {
                general: {
                    spec: ": : :"
                }
            };
            const req: any = {};
            const res = makeMockResponse();

            specLoader(req, res, mockConfig);

            expect(res.statusCode).toBe(404);
        });
    });

    describe("Case: none given", () => {
        it("should return 404 not found", () => {
            const mockConfig: any = {
                general: {}
            };
            const req: any = {};
            const res = makeMockResponse();

            specLoader(req, res, mockConfig);

            expect(res.statusCode).toBe(404);
        });
    });

    describe("Heap stats and OAS telemetry spec checks", () => {
        it("should fetch heapStats without throwing errors", () => {
            const req: any = {};
            const res = makeMockResponse();

            heapStats(req, res);

            expect(res.statusCode).toBe(200);
            const parsed = JSON.parse(res.body);
            expect(parsed.units).toBe("MB");
            expect(typeof parsed.total_heap_size).toBe("number");
        });

        it("should fetch oas-telemetry-spec without throwing errors", () => {
            vi.mocked(readFileSync).mockReturnValue("paths:\n  /api/v1/telemetry:\n    get:\n      summary: telemetry");
            const req: any = {};
            const res = makeMockResponse();

            getOasTelemetrySpec(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.headers["Content-Type"]).toBe("application/json");
            const parsed = JSON.parse(res.body);
            expect(parsed.paths).toBeDefined();
        });
    });
});
