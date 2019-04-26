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

I used my drop in web framework that uses http2.

Everything else is fairly straight forward.

When a client makes a request to the server, it fetches the resources from the given links. I already was using Promise.all, so for consistency that is why I choose axios.

A fetch per request basis is NOT correct. If we have thousands of clients hitting this endpoint that's a ton of requests back
and forth. Some method of caching must be utilyzed for a sitution like this. Espiecially when bunk data or no data all is returned. Traffic sensitive/dependent time intervals should be used for refreashing the data cache.

Furthermore, depending on the project scale, the cluster module should be used. And then load balancing, proxies, etc.


## Links

https://github.com/roecrew

Resume is in this repo.
