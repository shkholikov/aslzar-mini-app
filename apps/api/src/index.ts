import { config } from "./config";
import express from "express";
import swaggerUi from "swagger-ui-express";
import { requireApiKey } from "./auth";
import { sendMessageHandler } from "./routes/send-message";
import { openApiSpec } from "./openapi";

const app = express();

app.use(express.json({ limit: "32kb" }));

app.get("/health", (_req, res) => {
	res.json({ ok: true });
});

// Raw OpenAPI spec — external devs can import into Postman/Insomnia/generators
app.get("/docs.json", (_req, res) => {
	res.json(openApiSpec);
});

// Interactive Swagger UI at /docs
app.use(
	"/docs",
	swaggerUi.serve,
	swaggerUi.setup(openApiSpec, {
		customSiteTitle: "ASLZAR External API Docs",
		customfavIcon: "/favicon.ico",
		swaggerOptions: {
			persistAuthorization: true,
			tryItOutEnabled: true
		}
	})
);

app.post("/v1/external/sendMessage", requireApiKey, sendMessageHandler);

app.use((_req, res) => {
	res.status(404).json({
		ok: false,
		error: { code: "not_found", message: "Endpoint not found" }
	});
});

app.listen(config.PORT, () => {
	console.log(`🚀 API listening on :${config.PORT}`);
});
