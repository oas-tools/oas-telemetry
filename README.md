# OAS TELEMETRY

**OAS Telemetry** offers an express middleware designed for collecting telemetry data using **Open Telemetry** in applications built using the **OpenAPI Specification (OAS)**. This middleware allows developers to easily incorporate telemetry functionality into their APIs.

**OAS Telemetry** provides a set of endpoints that can be accessed to perform various actions related to telemetry data, such as starting and stopping data collection, resetting telemetry data, listing collected data, and searching for specific telemetry records. These endpoints can be easily integrated into an **Express.js** application, providing developers with a convenient way to manage and analyze telemetry data.

Additionally, **OAS Telemetry** offers customization options, allowing developers to configure the telemetry middleware according to their specific requirements.

Overall, **OAS Telemetry** will serve as a valuable tool for developers looking to gain insights into the operation and performance of their **OAS-based APIs**, enabling them to monitor, debug, and optimize their applications effectively.

The package now supports both **ES Module (ESM)** and **CommonJS (CJS)** formats, making it compatible with a wide range of applications. The ESM build targets the **ES2020** standard. Furthermore, **OAS Telemetry** provides a range of plugins to extend its functionality.

**OAS Telemetry** requires **Node.js version 18 or higher**.

This repository contains two packages:

- **`packages/lib`**: The main npm library, **oas-telemetry**, which provides the core telemetry middleware and related functionality.
- **`packages/ui`**: The frontend project for visualizing and interacting with telemetry data.

For more details about the library, see the documentation in [`packages/lib/README.md`](./packages/lib/README.md).

