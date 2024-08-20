document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('create-server-form');
    const serverList = document.getElementById('server-list');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const imageName = document.getElementById('imageName').value;

        try {
            const response = await fetch('/create-server', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ imageName }),
            });

            const result = await response.text();
            alert(result);
            form.reset();
            loadServers();
        } catch (error) {
            console.error('Error:', error);
        }
    });

    async function loadServers() {
        try {
            const response = await fetch('/list-servers'); // Create an endpoint for listing servers
            const servers = await response.json();

            serverList.innerHTML = servers.map(server => `
                <tr>
                    <td>${server.id}</td>
                    <td>${server.status}</td>
                    <td>
                        <button class="btn btn-success btn-sm" onclick="manageServer('${server.id}', 'start')">Start</button>
                        <button class="btn btn-danger btn-sm" onclick="manageServer('${server.id}', 'stop')">Stop</button>
                        <button class="btn btn-warning btn-sm" onclick="manageServer('${server.id}', 'restart')">Restart</button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error:', error);
        }
    }

    window.manageServer = async (id, action) => {
        try {
            const response = await fetch(`/manage-server/${action}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ containerId: id }),
            });

            const result = await response.text();
            alert(result);
            loadServers();
        } catch (error) {
            console.error('Error:', error);
        }
    };

    loadServers();
});
