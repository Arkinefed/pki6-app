var express = require('express');
var router = express.Router();

const { google } = require('googleapis');
const OAuth2Data = require('../google_auth.json')

const googleAuthConfig = {
	CLIENT_ID: OAuth2Data.web.client_id,
	CLIENT_SECRET: OAuth2Data.web.client_secret,
	REDIRECT_URL: OAuth2Data.web.redirect_uris[0]
};

const googleOAuth2Client = new google.auth.OAuth2(googleAuthConfig.CLIENT_ID, googleAuthConfig.CLIENT_SECRET, googleAuthConfig.REDIRECT_URL);

const googleAuthState = {
	authed: false,
	loggedUser: 'null',
	picture: 'null'
};

router.get('/', (req, res) => {
	if (googleAuthState.authed) {
		var oauth2 = google.oauth2({ auth: googleOAuth2Client, version: 'v2' });
		new Promise(function (resolve, reject) {
			oauth2.userinfo.v2.me.get(function (err, result) {
				if (err) {
					console.log(err);
					reject(err);
				}
				else {
					googleAuthState.loggedUser = result.data.name;
					googleAuthState.picture = result.data.picture;
					console.log(googleAuthState.loggedUser);
					resolve();
				}
			});
		}).then(function () {
			res.render("index", { authed: googleAuthState.authed, user: googleAuthState.loggedUser, picture: googleAuthState.picture, title: 'pki6-app' });
		});
	}
	else {
		res.render("index", { authed: googleAuthState.authed, user: googleAuthState.loggedUser, picture: googleAuthState.picture, title: 'pki6-app' });
	}
});

router.get('/login/google', (req, res) => {
	if (!googleAuthState.authed) {
		const url = googleOAuth2Client.generateAuthUrl({
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
	if (googleAuthState.authed) {
		googleOAuth2Client.revokeCredentials((err, result) => {
			if (err) {
				console.log('Error revoking token', err);
			} else {
				console.log('Token revoked');
			}
		});

		googleAuthState.authed = false;
		googleAuthState.loggedUser = 'null';
		googleAuthState.picture = 'null';
	}

	res.redirect('/');
});

router.get('/auth/google/callback', function (req, res) {
	const code = req.query.code

	if (code) {
		googleOAuth2Client.getToken(code, function (err, tokens) {
			if (err) {
				console.log('Error authenticating')
				console.log(err);
			} else {
				console.log('Successfully authenticated');
				googleOAuth2Client.setCredentials(tokens);
				googleAuthState.authed = true;

				res.redirect('/');
			}
		});
	}
});

module.exports = router;
