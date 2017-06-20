/*
@licstart  The following is the entire license notice for the 
JavaScript code in this page.

Copyright (C) 2016  Sylvain Boily

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
 * @class XiVOConfd
 *
 * @public
 */
var XiVOConfd = function(args) {
    this.host = args.host;
    this.token = args.token;
    this.port = args.port || 9486;
    this.https_port = args.https_port || 443;
    this.prefix_enabled = args.prefix || false;

    this.api_version = '1.1';
    this.default_backend = 'xivo_service';
    this.prefix = 'api/confd';
}

/*
 * Connection to the REST API
 *
 * @private
 */
XiVOConfd.prototype._connect = function() {
    suffix = ":" + this.port + "/" + this.api_version + "/";
    if (this.prefix_enabled) {
        suffix = ":" + this.https_port + "/" + this.prefix + '/' + this.api_version + "/"
    }
    host = "https://" + this.host + suffix;
    return new $.RestClient(host);
}

/*
 *  Get a user config
 *  
 *  @param uuid - valid uuid or id of a user
 *  @public
 */
XiVOConfd.prototype.get_user = function(uuid) {
    client = this._connect();

    client.add('users', {
        stripTrailingSlash: true,
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    return client.users.read(uuid);
}

/*
 *  Get confd infos
 *  
 *  @public
 */
XiVOConfd.prototype.infos = function() {
    client = this._connect();

    client.add('infos', {
        stripTrailingSlash: true,
        isSingle: true,
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    return client.infos.read();
}

/*
 *  Get confd user main line param
 *
 *  @param uuid - valid uuid
 *  @public
 */
XiVOConfd.prototype.get_user_associated_line = function(uuid) {
    client = this._connect();

    client.add('users', {
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    client.users.add('lines', { isSingle: true })
                .add('main', { isSingle: true })
                .add('associated', { isSingle: true })
                .add('endpoints', { isSingle: true })
                .add('sip', { isSingle: true, stripTrailingSlash: true });

    return client.users.lines.main.associated.endpoints.sip.read(uuid);
}

/*
 *  Get confd user line param
 *
 *  @param uuid - valid uuid
 *  @param line_id - valid line_id
 *  @public
 */
XiVOConfd.prototype.get_user_line_configuration = function(uuid, line_id) {
    client = this._connect();

    client.add('users', {
        stripTrailingSlash: true,
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    client.users.add('lines')
                .add('associated', { isSingle: true })
                .add('endpoints', { isSingle: true })
                .add('sip', { isSingle: true });

    return client.users.lines.associated.endpoints.sip.read(uuid, line_id);
}

/*
 *  Get confd user services dnd param
 *
 *  @param uuid - valid uuid
 *  @public
 */
XiVOConfd.prototype.get_user_service_dnd = function(uuid) {
    client = this._connect();

    client.add('users', {
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    client.users.add('services', {isSingle: true})
                .add('dnd', {isSingle: true, stripTrailingSlash: true});

    return client.users.services.dnd.read(uuid);
}

/*
 *  Get confd user services unconditional forward param
 *
 *  @param uuid - valid uuid
 *  @public
 */
XiVOConfd.prototype.get_user_service_unconditional_forward = function(uuid) {
    client = this._connect();

    client.add('users', {
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    client.users.add('forwards', {isSingle: true})
                .add('unconditional', {isSingle: true, stripTrailingSlash: true});

    return client.users.forwards.unconditional.read(uuid);
}

/*
 *  Set confd user services dnd param
 *
 *  @param uuid - valid uuid
 *  @param enabled - boolean
 *  @public
 */
XiVOConfd.prototype.set_user_service_dnd = function(uuid, enabled) {
    client = this._connect();

    service = {
        enabled: enabled
    }

    client.add('users', {
        stringifyData: true,
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    client.users.add('services', {isSingle: true})
                .add('dnd', {isSingle: true, stripTrailingSlash: true});

    return client.users.services.dnd.update(uuid, service);
}

/*
 *  Set confd user services unconditional forward param
 *
 *  @param uuid - valid uuid
 *  @param enabled - boolean
 *  @public
 */
XiVOConfd.prototype.set_user_service_unconditional_forward = function(uuid, destination) {
    client = this._connect();

    enabled = false;
    if (destination !== '') {
        enabled = true;
    }

    service = {
        destination: destination,
        enabled: enabled
    }

    client.add('users', {
        stringifyData: true,
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    client.users.add('forwards', {isSingle: true})
                .add('unconditional', {isSingle: true, stripTrailingSlash: true});

    return client.users.forwards.unconditional.update(uuid, service);
}

/*
 *  Set confd user services noanswer forward param
 *
 *  @param uuid - valid uuid
 *  @param enabled - boolean
 *  @public
 */
XiVOConfd.prototype.set_user_service_noanswer_forward = function(uuid, destination) {
    client = this._connect();

    enabled = false;
    if (destination !== '') {
        enabled = true;
    }

    service = {
        destination: destination,
        enabled: enabled
    }

    client.add('users', {
        stringifyData: true,
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    client.users.add('forwards', {isSingle: true})
                .add('noanswer', {isSingle: true, stripTrailingSlash: true});

    return client.users.forwards.noanswer.update(uuid, service);
}

/*
 *  Set confd user services busy forward param
 *
 *  @param uuid - valid uuid
 *  @param enabled - boolean
 *  @public
 */
XiVOConfd.prototype.set_user_service_busy_forward = function(uuid, destination) {
    client = this._connect();

    enabled = false;
    if (destination !== '') {
        enabled = true;
    }

    service = {
        destination: destination,
        enabled: enabled
    }

    client.add('users', {
        stringifyData: true,
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    client.users.add('forwards', {isSingle: true})
                .add('busy', {isSingle: true, stripTrailingSlash: true});

    return client.users.forwards.busy.update(uuid, service);
}

/*
 *  Get confd user services noanswer forward param
 *
 *  @param token - valid token
 *  @param uuid - valid uuid
 *  @public
 */
XiVOConfd.prototype.get_user_service_noanswer_forward = function(uuid) {
    client = this._connect();

    client.add('users', {
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    client.users.add('forwards', {isSingle: true})
                .add('noanswer', {isSingle: true, stripTrailingSlash: true});

    return client.users.forwards.noanswer.read(uuid);
}

/*
 *  Get confd user services busy forward param
 *
 *  @param uuid - valid uuid
 *  @public
 */
XiVOConfd.prototype.get_user_service_busy_forward = function(uuid) {
    client = this._connect();

    client.add('users', {
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    client.users.add('forwards', {isSingle: true})
                .add('busy', {isSingle: true, stripTrailingSlash: true});

    return client.users.forwards.busy.read(uuid);
}

/*
 *  Get confd user lines
 *
 *  @param uuid - valid uuid
 *  @public
 */
XiVOConfd.prototype.get_user_lines = function(uuid) {
    client = this._connect();

    client.add('users', {
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    client.users.add('lines', {isSingle: true, stripTrailingSlash: true});

    return client.users.lines.read(uuid);
}

/*
 *  User change password
 *
 *  @param uuid - valid uuid
 *  @param password - the new password
 *  @public
 */
XiVOConfd.prototype.user_change_password = function(uuid, password) {
    client = this._connect();

    user_password = {
        password: password
    }

    client.add('users', {
        stringifyData: true,
        stripTrailingSlash: true,
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    return client.users.update(uuid, user_password);
}

/*
 *  User change email
 *
 *  @param uuid - valid uuid
 *  @param email - the new email
 *  @public
 */
XiVOConfd.prototype.user_change_email = function(uuid, email) {
    client = this._connect();

    user_email = {
        email: email
    }

    client.add('users', {
        stringifyData: true,
        stripTrailingSlash: true,
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    return client.users.update(uuid, user_email);
}

/*
 *  User change mobile number
 *
 *  @param uuid - valid uuid
 *  @param number - the new mobile number
 *  @public
 */
XiVOConfd.prototype.user_change_mobile = function(uuid, number) {
    client = this._connect();

    user_mobile = {
        mobile_phone_number: number
    }

    client.add('users', {
        stringifyData: true,
        stripTrailingSlash: true,
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    return client.users.update(uuid, user_mobile);
}

/*
 *  User list function keys
 *
 *  @param uuid - valid uuid
 *  @public
 */
XiVOConfd.prototype.user_list_fk = function(uuid) {
    client = this._connect();

    client.add('users', {
        stringifyData: true,
        stripTrailingSlash: true,
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    client.users.add('funckeys', {isSingle: true, stripTrailingSlash: true});

    return client.users.funckeys.read(uuid);
}

/*
 *  User remove function key
 *
 *  @param uuid - valid uuid
 *  @param position - the position of fk
 *  @public
 */
XiVOConfd.prototype.user_remove_fk = function(uuid, position) {
    client = this._connect();

    client.add('users', {
        stripTrailingSlash: true,
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    client.users.add('funckeys', {stripTrailingSlash: true});

    return client.users.funckeys.del(uuid, position);
}

/*
 *  User add function key
 *
 *  @param uuid - valid uuid
 *  @param fk - information of function key
 *  @public
 */
XiVOConfd.prototype.user_add_fk = function(uuid, position, fk) {
    client = this._connect();

    client.add('users', {
        stringifyData: true,
        stripTrailingSlash: true,
        ajax: { headers: { 'X-Auth-Token': this.token } }
    });

    client.users.add('funckeys', {stripTrailingSlash: true});

    return client.users.funckeys.update(uuid, position, fk);
}
