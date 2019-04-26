# blueprint-coding

## Setup

Generate Self Signed SSL Cert with openssl.

```
openssl genrsa -out localhost.key 2048
openssl req -new -x509 -key localhost.key -out localhost.cert -days 1526 -subj /CN=localhost
```

NOTE: use the -k flag with curl (it's picky about self signed and rightly so).


Axios is the only 3rd party module needed. This module was choosen because of promises.
```
npm i axios
```

## Explanation

My main goal was to keep things simple. I've already gone overtime so I'll make this quick.

I used my drop-in web framework that uses http2.

Everything else is fairly straight forward. Use promises and try/catch.

When a client makes a request to the server (http2 + SSL), it fetches the resources from the given links (https). I already was using Promise.all, so for consistency that is why I choose axios.

A N fetch per request (where N is the number of urls) basis is NOT correct. If we have thousands of clients hitting this endpoint that's a ton of requests back and forth. Some method of caching must be utilyzed for a sitution like this. Especially when bunk data or no data at all is returned. Traffic sensitive/dependent time intervals should be used for refreshing the cache.

Furthermore, depending on the project scale, the cluster module should be used. And then load balancing, proxies, etc.
Where and how data can be cached is project dependent. I would start with tmp dirs. Depending on other use cases, a database may be more suitable, relational or non-relational. If the project is small scale or on embedded systems, then I would recommend C.

## Links

https://github.com/roecrew/nymph

https://www.awwwards.com/sites/brandonjbarber - I submitted one of my personal websites to awwwards. I'm happy to say it ways nominated. Unfortunately, it is no longer a live site :/

I'm in the process of creating a moduler based CMS. I have it in a private repository. I'm happy to share some of it.

Resume is in this repo.
