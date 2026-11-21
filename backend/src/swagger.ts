import swaggerJsDoc from "swagger-jsdoc";

const swaggerOptions = {
    swaggerDefinition: {
        openapi: "3.0.0",
        info: {
            title: "Volo API",
            version: "1.0.0",
            description: "Premium Global Ride-Hailing Platform API",
            contact: {
                name: "Developer",
            },
            servers: [{ url: "http://localhost:5000" }],
        },
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
        },
        security: [{ bearerAuth: [] }],
    },
    apis: ["./src/routes/*.ts", "./src/index.ts"],
};

export const swaggerDocs = swaggerJsDoc(swaggerOptions);
