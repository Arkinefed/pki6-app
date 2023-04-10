var express = require('express');
var router = express.Router();

const { google } = require('googleapis');
const OAuth2Data = require('../google_auth.json')

const CLIENT_ID = OAuth2Data.web.client_id;
const CLIENT_SECRET = OAuth2Data.web.client_secret;
const REDIRECT_URL = OAuth2Data.web.redirect_uris[0];

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL)
var authed = false;
let loggedUser;

router.get('/', (req, res) => {
	if (!authed) {
		// Generate an OAuth URL and redirect there
		const url = oAuth2Client.generateAuthUrl({
			access_type: 'offline',
			scope: 'https://www.googleapis.com/auth/userinfo.profile'
		});
		console.log(url)
		res.redirect(url);
	} else {
		var oauth2 = google.oauth2({ auth: oAuth2Client, version: 'v2' });
		oauth2.userinfo.v2.me.get(function (err, result) {
			if (err) {
				console.log(err);
			}
			else {
				loggedUser = result.data.name;
				console.log(loggedUser);
			}

			res.send('Logged in: '.concat(loggedUser, ' <img src="', result.data.picture, '" width="23" height="23">'))
		});
	}
})

router.get('/auth/google/callback', function (req, res) {
	const code = req.query.code
	if (code) {
		// Get an access token based on our OAuth code
		oAuth2Client.getToken(code, function (err, tokens) {
			if (err) {
				console.log('Error authenticating')
				console.log(err);
			} else {
				console.log('Successfully authenticated');
				oAuth2Client.setCredentials(tokens);
				authed = true;
				res.redirect('/')
			}
		});
	}
});

module.exports = router;
