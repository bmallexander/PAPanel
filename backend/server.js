const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const mongoose = require('mongoose');
const User = require('./models/User');
const Server = require('./models/Server');
const Docker = require('dockerode');  // Docker client library
const docker = new Docker(); // Docker client instance
const { exec } = require('child_process');
const app = express();
const PORT = process.env.PORT || 3000;

mongoose.connect('mongodb+srv://mainuser:Allexander01@cluster0.3owwf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'your_session_secret',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new DiscordStrategy({
    clientID: '1272176739841216523',
    clientSecret: 'wLgvzEkGysqr3elBhKIKRmsbEaZfOu7r',
    callbackURL: 'http://46.8.231.32:3000/auth/discord/callback',
    scope: ['identify']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const user = await User.findOneAndUpdate(
            { discordId: profile.id },
            { username: profile.username },
            { upsert: true, new: true }
        );
        done(null, user);
    } catch (err) {
        done(err);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});

// Routes for authentication
app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/'); // Redirect to main page or dashboard
});

app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

// Middleware to check authentication
const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/auth/discord');
};

// Main page or dashboard
app.get('/', ensureAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Create server route
app.post('/create-server', ensureAuthenticated, async (req, res) => {
    const { imageName } = req.body;
    const userId = req.user._id;

    try {
        const container = await docker.createContainer({
            Image: imageName,
            Cmd: ['/bin/sh'],
            Tty: true
        });
        await container.start();

        const server = new Server({
            userId,
            dockerId: container.id,
            status: 'running'
        });
        await server.save();

        res.send('Server created successfully.');
    } catch (error) {
        res.status(500).send('Failed to create server.');
    }
});

// List servers route
app.get('/list-servers', ensureAuthenticated, async (req, res) => {
    const userId = req.user._id;

    try {
        const servers = await Server.find({ userId }).exec();
        res.json(servers);
    } catch (error) {
        res.status(500).send('Failed to list servers.');
    }
});

// Manage server route
app.post('/manage-server/:action', ensureAuthenticated, async (req, res) => {
    const { action } = req.params;
    const { containerId } = req.body;
    const userId = req.user._id;

    try {
        const server = await Server.findOne({ dockerId: containerId, userId });
        if (!server) {
            return res.status(403).send('Unauthorized to manage this server.');
        }

        const container = docker.getContainer(containerId);
        if (action === 'start') await container.start();
        if (action === 'stop') await container.stop();
        if (action === 'restart') await container.restart();

        server.status = action === 'start' ? 'running' : action === 'stop' ? 'stopped' : 'restarted';
        await server.save();

        res.send(`Server ${action}ed.`);
    } catch (error) {
        res.status(500).send('Failed to manage server.');
    }
});

// SSH route (with tmate integration)
app.post('/ssh', ensureAuthenticated, async (req, res) => {
    const { containerId } = req.body;
    const userId = req.user._id;

    try {
        const server = await Server.findOne({ dockerId: containerId, userId });
        if (!server) {
            return res.status(403).send('Unauthorized to access this server.');
        }

        // Create a tmate session
        exec(`tmate -S /tmp/tmate.sock new-session -d`, (err, stdout, stderr) => {
            if (err) {
                console.error('Error creating tmate session:', stderr);
                return res.status(500).send('Failed to create SSH session.');
            }

            exec(`tmate -S /tmp/tmate.sock display -p '#{tmate_ssh}'`, (err, stdout) => {
                if (err) {
                    console.error('Error displaying tmate SSH address:', stderr);
                    return res.status(500).send('Failed to retrieve SSH session.');
                }

                const sshAddress = stdout.trim();
                res.json({ sshAddress });
            });
        });
    } catch (error) {
        res.status(500).send('Failed to open SSH session.');
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
