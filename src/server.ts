import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { AddressInfo } from 'net';

let server: http.Server | null = null;
let currentContentRoot: string = '';
let mediaRoot: string = '';

let allowedExtensions: string[] = ['.md', '.yaml', '.yml'];

let lastRequestedPort: number = -1;
let currentRunningPort: number = -1;

export function startServer(contentPath: string, mediaPath: string, port: number, allowedExts: string[] = ['.md', '.yaml', '.yml']): Promise<number> {
    return new Promise((resolve, reject) => {
        // Reuse existing server if:
        // 1. Server is running
        // 2. The requested port config hasn't changed (user didn't change settings)
        if (server && lastRequestedPort === port && currentRunningPort > 0) {
            currentContentRoot = contentPath;
            mediaRoot = mediaPath;
            allowedExtensions = allowedExts;
            console.log(`Reusing server at http://localhost:${currentRunningPort}`);
            resolve(currentRunningPort);
            return;
        }

        const tryPort = (currentPort: number) => {
            if (server) {
                // If we are here, it means we decided to restart (port changed)
            }

            const tempServer = http.createServer(handleRequest);
            let started = false;

            // Set global extensions for scanning
            allowedExtensions = allowedExts;

            tempServer.on('error', (err: any) => {
                if (err.code === 'EADDRINUSE') {
                    if (port !== 0) {
                        console.log(`Port ${currentPort} in use, trying ${currentPort + 1}`);
                        tempServer.close();
                        tryPort(currentPort + 1);
                    } else {
                        reject(err);
                    }
                } else {
                    console.error('Server error:', err);
                    reject(err);
                }
            });

            tempServer.listen(currentPort, 'localhost', () => {
                started = true;
                server = tempServer; // Assign to global
                lastRequestedPort = port; // Remember what user asked for

                // Initialize state
                currentContentRoot = contentPath;
                mediaRoot = mediaPath;

                const address = server?.address() as AddressInfo;
                const actualPort = address.port;
                currentRunningPort = actualPort; // Track actual running port
                console.log(`Server started at http://localhost:${actualPort}`);
                console.log(`Content Root: ${currentContentRoot}`);
                console.log(`Media Root: ${mediaRoot}`);
                resolve(actualPort);
            });
        };

        if (server) {
            server.close(() => {
                server = null;
                tryPort(port);
            });
        } else {
            tryPort(port);
        }
    });
}

export function stopServer() {
    if (server) {
        server.close();
        server = null;
        currentRunningPort = -1;
        lastRequestedPort = -1;
        console.log('Server stopped.');
    }
}

async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    const url = req.url || '/';
    console.log(`Request: ${url}`);

    if (req.method !== 'GET') {
        res.writeHead(405);
        res.end('Method Not Allowed');
        return;
    }

    const decodedUrl = decodeURIComponent(url);
    const urlParts = decodedUrl.split('?');
    const pathname = urlParts[0];

    // API: File List
    if (pathname === '/api/files') {
        try {
            const files = await scanFiles(currentContentRoot);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(files));
        } catch (e) {
            console.error(e);
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Failed to scan files' }));
        }
        return;
    }

    // Content: /contents/...
    if (pathname.startsWith('/contents/')) {
        const relPath = pathname.substring('/contents/'.length);
        const fullPath = path.join(currentContentRoot, relPath);

        if (!fullPath.startsWith(currentContentRoot)) {
            res.writeHead(403);
            res.end('Access Denied');
            return;
        }

        serveFile(res, fullPath);
        return;
    }

    // Static Assets
    let assetPath = '';
    if (pathname === '/') {
        assetPath = path.join(mediaRoot, 'index.html');
    } else {
        const relPath = pathname.startsWith('/') ? pathname.substring(1) : pathname;
        assetPath = path.join(mediaRoot, relPath);
    }

    if (!assetPath.startsWith(mediaRoot)) {
        res.writeHead(403);
        res.end('Access Denied');
        return;
    }

    serveFile(res, assetPath);
}

function serveFile(res: http.ServerResponse, filePath: string) {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeType = getMimeType(ext);
        res.writeHead(200, { 'Content-Type': mimeType });
        fs.createReadStream(filePath).pipe(res);
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
}

function getMimeType(ext: string): string {
    const map: { [key: string]: string } = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.mjs': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.md': 'text/markdown',
        '.yml': 'text/yaml',
        '.yaml': 'text/yaml'
    };
    return map[ext] || 'text/plain';
}

async function scanFiles(dir: string, baseDir: string = dir): Promise<string[]> {
    let results: string[] = [];
    try {
        const list = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of list) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
                results = results.concat(await scanFiles(fullPath, baseDir));
            } else {
                if (entry.name.startsWith('.')) continue;
                const ext = path.extname(entry.name).toLowerCase();
                if (allowedExtensions.includes(ext)) {
                    let rel = path.relative(baseDir, fullPath);
                    rel = rel.replace(/\\/g, '/');
                    results.push(rel);
                }
            }
        }
    } catch (e) {
        console.error('Scan error:', e);
    }
    return results.sort();
}
