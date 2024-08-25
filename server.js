const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

// Initialize the Express app
const app = express();

// MongoDB Connection
mongoose.connect('mongodb+srv://anujkumarsinghcoder:QgSvKNYjniJWzg0F@project-next.amlt0ce.mongodb.net/?retryWrites=true&w=majority&appName=project-next');

// Middleware to parse JSON
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Set EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Define models
const { User, Link } = require('./models');

// Utility function to fetch stats
const fetchLinkStatsFromPlausible = async (linkUrl) => {
    try {
        const response = await axios.get('https://plausible.io/api/v1/stats/aggregate', {
            params: {
                site_id: '7535-2409-4081-2e1b-811d-7c22-6e24-f5d9-e905.ngrok-free.app',
                metrics: 'visitors',
                date_range: '7d',
                dimensions: ['time:day', 'event:props:url'],
                filters: JSON.stringify([['is', 'event:props:url', [linkUrl]]]),
                order_by: [['time:day', 'asc']],
            },
            headers: {
                'Authorization': `Bearer z_0FJcWNYgW-F3QF-0fkatXdOdnC4H7X4RQ9dkPunSGlORVRCoq1EI6RKAAioq8D`,
            }
        });

        const result = response.data.results;
        if (!result) {
            throw new Error('Unexpected response format: results is missing');
        }

        const stats = [{
            date: result.time?.value || 'Unknown',
            visitors: result.visitors?.value || 0,
            url: result.dim1?.value || 'Unknown',
        }];

        return stats;
    } catch (error) {
        console.error('Error fetching link stats from Plausible:', error.message);
        return [];
    }
};

// Serve the homepage with a form to add users
app.get('/', (req, res) => {
    res.render('index');
});

// API Route to add a new user
app.post('/api/add-user', async (req, res) => {
    try {
        const { username, email } = req.body;

        const newUser = new User({
            username,
            email,
        });

        await newUser.save();

        res.redirect(`/user/${newUser.username}`);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// API Route to add a new link for a user
app.post('/api/add-link', async (req, res) => {
    try {
        const { url, userId } = req.body;

        const visitCount = await fetchLinkStatsFromPlausible(url);

        const newLink = new Link({
            user: userId,
            url,
            visits: visitCount.length > 0 ? visitCount[0].visitors : 0,
        });

        await newLink.save();

        const user = await User.findById(userId);

        res.redirect(`/user/${user.username}`);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Serve user-specific pages with forms to add links
// Serve user-specific pages with forms to add links
app.get('/user/:username', async (req, res) => {
    try {
        const { username } = req.params;
        console.log(`Fetching user with username: ${username}`);

        const user = await User.findOne({ username });
        if (!user) {
            console.log(`User not found: ${username}`);
            return res.status(404).send('User not found');
        }

        console.log(`Found user: ${user.username}`);
        let links = await Link.find({ user: user._id });
        console.log(`Found ${links.length} links for user: ${user.username}`);

        // Fetch stats for each link and update in the database
        await Promise.all(links.map(async (link) => {
            try {
                console.log(`Fetching stats for link: ${link.url}`);
                const visitCount = await fetchLinkStatsFromPlausible(link.url);
                console.log(`Stats fetched for link ${link.url}:`, visitCount);
        
                if (visitCount.length > 0) {
                    link.visits = visitCount[0].visitors;
                    await link.save();
                    console.log(`Updated visits for link ${link.url}: ${link.visits}`);
                } else {
                    console.log(`No valid stats returned for link ${link.url}, skipping update.`);
                }
            } catch (error) {
                console.error(`Error fetching stats for link ${link.url}:`, error.message);
            }
        }));
        

        // Re-fetch links with updated visit counts
        links = await Link.find({ user: user._id });
        console.log(`Re-fetched links with updated visit counts`);

        res.render('user', { user, links });
    } catch (error) {
        console.error('Error in /user/:username route:', error.stack || error.message);
        res.status(500).send('Internal Server Error');
    }
});




// New route to display all links and their stats
app.get('/all-stats', async (req, res) => {
    try {
        const links = await Link.find().populate('user');

        const stats = await Promise.all(
            links.map(async (link) => {
                const visitCount = await fetchLinkStatsFromPlausible(link.url);
                return {
                    username: link.user.username,
                    url: link.url,
                    visits: visitCount.length > 0 ? visitCount[0].visitors : 0,
                };
            })
        );

        console.log(stats , "AAAAAAAAA")

        res.render('all-stats', { stats });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Start the server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
