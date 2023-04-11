var express = require('express');
var router = express.Router();

const axios = require('axios');

const { google } = require('googleapis');
const googleOAuth2 = require('../google_auth.json');
const githubOAuth2 = require('../github_auth.json');

// google auth
const googleAuthConfig = {
	CLIENT_ID: googleOAuth2.web.client_id,
	CLIENT_SECRET: googleOAuth2.web.client_secret,
	REDIRECT_URL: googleOAuth2.web.redirect_uris[0]
};

const googleOAuth2Client = new google.auth.OAuth2(googleAuthConfig.CLIENT_ID, googleAuthConfig.CLIENT_SECRET, googleAuthConfig.REDIRECT_URL);

const googleAuthState = {
	authed: false,
	loggedUser: 'null',
	picture: 'null'
};

// github auth
const githubAuthConfig = {
	client_id: githubOAuth2.client_id,
	client_secret: githubOAuth2.client_secret
};

const githubAuthState = {
	authed: false,
	loggedUser: 'null',
	token: ''
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
					console.log(result.data);

					googleAuthState.loggedUser = result.data.name;
					googleAuthState.picture = result.data.picture;
					console.log(googleAuthState.loggedUser);
					resolve();
				}
			});
		}).then(function () {
			res.render("index", {
				authed: googleAuthState.authed || githubAuthState.authed,

				authedGoogle: googleAuthState.authed,
				userGoogle: googleAuthState.loggedUser,
				pictureGoogle: googleAuthState.picture,

				authedGithub: githubAuthState.authed,
				userGithub: githubAuthState.loggedUser,

				title: 'pki6-app'
			});
		});
	}
	else if (githubAuthState.authed) {
		axios({
			method: 'get',
			url: `https://api.github.com/user`,
			headers: {
				Authorization: 'token ' + githubAuthState.token
			}
		}).then((response) => {
			githubAuthState.loggedUser = response.data.login;

			res.render("index", {
				authed: googleAuthState.authed || githubAuthState.authed,

				authedGoogle: googleAuthState.authed,
				userGoogle: googleAuthState.loggedUser,
				pictureGoogle: googleAuthState.picture,

				authedGithub: githubAuthState.authed,
				userGithub: githubAuthState.loggedUser,

				title: 'pki6-app'
			});
		})
	}
	else {
		res.render("index", {
			authed: googleAuthState.authed || githubAuthState.authed,

			authedGoogle: googleAuthState.authed,
			userGoogle: googleAuthState.loggedUser,
			pictureGoogle: googleAuthState.picture,

			authedGithub: githubAuthState.authed,
			userGithub: githubAuthState.loggedUser,

			title: 'pki6-app'
		});
	}
});

router.get('/login/google', (req, res) => {
	if (!(googleAuthState.authed || githubAuthConfig.authed)) {
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

router.get('/login/github', (req, res) => {
	if (!(googleAuthState.authed || githubAuthConfig.authed)) {
		res.redirect('https://github.com/login/oauth/authorize?client_id=' + githubAuthConfig.client_id);
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

	if (githubAuthState.authed) {
		githubAuthState.authed = false;
		githubAuthState.loggedUser = 'null';
		githubAuthState.token = '';
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

router.get('/auth/github/callback', function (req, res) {
	const token = req.query.code

	axios({
		method: 'post',
		url: `https://github.com/login/oauth/access_token?client_id=${githubAuthConfig.client_id}&client_secret=${githubAuthConfig.client_secret}&code=${token}`,
		headers: {
			accept: 'application/json'
		}
	}).then((response) => {
		githubAuthState.authed = true;
		githubAuthState.token = response.data.access_token;

		console.log(githubAuthState);

		res.redirect('/');
	});
});

module.exports = router;
