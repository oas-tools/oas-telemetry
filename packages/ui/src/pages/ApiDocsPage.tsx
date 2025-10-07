import { useEffect, useState } from "react";
import { utilService } from "../services/utilService";
import backend from "../services/Backend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import CollapsibleCard from "../components/CollapsibleCard";
import { Shield, FileText, Download, Upload, Trash, Edit, List, Eye } from "lucide-react";
import { Separator } from "@/components/ui/separator";



// Helper to get tag info from spec
function getTagInfo(spec: any, tag: string) {
    return spec.tags?.find((t: any) => t.name === tag);
}


const ApiDocsPage = () => {
    const [spec, setSpec] = useState<any>(null);
    const [openIdx, setOpenIdx] = useState<string | null>(null);
    const [tryParams, setTryParams] = useState<any>({});
    const [tryBody, setTryBody] = useState<string>("");
    const [tryResult, setTryResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        utilService.getOasTelemetryOpenApiSpec().then(setSpec);
    }, []);

    if (!spec) return (
        <div className="flex items-center justify-center h-screen bg-background">
            <span className="text-lg text-muted-foreground">Loading API spec...</span>
        </div>
    );

    // Group endpoints by tag
    const endpointsByTag: Record<string, Array<{ path: string, method: string, details: any }>> = {};
    Object.entries(spec.paths).forEach(([path, methodsObj]) => {
        const pathParams = (methodsObj as any)?.parameters || [];
        Object.entries(methodsObj as Record<string, any>).forEach(([method, details]: any) => {
            // skip the path-level "parameters" entry
            if (method === "parameters") return;
            // merge path-level parameters into operation parameters
            const mergedDetails = {
                ...(details || {}),
                parameters: [...(pathParams || []), ...(details?.parameters || [])],
            };
            const tags = mergedDetails.tags || ["default"];
            tags.forEach((tag: string) => {
                if (!endpointsByTag[tag]) endpointsByTag[tag] = [];
                endpointsByTag[tag].push({ path, method, details: mergedDetails });
            });
        });
    });



    const handleParamChange = (name: string, value: string) => {
        setTryParams((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleTryItOut = async (endpoint: any) => {
        setLoading(true);
        setTryResult(null);

        let url = endpoint.path;
        const methodObj = endpoint.details;
        if (methodObj.parameters) {
            methodObj.parameters.forEach((param: any) => {
                if (param.in === "path") {
                    url = url.replace(`{${param.name}}`, tryParams[param.name] || "");
                }
            });
        }
        const query: string[] = [];
        if (methodObj.parameters) {
            methodObj.parameters.forEach((param: any) => {
                if (param.in === "query" && tryParams[param.name]) {
                    query.push(`${encodeURIComponent(param.name)}=${encodeURIComponent(tryParams[param.name])}`);
                }
            });
        }
        if (query.length) {
            url += "?" + query.join("&");
        }

        const options: any = {
            method: endpoint.method,
            url,
            headers: {},
            data: undefined,
        };
        if (methodObj.requestBody) {
            options.headers["Content-Type"] = "application/json";
            options.data = tryBody.trim() ? tryBody : "{}";
        }

        try {
            const resp = await backend.request(options);
            setTryResult({ status: resp.status, data: resp.data });
        } catch (err: any) {
            setTryResult({ error: err?.response?.data || err?.message || "Unknown error" });
        }
        setLoading(false);
    };

    // Helper to get request body example as string
    function getRequestBodyExampleString(requestBody: any) {
        if (!requestBody) return "";
        const content = requestBody.content?.["application/json"];
        if (content?.example) return JSON.stringify(content.example, null, 2);
        if (content?.schema?.example) return JSON.stringify(content.schema.example, null, 2);
        return "";
    }

    return (
        <div className="min-h-screen bg-background">
            <main className="container mx-auto px-4 py-4 md:py-8 space-y-4 md:space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl sm:text-2xl font-bold">Telemetry lib (redacted)</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">{spec.info.version}</CardDescription>
                        <p className="text-sm text-muted-foreground mt-2">{spec.info.description}</p>
                    </CardHeader>
                </Card>
                <div>
                    <h2 className="text-lg font-semibold mb-3">Endpoints</h2>
                    <div className="flex flex-col gap-8">
                        {Object.entries(endpointsByTag).map(([tag, endpoints]) => (
                            <div key={tag}>
                                <div className="flex items-center mb-2">
                                    <span className="font-bold text-base">{tag}</span>
                                    <span className="ml-2 text-xs text-muted-foreground">{getTagInfo(spec, tag)?.description}</span>
                                </div>
                                <div className="flex flex-col gap-4">
                                    {endpoints.map((endpoint, idx) => (
                                        <CollapsibleCard
                                            key={endpoint.method + endpoint.path}
                                            isOpen={openIdx === `${tag}-${idx}`}
                                            onToggle={() => {
                                                setOpenIdx(openIdx === `${tag}-${idx}` ? null : `${tag}-${idx}`);
                                                setTryParams({});
                                                // Prefill request body with example if available
                                                const example = getRequestBodyExampleString(endpoint.details.requestBody);
                                                setTryBody(example);
                                                setTryResult(null);
                                            }}
                                            className={`border shadow-sm rounded-lg transition-all ${openIdx === `${tag}-${idx}` ? "border-primary" : "border-muted"} bg-card`}
                                            header={
                                                <>
                                                    <CardTitle className="flex items-center gap-2">
                                                        {methodIcon(endpoint.method)}
                                                        <span className={`font-bold uppercase text-xs sm:text-sm ${methodColor(endpoint.method)}`}>{endpoint.method}</span>
                                                        <span className="font-mono text-xs sm:text-sm break-all">{endpoint.path}</span>
                                                        {loading && (
                                                            <svg className="animate-spin h-4 w-4 text-muted-foreground ml-2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /></svg>
                                                        )}
                                                    </CardTitle>
                                                    <CardDescription>
                                                        {endpoint.details.summary || endpoint.details.description}
                                                    </CardDescription>
                                                </>
                                            }
                                        >
                                            <Separator className="mb-2" />
                                            <div className="flex flex-col gap-4">
        
                                                {/* Description */}
                                                <div>
                                                    <span className="font-semibold text-xs">Description:</span>
                                                    <p className="text-xs text-muted-foreground mt-1">{endpoint.details.description || endpoint.details.summary}</p>
                                                </div>
                                                {/* Security */}
                                                {endpoint.details.security && (
                                                    <div className="text-xs text-muted-foreground">
                                                        <span className="font-semibold">Security:</span>{" "}
                                                        {endpoint.details.security.map((sec: any) =>
                                                            Object.keys(sec).join(", ")
                                                        ).join(" | ")}
                                                    </div>
                                                )}
                                                {/* Tags */}
                                                {endpoint.details.tags && (
                                                    <div className="text-xs text-muted-foreground">
                                                        <span className="font-semibold">Tags:</span>{" "}
                                                        {endpoint.details.tags.join(", ")}
                                                    </div>
                                                )}
                                                {/* Parameters */}
                                                <div>
                                                    <div className="font-semibold mb-2 text-xs">Parameters</div>
                                                    {(endpoint.details.parameters?.length > 0) ? (
                                                        <ul className="space-y-2">
                                                            {endpoint.details.parameters.map((param: any) => (
                                                                <li key={param.name} className="flex flex-col gap-1 border rounded px-3 py-2 bg-muted/40">
                                                                    <div className="flex gap-2 items-center flex-wrap">
                                                                        <span className="font-mono font-bold text-xs">{param.name}</span>
                                                                        <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">{param.in}</span>
                                                                        <span className="text-xs text-muted-foreground">{param.schema?.type || "-"}</span>
                                                                        {param.required && <span className="text-xs text-red-500 font-semibold">required</span>}
                                                                    </div>
                                                                    <span className="text-xs text-muted-foreground">{param.description}</span>
                                                                    <Input
                                                                        value={tryParams[param.name] || ""}
                                                                        onChange={e => handleParamChange(param.name, e.target.value)}
                                                                        className="w-full sm:w-32 h-7 text-xs mt-1"
                                                                        placeholder={param.name}
                                                                    />
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <div className="text-muted-foreground text-xs">No parameters</div>
                                                    )}
                                                </div>
                                                {/* Request Body */}
                                                {endpoint.details.requestBody && (
                                                    <div>
                                                        <div className="font-semibold mb-2 text-xs">Request Body</div>
                                                        <Textarea
                                                            value={tryBody}
                                                            onChange={e => setTryBody(e.target.value)}
                                                            className="w-full font-mono text-xs h-40" // taller textarea
                                                            placeholder="JSON body"
                                                        />
                                                        {/* Show example if available */}
                                                        {getRequestBodyExampleString(endpoint.details.requestBody) && (
                                                            <div className="mt-2 text-xs">
                                                                <span className="font-semibold">Example:</span>
                                                                <pre className="bg-muted p-2 rounded text-xs whitespace-pre-wrap break-words">{getRequestBodyExampleString(endpoint.details.requestBody)}</pre>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                {/* Responses */}
                                                <div>
                                                    <div className="font-semibold mb-2 text-xs">Responses</div>
                                                    <ul className="space-y-2">
                                                        {Object.entries(endpoint.details.responses || {}).map(
                                                            ([status, resp]: any) => (
                                                                <li key={status} className="flex flex-col gap-1 border rounded px-3 py-2 bg-muted/40">
                                                                    <div className="flex gap-2 items-center flex-wrap">
                                                                        <span className="font-mono text-xs font-bold">{status}</span>
                                                                        <span className="text-xs text-muted-foreground">{resp.description}</span>
                                                                    </div>
                                                                    {/* Show example if available */}
                                                                    {resp.content?.["application/json"]?.example && (
                                                                        <pre className="bg-black text-white p-2 rounded text-xs mt-1 whitespace-pre-wrap break-words overflow-x-auto">{JSON.stringify(resp.content["application/json"].example, null, 2)}</pre>
                                                                    )}
                                                                </li>
                                                            )
                                                        )}
                                                    </ul>
                                                </div>
                                                {/* Try it out */}
                                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-2">
                                                    <Button onClick={() => handleTryItOut(endpoint)} disabled={loading} className="h-8 px-4 text-xs shadow w-full sm:w-auto">
                                                        {loading ? "Calling..." : "Try it out"}
                                                    </Button>
                                                    {loading && <span className="text-muted-foreground text-xs">Calling API...</span>}
                                                </div>
                                                {tryResult && (
                                                    <div className="mt-2">
                                                        <div className="font-semibold mb-1 text-xs">Result</div>
                                                        <pre className="bg-black text-white p-3 rounded text-xs overflow-x-auto max-h-48 whitespace-pre-wrap break-words">
                                                            {tryResult.error
                                                                ? "Error: " + (typeof tryResult.error === "string" ? tryResult.error : JSON.stringify(tryResult.error, null, 2))
                                                                : JSON.stringify(tryResult, null, 2)}
                                                        </pre>
                                                    </div>
                                                )}
                                            </div>
                                        </CollapsibleCard>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
};

function methodColor(method: string) {
    switch (method.toLowerCase()) {
        case "get": return "text-green-600";
        case "post": return "text-blue-600";
        case "put": return "text-yellow-600";
        case "delete": return "text-red-600";
        case "patch": return "text-purple-600";
        default: return "text-gray-600";
    }
}

function methodIcon(method: string) {
    switch (method.toLowerCase()) {
        case "get": return <Download className="h-4 w-4 text-green-600" />;
        case "post": return <Upload className="h-4 w-4 text-blue-600" />;
        case "put": return <Edit className="h-4 w-4 text-yellow-600" />;
        case "delete": return <Trash className="h-4 w-4 text-red-600" />;
        case "patch": return <Shield className="h-4 w-4 text-purple-600" />;
        case "options": return <List className="h-4 w-4 text-gray-600" />;
        case "head": return <Eye className="h-4 w-4 text-gray-600" />;
        default: return <FileText className="h-4 w-4 text-gray-600" />;
    }
}

export default ApiDocsPage;

