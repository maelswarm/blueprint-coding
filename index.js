const Doppel = require('./doppel.js');
const app = new Doppel({ cert: "./localhost.cert", key: "./localhost.key", http: false });
const axios = require("axios");

let urls = ["https://takehome.io/twitter", "https://takehome.io/facebook", "https://takehome.io/instagram"]

let fetchUrl = async (url) => {

    try {
        const response = await axios.get(url);
        let data = response.data;
        if (typeof (data) != 'object') {
            return undefined;
        }
        return data;
    } catch (error) {
        return undefined;
    }
}


const fetchSocial = async () => {
    return Promise.all(
        urls.map(async url => {
            return await fetchUrl(url);
        })
    );
}


app.get("/", (req, res) => {
    fetchSocial().then((result) => {
        res.send(JSON.stringify(result));
    }).catch((error) => {
        res.send({}, { ":status": 404 });
    });
});

app.start("127.0.0.1", 3000);