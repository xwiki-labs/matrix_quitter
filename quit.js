const Matrix = require("matrix-js-sdk");
const Pg = require('pg');
const nThen = require('nthen');

const Config = require('./config.js');

const getAccessToken = (pg, user, cb) => {
    pg.query('SELECT token from access_tokens WHERE user_id = $1 LIMIT 1;', [user], (err, res) => {
        if (err) { return void cb(err); }
        if (!res.rowCount) { return void cb(new Error("No access token for user " + user)); }
        cb(undefined, res.rows[0].token);
    });
};

const getFullUserName = (u) => {
    return (u.indexOf('@') ? '@' : '') + u + ((1 + u.indexOf(':')) ? '' : (':' + Config.homeserver));
};

const getRoomsForUser = (client) => {
};

const USER = 'iinsuratelu';

const main = () => {
    const input = process.argv[process.argv.length-1];
    if (input.indexOf('.js') !== -1 || process.argv.length < 3) {
        console.log('Usage: node ./quit.js <user name>  # Make someone leave all rooms');
        return;
    }

    const user = getFullUserName(input);
    console.log("Removing " + user + ' from all rooms.');
    const pg = new Pg.Pool(Config.db);
    
    let token;
    let client;
    nThen((waitFor) => {
        getAccessToken(pg, user, waitFor((err, t) => {
            if (err) { throw err; }
            token = t;
        }));
    }).nThen((waitFor) => {
        client = Matrix.createClient({
            baseUrl: 'https://' + Config.homeserver,
            accessToken: token,
            userId: user
        });

        const done = waitFor();
        client.on('sync', function (state, prevState, data) {
            if (state === 'ERROR') { console.log(data); }
            if (state === 'PREPARED') { done(); }
        });
        client.startClient();
    }).nThen((waitFor) => {
        let nt = nThen;
        console.log("Rooms to leave:")
        client.getRooms().forEach((r) => {
            console.log(r.name + ' (' + r.roomId + ')');
            nt = nt((waitFor) => {
                const doit = () => {
                    client.leave(r.roomId, waitFor((err, ret) => {
                        if (err && err.errcode === 'M_LIMIT_EXCEEDED') {
                            setTimeout(waitFor(doit), err.data.retry_after_ms);
                            return;
                        }
                        console.log("Leaving " + r.name + ' (' + r.roomId + ')');
                        if (err && err.errcode === 'M_FORBIDDEN' &&
                            err.message.indexOf(' not in room ') > -1)
                        {
                            // false positive
                            return;
                        }
                        if (err) { console.log("ERROR:"); console.log(err); console.log(r); }
                        if (ret && JSON.stringify(ret) !== '{}') { console.log(ret); }
                    }));
                };
                doit();
            }).nThen;
        });
        console.log('\n\n');
        nt(waitFor());
    }).nThen((waitFor) => {
        console.log("\nDone");
        client.stopClient();
        pg.end();
    });
};
main();