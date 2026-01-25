import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { AddressInfo } from 'net';

let server: http.Server | null = null;
let currentContentRoot: string = '';
let mediaRoot: string = '';

// Hardcoded safety excludes
const excludePatterns: string[] = ['node_modules', '.git', '.DS_Store'];

const DEFAULT_FILE_GROUPS: { [group: string]: string[] } = {
    "markdown": [".md", ".markdown"],
    "image": [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".bmp", ".ico"],
    "media": [".pdf", ".mp4", ".webm", ".ogg", ".mov", ".mp3", ".wav"],
    "code": [".js", ".ts", ".html", ".css", ".json", ".yaml", ".yml", ".py", ".c", ".cpp", ".h", ".hpp", ".go", ".rs", ".java", ".php", ".rb", ".sh", ".bat", ".ps1", ".xml", ".properties", ".ini", ".conf", ".sql"]
};

let fileGroups: { [group: string]: string[] } = {};
let enabledGroups: { [group: string]: boolean } = {};

let lastRequestedPort: number = -1;
let currentRunningPort: number = -1;

export function startServer(contentPath: string, mediaPath: string, port: number, groups: any = {}, enabled: any = {}): Promise<number> {
    return new Promise((resolve, reject) => {
        // Merge user groups with defaults
        const mergedGroups = { ...DEFAULT_FILE_GROUPS };
        for (const key of Object.keys(groups)) {
            if (mergedGroups[key]) {
                if (Array.isArray(groups[key])) {
                    // Add unique extensions
                    const set = new Set([...mergedGroups[key], ...groups[key]]);
                    mergedGroups[key] = Array.from(set);
                }
            } else {
                mergedGroups[key] = groups[key];
            }
        }

        // Reuse existing server if:
        // 1. Server is running
        // 2. The requested port config hasn't changed (user didn't change settings)
        // 3. We allow reuse even if groups changed, we just update global vars.

        if (server && lastRequestedPort === port && currentRunningPort > 0) {
            currentContentRoot = contentPath;
            mediaRoot = mediaPath;
            // excludePatterns is constant now
            fileGroups = mergedGroups; // Use merged
            enabledGroups = enabled;
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

            // Set global patterns
            // excludePatterns is constant
            fileGroups = mergedGroups; // Use merged
            enabledGroups = enabled;

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
        '.yaml': 'text/yaml',
        '.pdf': 'application/pdf',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.ogg': 'video/ogg',
        '.mov': 'video/quicktime',
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav'
    };
    return map[ext] || 'text/plain';
}

interface FileEntry {
    path: string;
    type: string;
}

async function scanFiles(dir: string, baseDir: string = dir): Promise<FileEntry[]> {
    let results: FileEntry[] = [];
    try {
        const list = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of list) {
            const fullPath = path.join(dir, entry.name);


            // Check exclusion
            if (isExcluded(entry.name)) continue;

            if (entry.isDirectory()) {
                results = results.concat(await scanFiles(fullPath, baseDir));
            } else {
                // Check if file is in an enabled group
                const group = getFileGroup(entry.name);
                if (group && enabledGroups[group]) {
                    // It is a file
                    let rel = path.relative(baseDir, fullPath).replace(/\\/g, '/');
                    results.push({
                        path: rel,
                        type: group // 'code', 'image', 'markdown', etc.
                    });
                }
            }
        }
    } catch (e) {
        console.error('Scan error:', e);
    }
    return results.sort((a, b) => a.path.localeCompare(b.path));
}

function getFileGroup(filename: string): string | null {
    const ext = path.extname(filename).toLowerCase();
    for (const [group, extensions] of Object.entries(fileGroups)) {
        // extensions might be array of strings
        if (Array.isArray(extensions) && extensions.includes(ext)) {
            return group;
        }
    }
    return null;
}

function isExcluded(filename: string): boolean {
    // Simple glob matching support: *
    // We check against excludePatterns
    for (const pattern of excludePatterns) {
        if (simpleMatch(filename, pattern)) return true;
    }
    return false;
}

function simpleMatch(filename: string, pattern: string): boolean {
    // Convert glob to regex
    // Escape special regex chars except *
    const regexStr = '^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$';
    const regex = new RegExp(regexStr);
    return regex.test(filename);
}
