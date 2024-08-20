const express = require('express');
const axios = require('axios');
const { Client } = require('discord.js');
const Docker = require('dockerode');
const { Client: SSHClient } = require('ssh2');

const app = express();
const port = 3000;

const path = require('path');

app.use(express.static(path.join(__dirname, '../frontend')));

// Initialize Docker
const docker = new Docker();

// Initialize Discord client
const discordClient = new Client({ intents: [] });

// Configuration
const DISCORD_CLIENT_ID = 'YOUR_DISCORD_CLIENT_ID';
const DISCORD_CLIENT_SECRET = 'YOUR_DISCORD_CLIENT_SECRET';
const REDIRECT_URI = 'http://localhost:3000/auth/discord/callback';

const AUTH_URL = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify`;
const TOKEN_URL = 'https://discord.com/api/oauth2/token';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware to handle Discord authentication
app.get('/auth/discord', (req, res) => {
  res.redirect(AUTH_URL);
});

app.get('/auth/discord/callback', async (req, res) => {
  const { code } = req.query;

  try {
    const response = await axios.post(TOKEN_URL, new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      scope: 'identify'
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const { access_token } = response.data;
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const user = userResponse.data;
    res.send(`Hello, ${user.username}! You are now authenticated.`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Authentication failed.');
  }
});

// Create a Docker container
app.post('/create-server', async (req, res) => {
  const { imageName } = req.body; // Example: 'ubuntu:latest'

  try {
    const container = await docker.createContainer({
      Image: imageName,
      Cmd: ['/bin/bash'],
      Tty: true,
      ExposedPorts: { '22/tcp': {} },
      HostConfig: {
        PortBindings: { '22/tcp': [{ HostPort: '2222' }] }
      }
    });

    await container.start();
    res.status(201).send(`Server created with ID ${container.id}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Failed to create server.');
  }
});

// Manage Docker containers (start, stop, restart)
app.post('/manage-server/:action', async (req, res) => {
  const { action } = req.params;
  const { containerId } = req.body;

  try {
    const container = docker.getContainer(containerId);
    if (action === 'start') await container.start();
    if (action === 'stop') await container.stop();
    if (action === 'restart') await container.restart();
    res.send(`Server ${action}ed.`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Failed to manage server.');
  }
});

// SSH into Docker container
app.post('/ssh', async (req, res) => {
  const { containerId } = req.body;

  try {
    const container = docker.getContainer(containerId);
    const exec = await container.exec({
      Cmd: ['sh'],
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      Tty: true
    });

    exec.start((err, stream) => {
      if (err) return res.status(500).send('Failed to start SSH session.');

      stream.on('data', (data) => {
        // Handle SSH output here
        console.log(data.toString());
      });

      stream.on('end', () => {
        res.send('SSH session ended.');
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Failed to SSH into server.');
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
