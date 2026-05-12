import { createServer } from "node:http";
import { fileURLToPath } from "url";
import { hostname } from "node:os";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { server as wisp, logging } from "@mercuryworkshop/wisp-js/server";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";

import { scramjetPath } from "@mercuryworkshop/scramjet/path";
import { libcurlPath } from "@mercuryworkshop/libcurl-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

const publicPath = fileURLToPath(new URL("../public/", import.meta.url));
const dataPath   = fileURLToPath(new URL("../data/",   import.meta.url));
const announcementsFile = join(dataPath, "announcements.json");

const ADMIN_PASSWORD = "localadmin";

function loadAnnouncements() {
	if (!existsSync(announcementsFile)) return [];
	try { return JSON.parse(readFileSync(announcementsFile, "utf8")); }
	catch { return []; }
}
function saveAnnouncements(data) {
	if (!existsSync(dataPath)) mkdirSync(dataPath, { recursive: true });
	writeFileSync(announcementsFile, JSON.stringify(data, null, 2));
}

logging.set_level(logging.NONE);
Object.assign(wisp.options, {
	allow_udp_streams: false,
	hostname_blacklist: [/example\.com/],
	dns_servers: ["1.1.1.3", "1.0.0.3"],
});

const fastify = Fastify({
	serverFactory: (handler) => {
		return createServer()
			.on("request", (req, res) => {
				res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
				res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
				handler(req, res);
			})
			.on("upgrade", (req, socket, head) => {
				if (req.url.endsWith("/wisp/")) wisp.routeRequest(req, socket, head);
				else socket.end();
			});
	},
});

fastify.register(fastifyStatic, {
	root: publicPath,
	decorateReply: true,
	setHeaders: (res, filePath) => {
		if (/\.(html|js|css)$/i.test(filePath)) {
			res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
			res.setHeader("Pragma", "no-cache");
		}
	},
});

fastify.register(fastifyStatic, {
	root: scramjetPath,
	prefix: "/scram/",
	decorateReply: false,
});

fastify.register(fastifyStatic, {
	root: libcurlPath,
	prefix: "/libcurl/",
	decorateReply: false,
});

fastify.register(fastifyStatic, {
	root: baremuxPath,
	prefix: "/baremux/",
	decorateReply: false,
});

// ── Announcements API ──────────────────────────────────────
fastify.get("/api/announcements", async (_req, reply) => {
	return reply.send(loadAnnouncements());
});

fastify.post("/api/announcements", async (req, reply) => {
	const { password, message, type } = req.body || {};
	if (password !== ADMIN_PASSWORD)
		return reply.code(401).send({ error: "Unauthorized" });
	if (!message?.trim())
		return reply.code(400).send({ error: "Message required" });
	const list = loadAnnouncements();
	list.unshift({
		id: Date.now(),
		message: message.trim(),
		type: type || "info",
		date: new Date().toISOString(),
	});
	if (list.length > 30) list.length = 30;
	saveAnnouncements(list);
	return reply.send({ ok: true });
});

fastify.delete("/api/announcements/:id", async (req, reply) => {
	const { password } = req.query;
	if (password !== ADMIN_PASSWORD)
		return reply.code(401).send({ error: "Unauthorized" });
	const list = loadAnnouncements().filter(a => String(a.id) !== req.params.id);
	saveAnnouncements(list);
	return reply.send({ ok: true });
});

fastify.setNotFoundHandler((_req, reply) => {
	return reply.code(404).type("text/html").sendFile("404.html");
});

fastify.server.on("listening", () => {
	const address = fastify.server.address();
	console.log("Listening on:");
	console.log(`\thttp://localhost:${address.port}`);
	console.log(`\thttp://${hostname()}:${address.port}`);
	console.log(
		`\thttp://${address.family === "IPv6" ? `[${address.address}]` : address.address}:${address.port}`
	);
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
	console.log("SIGTERM signal received: closing HTTP server");
	fastify.close();
	process.exit(0);
}

let port = parseInt(process.env.PORT || "");
if (isNaN(port)) port = 8080;

fastify.listen({ port, host: "0.0.0.0" });
