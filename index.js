const express = require('express');
const WebSocket = require('ws');
const fs = require('fs');
const childProcess = require('child_process');
const os = require('os');
const http = require('http');

const app = express();
app.use(express.static('public'));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
var minecraftServerProcess;
var sockets = [];
var messages = [];

// Function to handle output from the Minecraft server process
function handleMinecraftOutput(chunk) {
    const message = chunk.toString();
    messages.push(message);
    if(messages.length > 100) messages.shift();
    // Send the output to all connected clients via WebSocket
    sockets.forEach((socket) => {
        socket.send(JSON.stringify({ type: 'output', content: message }));
    });
}


setInterval(() => {
    let running = minecraftServerProcess != undefined && minecraftServerProcess.pid!= undefined && minecraftServerProcess.exitCode === null;
    sockets.forEach((socket) => {
        socket.send(JSON.stringify({ type: 'status', content: running ? 'running' : 'stopped' }));
    });
}, 500);

function startMinecraftServer() {
    if (minecraftServerProcess != undefined && minecraftServerProcess.pid!= undefined && minecraftServerProcess.exitCode === null) {
        console.log('Minecraft server is already running');
        return;
    }
    if (os.platform() === 'win32') {
        minecraftServerProcess = childProcess.spawn('server\\start.bat', { stdio: ['pipe', 'pipe', 'inherit'] });
    }else{
        minecraftServerProcess = childProcess.spawn('server/start.sh', { stdio: ['pipe', 'pipe', 'inherit'] });
    }
    // Set up event listeners for the Minecraft server process
    minecraftServerProcess.stdout.on('data', handleMinecraftOutput);
}

function stopMinecraftServer() {
    if (minecraftServerProcess != undefined && minecraftServerProcess.pid!= undefined && minecraftServerProcess.exitCode === null) {
        console.log('Shutting down Minecraft server...');
        minecraftServerProcess.stdin.write('stop\n');
    } else {
        console.log('Minecraft server is not running');
    }
}

wss.on('connection', (ws) => {
    sockets.push(ws);
    console.log('Client connected');
    messages.forEach((message) =>  ws.send(JSON.stringify({ type: 'output', content: message })));
    ws.on('message', (message) => {
        try {
            const parsedMessage = JSON.parse(message);
            const { type, content } = parsedMessage;
            console.log(`Received message: ${type} - ${content}`);

            switch (type) {
                case 'command':
                    minecraftServerProcess.stdin.write(`${content}\n`);
                    console.log(`Executing command: ${content}`);
                    break;
                case 'shutdown':
                    stopMinecraftServer();
                    break;
                case 'restart':
                    console.log('Restarting Minecraft server...');
                    stopMinecraftServer();
                    setTimeout(() => {
                        startMinecraftServer();
                    }, 5000);
                    break;
                case 'start':
                    console.log('Starting Minecraft server...');
                    startMinecraftServer();
                    break;
                case 'list-files':
                    const path = `./server/${content}`;
                    fs.readdir(path, (err, files) => {
                        if (err) {
                            console.error(err);
                            ws.send(JSON.stringify({ type: 'error', content: `Error: ${err.message}` }));
                        } else {
                            ws.send(JSON.stringify({ type: 'file-list', content: files }));
                        }
                    });
                    break;
                case 'view':
                    fs.readFile(`./server/${content}`, 'utf8', (err, fileContent) => {
                        if (err) {
                            ws.send(JSON.stringify({ type: 'error', content: `Error reading file: ${err.message}` }));
                        } else {
                            ws.send(JSON.stringify({ type: 'file-content', content: fileContent }));
                        }
                    });
                    break;
                default:
                    ws.send(JSON.stringify({ type: 'error', content: `Unknown command: ${type}` }));
                    break;
            }
        } catch (err) {
            console.error('Invalid message format', err);
            ws.send(JSON.stringify({ type: 'error', content: 'Invalid message format' }));
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        sockets = sockets.filter(socket => socket !== ws);
    });
});

server.listen(8080, () => {
    console.log('Server listening on port 8080');
    startMinecraftServer();
});