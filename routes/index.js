var express = require('express');
var router = express.Router();

const axios = require('axios');

const { google } = require('googleapis');
const googleOAuth2 = require('../google_auth.json');
const githubOAuth2 = require('../github_auth.json');

const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config({ path: '../.env' });

let connectedToDatabase = false;

const getUsersFromDatabase = async () => {
	const { PGHOST, PGDATABASE, PGUSER, PGPASSWORD } = process.env;
	const URL = `postgres://${PGUSER}:${PGPASSWORD}@${PGHOST}/${PGDATABASE}`;

	try {
		const pool = new Pool({
			URL: URL,
			ssl: true
		});

		await pool.connect();
		const res = await pool.query('SELECT * FROM public."users"');

		databaseData.users = res.rows;

		await pool.end();
	} catch (error) {
		console.log(error)
	}
};

const insertOrUpdateUserInDatabase = async (user) => {
	const { PGHOST, PGDATABASE, PGUSER, PGPASSWORD } = process.env;
	const URL = `postgres://${PGUSER}:${PGPASSWORD}@${PGHOST}/${PGDATABASE}`;

	try {
		const pool = new Pool({
			URL: URL,
			ssl: true
		});

		await pool.connect();
		const res = await pool.query(`SELECT * FROM public."users" where name like '${user}'`);

		if (res.rowCount > 0) {
			const res = await pool.query(`update public."users" set lastvisit = CURRENT_TIMESTAMP, counter = counter + 1 where name like '${user}'`);
		}
		else {
			const res = await pool.query(`insert into public."users" (name, counter) values ('${user}', 1)`);
		}

		await pool.end();
	} catch (error) {
		console.log(error)
	}
};

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

const databaseData = {
	users: null
}

router.get('/', (req, res) => {
	getUsersFromDatabase()
		.then({

		})
		.catch(error => console.error(error));

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

					resolve();
				}
			});
		}).then(function () {
			insertOrUpdateUserInDatabase(googleAuthState.loggedUser)
				.then({

				})
				.catch(error => console.error(error));

			connectedToDatabase = true;

			res.render("index", {
				authed: googleAuthState.authed || githubAuthState.authed,

				authedGoogle: googleAuthState.authed,
				userGoogle: googleAuthState.loggedUser,
				pictureGoogle: googleAuthState.picture,

				authedGithub: githubAuthState.authed,
				userGithub: githubAuthState.loggedUser,

				title: 'pki6-app',

				data: databaseData.users,

				connected: connectedToDatabase
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

			insertOrUpdateUserInDatabase(githubAuthState.loggedUser)
				.then(users => {

				})
				.catch(error => console.error(error));

			getUsersFromDatabase()
				.then(users => {

				})
				.catch(error => console.error(error));

			connectedToDatabase = true;

			res.render("index", {
				authed: googleAuthState.authed || githubAuthState.authed,

				authedGoogle: googleAuthState.authed,
				userGoogle: googleAuthState.loggedUser,
				pictureGoogle: googleAuthState.picture,

				authedGithub: githubAuthState.authed,
				userGithub: githubAuthState.loggedUser,

				title: 'pki6-app',

				data: databaseData.users,

				connected: connectedToDatabase
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

			title: 'pki6-app',

			connected: connectedToDatabase
		});
	}
});

router.get('/login/google', (req, res) => {
	if (!(googleAuthState.authed || githubAuthConfig.authed)) {
		const url = googleOAuth2Client.generateAuthUrl({
			access_type: 'offline',
			scope: 'https://www.googleapis.com/auth/userinfo.profile'
		});

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

		res.redirect('/');
	});
});

module.exports = router;
