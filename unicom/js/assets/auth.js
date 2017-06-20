/*
@licstart  The following is the entire license notice for the 
JavaScript code in this page.

Copyright (C) 2015  Sylvain Boily

The JavaScript code in this page is free software: you can
redistribute it and/or modify it under the terms of the GNU
General Public License (GNU GPL) as published by the Free Software
Foundation, either version 3 of the License, or (at your option)
any later version.  The code is distributed WITHOUT ANY WARRANTY;
without even the implied warranty of MERCHANTABILITY or FITNESS
FOR A PARTICULAR PURPOSE.  See the GNU GPL for more details.

As additional permission under GNU GPL version 3 section 7, you
may distribute non-source (e.g., minimized or compacted) forms of
that code without the copy of the GNU GPL normally required by
section 4, provided you include this license notice and a URL
through which recipients can access the Corresponding Source.


@licend  The above is the entire license notice
for the JavaScript code in this page.
*/

/*
 * @class XiVOAuth
 *
 * @public
 */
var XiVOAuth = function(args) {
    this.host = args.host;
    this.port = args.port || 9497;
    this.https_port = args.https_port || 443;
    this.prefix_enabled = args.prefix || false;

    this.api_version = '0.1';
    this.default_backend = 'xivo_service';
    this.prefix = 'api/auth';
}

/*
 * Connection to the REST API
 *
 * @private
 */
XiVOAuth.prototype._connect = function() {
    suffix = ":" + this.port + "/" + this.api_version + "/";
    if (this.prefix_enabled) {
        suffix = ":" + this.https_port + "/" + this.prefix + '/' + this.api_version + "/"
    }
    host = "https://" + this.host + suffix;
    return new $.RestClient(host);
}

/*
 *  Login in service
 *
 *  @param info - dict with username, password, backend and expiration
 *  @public
 */
XiVOAuth.prototype.login = function(info) {
    client = this._connect();
    username = info.username;
    password = info.password;
    backend = info.backend;
    expiration = info.expiration;

    if (expiration == null) {
        expiration = 3600;
    }

    if (backend == null) {
        backend = this.default_backend;
    }

    client.add('token', {
        stripTrailingSlash: true,
        stringifyData: true,
        username: username,
        password: password
    });

    return client.token.create({
        backend: backend,
        expiration: expiration
    });
}

/*
 *  Logout from service
 *
 *  @param token - valid token you want to logout
 *  @public
 */
XiVOAuth.prototype.logout = function(token) {
    client = this._connect();

    client.add('token', {
        stripTrailingSlash: true,
        ajax: { headers: { 'X-Auth-Token': token } }
    });

    return client.token.del(token);
}

/*
 *  Get the all backends support by service
 *
 *  @public
 */
XiVOAuth.prototype.backend = function() {
    client = this._connect();

    client.add('backends', {
        stripTrailingSlash: true,
        stringifyData: true
    });

    return client.backends.read();
}

/*
 *  Verify if token exist
 *
 *  @public
 */
XiVOAuth.prototype.verify_token = function(token) {
    client = this._connect();

    client.add('token', {
        stripTrailingSlash: true
    });

    return client.token.read(token);
}
