var express = require('express');
var router = express.Router();

const { google } = require('googleapis');
const OAuth2Data = require('../google_auth.json')

const CLIENT_ID = OAuth2Data.web.client_id;
const CLIENT_SECRET = OAuth2Data.web.client_secret;
const REDIRECT_URL = OAuth2Data.web.redirect_uris[0];

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);
var authed = false;
var loggedUser = 'null';
var picture = 'null';

router.get('/', (req, res) => {
	if (authed) {
		var oauth2 = google.oauth2({ auth: oAuth2Client, version: 'v2' });
		new Promise(function (resolve, reject) {
			oauth2.userinfo.v2.me.get(function (err, result) {
				if (err) {
					console.log(err);
					reject(err);
				}
				else {
					loggedUser = result.data.name;
					picture = result.data.picture;
					console.log(loggedUser);
					resolve();
				}
			});
		}).then(function () {
			res.render("index", { authed: authed, user: loggedUser, picture: picture, title: 'pki6-app' });
		});
	}
	else {
		res.render("index", { authed: authed, user: loggedUser, picture: picture, title: 'pki6-app' });
	}
});

router.get('/login', (req, res) => {
	if (!authed) {
		// Generate an OAuth URL and redirect there
		const url = oAuth2Client.generateAuthUrl({
			access_type: 'offline',
			scope: 'https://www.googleapis.com/auth/userinfo.profile'
		});
		console.log(url);
		res.redirect(url);
	}
	else {
		res.redirect('/');
	}
});

router.get('/logout', (req, res) => {
	if (authed) {
		oAuth2Client.revokeCredentials((err, result) => {
			if (err) {
				console.log('Error revoking token', err);
			} else {
				console.log('Token revoked');
			}
		});

		authed = false;
		loggedUser = 'null';
		picture = 'null';
	}

	res.redirect('/');
});

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

				res.redirect('/');
			}
		});
	}
});

module.exports = router;
