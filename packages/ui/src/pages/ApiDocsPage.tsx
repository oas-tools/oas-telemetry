import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import { useEffect, useState } from "react";
import { utilService } from "../services/utilService";

const ApiDocsPage = () => {
    const [spec, setSpec] = useState<any>(null);

    useEffect(() => {
        utilService.getOasTelemetryOpenApiSpec().then((data) => { setSpec(data); });
    }, []);

    return (
        <div>
            {spec ? (
                <SwaggerUI spec={spec}
                    requestInterceptor={(req:any) => {
                        req.credentials = "include";
                        return req;
                    }}
                />
            ) : (
                <div>Loading API documentation...</div>
            )}
        </div>
    );
};

export default ApiDocsPage;



