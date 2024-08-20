const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).send('Authentication required.');
    }

    try {
        const decoded = jwt.verify(token, 'eazeaea');
        const user = await User.findById(decoded._id);

        if (!user) {
            throw new Error();
        }

        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        res.status(401).send('Invalid authentication token.');
    }
};

module.exports = authenticate;
