// Import a module using require (CommonJS)
const os = require('os');

// Simple console.log to demonstrate the plugin works
console.log("Hello from CommonJS plugin!");

// Define the plugin's functions
const plugin = {
    isConfigured: () => {
        return true;
    },

    getName: () => {
        return "CommonJS Plugin";
    },

    load: (config) => {
        console.log(`Loading plugin with config:`, JSON.stringify(config, null, 2));
        console.log(`System architecture is: ${os.arch()}`);
    },

    // Optional
    newTrace: (t) => {
        console.log("New trace received in plugin:", JSON.stringify(t, null, 2));
    },

    // Optional [Future feature]
    newMetric: (m) => {
        console.log("New metric received in plugin:", JSON.stringify(m, null, 2));
    },

    // Optional [Future feature]
    newLog: (l) => {
        console.log("New log received in plugin:", JSON.stringify(l, null, 2));
    },
};

// Export the plugin using CommonJS syntax
module.exports = { plugin };
