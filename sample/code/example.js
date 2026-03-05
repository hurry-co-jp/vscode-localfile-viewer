/**
 * Local File Viewer - JavaScript シンタックスハイライト確認用サンプル
 *
 * このファイルはシンタックスハイライトの表示確認用です。
 * 実行を意図したものではありません。
 */

// クラス定義
class TaskManager {
    #tasks = [];

    constructor(name) {
        this.name = name;
        this.createdAt = new Date();
    }

    addTask(title, priority = 'medium') {
        const task = {
            id: crypto.randomUUID(),
            title,
            priority,
            done: false,
            createdAt: new Date().toISOString(),
        };
        this.#tasks.push(task);
        return task;
    }

    complete(id) {
        const task = this.#tasks.find(t => t.id === id);
        if (!task) throw new Error(`Task not found: ${id}`);
        task.done = true;
        return task;
    }

    get pending() {
        return this.#tasks.filter(t => !t.done);
    }

    get summary() {
        const total = this.#tasks.length;
        const done = this.#tasks.filter(t => t.done).length;
        return `${this.name}: ${done}/${total} completed`;
    }
}

// async/await パターン
async function fetchData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Fetch failed:', error.message);
        return null;
    }
}

// テンプレートリテラル、分割代入、スプレッド構文
const config = { host: 'localhost', port: 8080, debug: true };
const { host, port, ...rest } = config;
console.log(`Server: http://${host}:${port}`);

// 配列操作
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
const sum = numbers.reduce((acc, n) => acc + n, 0);

export { TaskManager, fetchData };
