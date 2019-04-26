const http = require("http");
const http2 = require("http2");
const fs = require("fs");

const HTTP2_KEYS = Object.keys(http2.constants);
const HTTP2_VALUES = Object.values(http2.constants);

const {
    HTTP2_HEADER_METHOD,
    HTTP2_HEADER_PATH,
    HTTP2_HEADER_AUTHORITY,
    HTTP2_HEADER_SCHEME,
    HTTP2_HEADER_STATUS,
    HTTP2_HEADER_CONTENT_TYPE,
    NGHTTP2_REFUSED_STREAM
} = http2.constants;

let decodeURI = true;

const defaultHeaders = {
    ":status": 200,
    "content-type": "*/*; charset=utf-8"
};

function Request(headers, data, path) {
    this.headers = headers;
    this.body = data === "" ? undefined : data;
    this.query = path.searchParams;
    this.path = decodeURI ? decodeURIComponent(path.pathname) : path.pathname;
    if (path.pathname.length > 1) {
        this.segments = path.pathname.split("/");
        this.segments.shift();
    }
}

function Response(stream) {
    this.send = (data, headers) => {
        headers = headers ? headers : defaultHeaders;
        stream.respond(headers);
        stream.end(data);
    };
    this.sendFile = (filepath, headers) => {
        headers = headers ? headers : defaultHeaders;
        stream.respondWithFile(filepath, headers);
    };
    this.pushFile = (route, filepath, headers) => {
        stream.pushStream({ ":path": route }, (err, pushStream) => {
            pushStream.on("error", err => {
                const isRefusedStream =
                    err.code === "ERR_HTTP2_STREAM_ERROR" &&
                    pushStream.rstCode === NGHTTP2_REFUSED_STREAM;
                if (!isRefusedStream) throw err;
            });
            headers = headers !== undefined ? headers : defaultHeaders;
            let expireDate = new Date();
            expireDate.setFullYear(expireDate.getFullYear() + 1);
            expireDate.setDate(expireDate.getDate() - 1);
            headers['expires'] = expireDate;
            headers['last-modified'] = new Date();
            pushStream.respondWithFile(filepath, headers);
        });
    };
    stream.on('error', (err) => {
        if (err) throw err;
        this.send(null, {
            ":status": 404,
            "content-type": "*/*; charset=utf-8"
        });
    });
}

let storeRoutes = args => {
    let path = "";
    let callbacks = [];
    for (let i = 0; i < args.length; ++i) {
        if (i === 0) {
            path = args[i];
        } else {
            if (typeof args[i] === "Array") {
                callbacks.concat(args[i]);
            } else {
                callbacks.push(args[i]);
            }
        }
    }
    return { path, callbacks };
};

function Doppel(options) {
    this.routes = {};
    this.host = options.host || "127.0.0.1";
    this.port = options.port || 443;
    this.http = options.http !== undefined ? options.http : true;
    this.key = options.key ? fs.readFileSync(options.key, "utf8") : undefined;
    this.cert = options.cert ? fs.readFileSync(options.cert, "utf8") : undefined;
    this.ca = options.ca ? fs.readFileSync(options.ca, "utf8") : undefined;
    decodeURI = options.decodeURI || true;
}

HTTP2_KEYS.forEach((key, idx) => {
    if (key.indexOf("HTTP2_METHOD") === 0) {
        Doppel.prototype[HTTP2_VALUES[idx].toLowerCase()] = function () {
            if (this.routes[HTTP2_VALUES[idx]] === undefined) {
                this.routes[HTTP2_VALUES[idx]] = {};
            }
            let { path, callbacks } = storeRoutes(arguments);
            this.routes[HTTP2_VALUES[idx]][path] = { callbacks };
        };
    }
});

let execRoute = (route, i, req, res) => {
    if (i < route.callbacks.length - 1) {
        route.callbacks[i](req, res, () => {
            execRoute(route, i + 1);
        });
    } else if (i === route.callbacks.length - 1) {
        route.callbacks[i](req, res);
    }
};

let determineRoute = (routes, headers, data, path, stream) => {
    const list = routes[headers[HTTP2_HEADER_METHOD]];
    const keys = Object.keys(list);
    let route = undefined;
    for (let i = keys.length - 1; i >= 0; --i) {
        let val = keys[i];
        route = list[val];
        let matchRegExp = new RegExp("^" + val + "$", "g");
        if (matchRegExp.test(path.pathname)) {
            console.log(path.pathname);
            break;
        }
        route = undefined;
    }
    if (route === undefined) {
        stream.respond({ ":status": 404 });
        stream.end();
    } else {
        const req = new Request(headers, data, path);
        const res = new Response(stream);
        execRoute(route, 0, req, res);
    }
};

Doppel.prototype.start = function (host, port) {
    let routes = this.routes;
    host = host || this.host;
    port = port || this.port;
    const server = http2.createSecureServer({ key: this.key, cert: this.cert });
    server.on("stream", (stream, headers, flags, rawHeaders) => {
        const path = new URL(
            headers[HTTP2_HEADER_SCHEME] +
            "://" +
            headers[HTTP2_HEADER_AUTHORITY] +
            headers[HTTP2_HEADER_PATH]
        );
        let data = "";

        stream.on("data", chunk => {
            data += chunk;
        });

        stream.on("end", () => {
            determineRoute(routes, headers, data, path, stream);
        });
    });
    server.listen(port, host);
    if (this.http) {
        http
            .createServer(function (req, res) {
                res.writeHead(301, { Location: "https://" + host });
                res.end();
            })
            .listen(80, host);
    }
};

module.exports = Doppel;
