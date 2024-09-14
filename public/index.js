//Initiate websocket here to get information.
//Reload page if websocket dies.
var on = true;
var selectedFile = null;
var currentPath = "";
document.getElementById('console-view').style.display = 'block';

// Set up event listeners for tabs
document.getElementById('console-tab').addEventListener('click', () => {
    document.getElementById('console-view').style.display = 'block';
    document.getElementById('files-view').style.display = 'none';
    document.getElementById('console-tab').classList.add('active');
    document.getElementById('files-tab').classList.remove('active');
});

document.getElementById('files-tab').addEventListener('click', () => {
    document.getElementById('console-view').style.display = 'none';
    document.getElementById('files-view').style.display = 'block';
    document.getElementById('console-tab').classList.remove('active');
    document.getElementById('files-tab').classList.add('active');
    socket.send(JSON.stringify({ type: 'list-files' ,content:""}));
    currentPath = "";
});
document.getElementById('restart-command').addEventListener('click', () => {
    document.getElementById('restart-command').classList.add('waiting');
    document.getElementById('restart-command').innerText = 'Restarting...';
    document.getElementById('startstop-command').style.display = 'none';

});
document.getElementById('startstop-command').addEventListener('click', () => {
    document.getElementById('restart-command').style.display = 'none';
    document.getElementById('startstop-command').classList.add('waiting');
    on = !on;
    if (on) {
        document.getElementById('startstop-command').innerText = 'Starting...';
    }else{
        document.getElementById('startstop-command').innerText = 'Stopping...';
    }
});



function resetCommands() {
    document.getElementById('restart-command').style.display = 'block';
    document.getElementById('startstop-command').style.display = 'block';
    document.getElementById('restart-command').classList.remove('waiting');
    document.getElementById('restart-command').innerText = 'Restart';
    document.getElementById('startstop-command').classList.remove('waiting');
    if (!on) {
        document.getElementById('startstop-command').innerText = 'Start';
    }else{
        document.getElementById('startstop-command').innerText = 'Shutdown';
    }
}






// Establish a connection to the WebSocket server
var socket = new WebSocket('ws://localhost:8080');

// Set up event listeners for the WebSocket connection
socket.onopen = function() {
    console.log('Connected to the WebSocket server');
};

socket.onmessage = function(event) {
var message = JSON.parse(event.data);
switch (message.type) {
    case 'output':
        // Display Minecraft server output in the chat log
        var log = document.getElementById('chat-log');
        log.innerHTML += `<p>${message.content}</p>`;
        log.scrollTop = log.scrollHeight;
        break;
    case 'status':
        if (message.content === 'running') {
            document.getElementById('startstop-command').innerText = 'Shutdown';
            on = true;
        } else {
            document.getElementById('startstop-command').innerText = 'Start';
            on = false;
        }
        resetCommands();
        break;
    case 'file-list':
            displayFiles(message.content);
            break;
    case 'file-content':
            showFileContent(message.content);
            break;
    default:
        console.log(`Unknown message type: ${message.type}`);
}
};

socket.onclose = function() {
console.log('Disconnected from the WebSocket server');
    // Reload the page to reconnect
    window.location.reload();
};










// Send a message to the server when the send command button is clicked
document.getElementById('send-command').addEventListener('click', function() {
    var command = document.getElementById('command-input').value;
    socket.send(JSON.stringify({ type: 'command', content: command }));
    document.getElementById('command-input').value = "";
});

// Send a message to the server when the restart button is clicked
document.getElementById('restart-command').addEventListener('click', function() {
    socket.send(JSON.stringify({ type: 'restart' }));
});

// Send a message to the server when the start/stop button is clicked
document.getElementById('startstop-command').addEventListener('click', function() {
    if (!on) {
        socket.send(JSON.stringify({ type: 'shutdown' }));
    } else {
        socket.send(JSON.stringify({ type: 'start' }));
    }
}); 

document.getElementById('view-btn').addEventListener('click', () => {
    if (selectedFile) {
        if(currentPath == ""){
            socket.send(JSON.stringify({ type: 'view', content : currentPath +"/"+ selectedFile }));
        }else{
            socket.send(JSON.stringify({ type: 'view', content : currentPath +"/"+ selectedFile }));
        }
    }
});

document.getElementById('back-btn').addEventListener('click', () => {
    currentPath = currentPath.substring(0, currentPath.lastIndexOf('/')) || '';
    loadFiles(currentPath);
});






function loadFiles(path) {
    socket.send(JSON.stringify({ type: 'list-files', content: path }));
}

function displayFiles(files) {
    selectedFile = "";
    if(currentPath=="") document.getElementById('back-btn').style.display = 'none';
    else document.getElementById('back-btn').style.display = 'block';
    document.getElementById('view-btn').style.display = 'none';
    var fileList = '';
    files.forEach(function(file) {
        fileList += `<li onclick='selectFile("${file}")'>${file}</li>`;
    });
    document.getElementById('file-list').innerHTML = fileList;
}

function selectFile(file) {
    selectedFile = file;
    document.getElementById('file-list').childNodes.forEach(function(li) {
        li.style.backgroundColor  = '#fff';
        if(li.innerText == file)  li.style.backgroundColor  = '#0056b3';
    });
    if(!file.includes(".")) {
        currentPath+= '/'+file;
        loadFiles(currentPath);
        document.getElementById('view-btn').style.display = 'none';
        return;
    }
    if (file.endsWith('.properties') || file.endsWith('.yml') || file.endsWith('.json') || file.endsWith('.txt')) {
        document.getElementById('view-btn').style.display = 'inline';
    } else {
        document.getElementById('view-btn').style.display = 'none';
    }
}

function showFileContent(content) {
    var editor = window.open("", selectFile, "width=600,height=400");
    editor.document.write('<textarea style="width:100%; height:100%">' + content + '</textarea>');
}