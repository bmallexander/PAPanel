document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('create-server-form');
    const serverList = document.getElementById('server-list');

    form.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent default form submission

        const imageName = document.getElementById('imageName').value;

        try {
            const response = await fetch('/create-server', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ imageName }),
            });

            if (!response.ok) {
                throw new Error('Network response was not ok.');
            }

            const result = await response.text();
            alert(result);
            form.reset();
            loadServers();
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to create server. Please check the console for details.');
        }
    });

    async function loadServers() {
        try {
            const response = await fetch('/list-servers');
            if (!response.ok) {
                throw new Error('Failed to fetch servers.');
            }
            const servers = await response.json();

            serverList.innerHTML = servers.map(server => `
                <tr>
                    <td>${server.dockerId.substring(0, 12)}...</td>
                    <td>${server.status}</td>
                    <td>
                        <button class="btn btn-success btn-sm" onclick="manageServer('${server.dockerId}', 'start')">Start</button>
                        <button class="btn btn-danger btn-sm" onclick="manageServer('${server.dockerId}', 'stop')">Stop</button>
                        <button class="btn btn-warning btn-sm" onclick="manageServer('${server.dockerId}', 'restart')">Restart</button>
                        <button class="btn btn-info btn-sm" onclick="openTmateSession('${server.dockerId}')">Open SSH</button>
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

    window.openTmateSession = async (id) => {
        try {
            const response = await fetch('/ssh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ containerId: id }),
            });

            if (!response.ok) {
                throw new Error('Failed to open SSH session.');
            }

            const { sshAddress } = await response.json();
            if (sshAddress) {
                alert(`Connect using SSH: ${sshAddress}`);
            } else {
                alert('Failed to retrieve SSH session.');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    loadServers();
});
