import { config } from "../config"

const originalConsole = { ...console };

// 自定义颜色
const colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    cyan: "\x1b[36m",
    grey: "\x1b[38;5;250m",
    white: "\x1b[37m",
    green: "\x1b[32m"
};

function getCurrentTimestamp(name: string): string {
    const now = new Date();
    return `[${now.toISOString().replace("T", " ").slice(0, 19)} ${name}]`; // YYYY-MM-DD HH:mm:ss
}

console.error = (...args) => {
    const callerFile = getCallFile();
    originalConsole.error(colors.red, callerFile, getCurrentTimestamp("ERROR"), ...args, colors.reset);
};

console.warn = (...args) => {
    const callerFile = getCallFile();
    originalConsole.warn(colors.yellow, callerFile, getCurrentTimestamp("WARN"), ...args, colors.reset);
};

console.info = (...args) => {
    const callerFile = getCallFile();
    originalConsole.info(colors.green, callerFile, getCurrentTimestamp("INFO"), ...args, colors.reset);
};

console.debug = (...args) => {
    const callerFile = getCallFile();
    if (config.debug)
        originalConsole.debug(colors.cyan, callerFile, getCurrentTimestamp("DEBUG"), ...args, colors.reset);
}

console.log = (...args) => {
    const callerFile = getCallFile();
    if (config.debug)
        originalConsole.log(colors.grey, callerFile, getCurrentTimestamp("LOG"), ...args, colors.reset);
}

function getCallFile() {
    const err = new Error();
    let callerFile = '';

    // 使用 V8 stack trace API 获取调用栈对象
    const origPrepareStackTrace = (Error as any).prepareStackTrace;
    (Error as any).prepareStackTrace = (_: any, stackFrames: NodeJS.CallSite[]) => stackFrames;
    const stackFrames = err.stack as unknown as NodeJS.CallSite[];
    (Error as any).prepareStackTrace = origPrepareStackTrace;
    if (stackFrames && stackFrames.length >= 3) {
        // 第0行：Error
        // 第1行：console.info override
        // 第2行：真正的调用者
        const frame = stackFrames[2];
        callerFile = frame.getFileName()?.split('/').pop() || '';
        callerFile = `[${callerFile}]`;
    }
    return callerFile;
}